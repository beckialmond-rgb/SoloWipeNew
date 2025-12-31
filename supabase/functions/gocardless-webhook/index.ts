import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

type GoCardlessEvent = {
  resource_type?: string;
  action?: string;
  links?: Record<string, string | undefined>;
  details?: {
    metadata?: Record<string, string | undefined>;
  };
};

/**
 * Verify GoCardless webhook signature
 * GoCardless sends HMAC-SHA256 signatures as hex strings in the Webhook-Signature header
 * Reference: https://developer.gocardless.com/getting-started/api/handling-webhooks/
 */
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    // Remove any potential prefix (e.g., "sha256=") if present
    const cleanSignature = signature.replace(/^sha256=/, '').trim().toLowerCase();
    
    // Ensure signature is not empty after cleaning
    if (!cleanSignature) {
      console.error('Signature is empty after cleaning');
      return false;
    }
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Compute HMAC-SHA256 signature
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toLowerCase();
    
    // Constant-time comparison to prevent timing attacks
    if (computedSignature.length !== cleanSignature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      result |= computedSignature.charCodeAt(i) ^ cleanSignature.charCodeAt(i);
    }
    
    return result === 0;
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
    // Support both GOCARDLESS_WEBHOOK_SECRET and webhook_endpoint_secret (GoCardless convention)
    const webhookSecret = Deno.env.get('GOCARDLESS_WEBHOOK_SECRET') || Deno.env.get('webhook_endpoint_secret');
    if (!webhookSecret) {
      console.error(`[WEBHOOK ${requestId}] ❌ Webhook secret not configured`);
      console.error(`[WEBHOOK ${requestId}] Expected: GOCARDLESS_WEBHOOK_SECRET or webhook_endpoint_secret`);
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log(`[WEBHOOK ${requestId}] ✓ Webhook secret configured (${webhookSecret.length} chars)`);

    const body = await req.text();
    console.log(`[WEBHOOK ${requestId}] Request body length: ${body.length} chars`);
    
    // GoCardless sends signature in Webhook-Signature header (case-insensitive)
    // Check multiple header name variations for compatibility
    const signature = req.headers.get('webhook-signature') || 
                      req.headers.get('Webhook-Signature') ||
                      req.headers.get('WEBHOOK-SIGNATURE');
    console.log(`[WEBHOOK ${requestId}] Signature header: ${signature ? `present (${signature.length} chars)` : 'MISSING'}`);

    // ALWAYS require valid signature in all environments for security
    if (!signature || signature.trim().length === 0) {
      console.error(`[WEBHOOK ${requestId}] ❌ Missing webhook signature - REJECTING`);
      return new Response(JSON.stringify({ error: 'Missing webhook signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify webhook signature
    console.log(`[WEBHOOK ${requestId}] Verifying signature...`);
    const isValid = await verifyWebhookSignature(body, signature, webhookSecret);
    console.log(`[WEBHOOK ${requestId}] Signature verification: ${isValid ? '✓ VALID' : '❌ INVALID'}`);
    
    if (!isValid) {
      console.error(`[WEBHOOK ${requestId}] ❌ Invalid webhook signature`);
      console.error(`[WEBHOOK ${requestId}] Expected signature format: HMAC-SHA256 hex (64 chars)`);
      console.error(`[WEBHOOK ${requestId}] Received signature preview: ${signature.substring(0, 20)}... (${signature.length} chars)`);
      console.error(`[WEBHOOK ${requestId}] Body length: ${body.length} chars`);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(body);
    const events: GoCardlessEvent[] = (payload?.events ?? []) as GoCardlessEvent[];
    
    console.log(`[WEBHOOK ${requestId}] Parsed payload with ${events.length} events`);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    // CRITICAL FIX #2: Helper function to generate event ID for GoCardless events
    // GoCardless doesn't provide event IDs, so we construct them from event data
    function getGoCardlessEventId(event: GoCardlessEvent, index: number): string {
      const resourceType = event.resource_type || 'unknown';
      const action = event.action || 'unknown';
      const resourceId = event.links?.payment || 
                         event.links?.mandate || 
                         event.links?.billing_request || 
                         `idx_${index}`;
      return `gc_${resourceType}_${action}_${resourceId}`;
    }

    // Process events with idempotency check
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventId = getGoCardlessEventId(event, i);
      
      // Check if event already processed
      const { data: existingEvent } = await adminClient
        .from('webhook_events')
        .select('event_id')
        .eq('event_id', eventId)
        .maybeSingle();
      
      if (existingEvent) {
        console.log(`[WEBHOOK ${requestId}] ⚠️ Duplicate event detected, skipping: ${eventId}`);
        continue; // Skip this event
      }
      
      // Insert event record BEFORE processing
      const { error: insertError } = await adminClient
        .from('webhook_events')
        .insert({
          event_id: eventId,
          resource_type: event.resource_type || 'unknown',
          action: event.action || null,
        });
      
      if (insertError) {
        console.error(`[WEBHOOK ${requestId}] ❌ Failed to insert event record:`, insertError);
        // Continue processing - idempotency check will catch duplicates on retry
      }

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
    console.error('❌ CRITICAL GOCARDLESS ERROR:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleMandateEvent(adminClient: SupabaseClient, event: GoCardlessEvent) {
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

async function handlePaymentEvent(adminClient: SupabaseClient, event: GoCardlessEvent) {
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

  const status = action ? statusMap[action] : undefined;
  if (status) {
    // Prepare update data
    const updateData: { gocardless_payment_status: string; payment_status?: string; payment_date?: string } = {
      gocardless_payment_status: status,
    };

    // When payment is paid_out, mark as paid and set payment_date
    if (action === 'paid_out') {
      updateData.payment_status = 'paid';
      updateData.payment_date = new Date().toISOString();
      console.log(`✅ Payment paid out: ${paymentId} - marking as paid`);
    }

    // If payment failed, update payment_status to unpaid
    if (action === 'failed' || action === 'cancelled' || action === 'charged_back') {
      updateData.payment_status = 'unpaid';
      console.log(`⚠️ Payment ${action}: ${paymentId} - marking as unpaid`);
    }

    await adminClient
      .from('jobs')
      .update(updateData)
      .eq('gocardless_payment_id', paymentId);

    // Log payment confirmation
    if (action === 'confirmed' || action === 'paid_out') {
      console.log(`✅ Payment confirmed: ${paymentId}`);
    }
  }
}

async function handleBillingRequestEvent(adminClient: SupabaseClient, event: GoCardlessEvent) {
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
