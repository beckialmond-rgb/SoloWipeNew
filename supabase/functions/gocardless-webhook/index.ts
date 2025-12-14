import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
};

async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return computedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[WEBHOOK ${requestId}] Received ${req.method} request from ${req.headers.get('user-agent')}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    console.log(`[WEBHOOK ${requestId}] Health check requested`);
    return new Response(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'GoCardless webhook endpoint is reachable'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const webhookSecret = Deno.env.get('GOCARDLESS_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    const signature = req.headers.get('webhook-signature');

    // Verify webhook signature
    if (signature) {
      const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = JSON.parse(body);
    const events = payload.events || [];
    
    console.log(`[WEBHOOK ${requestId}] Parsed payload with ${events.length} events`);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    for (const event of events) {
      const { resource_type, action, links } = event;

      console.log(`[WEBHOOK ${requestId}] Processing event: ${resource_type}.${action}`, JSON.stringify(links));

      switch (resource_type) {
        case 'mandates':
          await handleMandateEvent(adminClient, event);
          break;
        case 'payments':
          await handlePaymentEvent(adminClient, event);
          break;
        case 'billing_requests':
          await handleBillingRequestEvent(adminClient, event);
          break;
        default:
          console.log('Unhandled resource type:', resource_type);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error processing webhook:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleMandateEvent(adminClient: any, event: any) {
  const { action, links } = event;
  const mandateId = links?.mandate;
  const billingRequestId = links?.billing_request;

  if (!mandateId) {
    console.log('No mandate ID in event');
    return;
  }

  console.log('Handling mandate event:', action, mandateId, 'billingRequest:', billingRequestId);

  switch (action) {
    case 'created':
    case 'active':
      // Match customer by billing_request_id stored during mandate creation
      if (billingRequestId) {
        const { data, error } = await adminClient
          .from('customers')
          .update({
            gocardless_id: mandateId,
            gocardless_mandate_status: 'active',
          })
          .eq('gocardless_id', `br_${billingRequestId}`)
          .select('id');
        
        if (data?.length) {
          console.log('Updated customer via billing request match:', data[0].id);
        } else {
          console.log('No customer found with billing request:', billingRequestId, error);
        }
      }
      break;

    case 'cancelled':
    case 'expired':
    case 'failed':
      await adminClient
        .from('customers')
        .update({
          gocardless_id: null,
          gocardless_mandate_status: action,
        })
        .eq('gocardless_id', mandateId);
      break;
  }
}

async function handlePaymentEvent(adminClient: any, event: any) {
  const { action, links } = event;
  const paymentId = links?.payment;

  if (!paymentId) {
    console.log('No payment ID in event');
    return;
  }

  console.log('Handling payment event:', action, paymentId);

  const statusMap: Record<string, string> = {
    created: 'pending_submission',
    submitted: 'submitted',
    confirmed: 'confirmed',
    paid_out: 'paid_out',
    failed: 'failed',
    cancelled: 'cancelled',
    charged_back: 'charged_back',
  };

  const status = statusMap[action];
  if (status) {
    await adminClient
      .from('jobs')
      .update({ gocardless_payment_status: status })
      .eq('gocardless_payment_id', paymentId);

    // If payment failed, update payment_status to unpaid
    if (action === 'failed' || action === 'cancelled' || action === 'charged_back') {
      await adminClient
        .from('jobs')
        .update({ payment_status: 'unpaid' })
        .eq('gocardless_payment_id', paymentId);
    }
  }
}

async function handleBillingRequestEvent(adminClient: any, event: any) {
  const { action, details } = event;
  
  console.log('Handling billing request event:', action);

  if (action === 'fulfilled') {
    // The mandate has been created successfully
    const metadata = details?.metadata || {};
    const customerId = metadata.customer_id;
    
    if (customerId) {
      console.log('Billing request fulfilled for customer:', customerId);
    }
  }
}
