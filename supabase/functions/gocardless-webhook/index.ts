import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, logError, logInfo, createErrorResponse } from "../_shared/gocardless-utils.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

type GoCardlessEvent = {
  id?: string; // Event ID for idempotency
  resource_type?: string;
  action?: string;
  links?: Record<string, string | undefined>;
  details?: {
    metadata?: Record<string, string | undefined>;
  };
  created_at?: string;
};

/**
 * Verify webhook signature using HMAC-SHA256
 * Best practice: Always verify webhook signatures to prevent replay attacks
 */
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
    
    // Use constant-time comparison to prevent timing attacks
    if (computedSignature.length !== signature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      result |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    logError('WEBHOOK_SIGNATURE_VERIFICATION', error);
    return false;
  }
}

/**
 * Check if event has already been processed (idempotency)
 * Best practice: Prevent duplicate processing of webhook events
 */
async function isEventProcessed(
  adminClient: SupabaseClient,
  eventId: string
): Promise<boolean> {
  if (!eventId) return false;
  
  try {
    // Use a dedicated table for webhook event tracking
    // For now, we'll use a simple approach: check if we've seen this event ID
    // In production, you might want a dedicated webhook_events table
    const { data, error } = await adminClient
      .from('jobs')
      .select('id')
      .eq('gocardless_payment_id', `event_${eventId}`)
      .limit(1)
      .single();
    
    // If we find a record with this event ID, it's been processed
    return !error && !!data;
  } catch (error) {
    logError('EVENT_IDEMPOTENCY_CHECK', error, { eventId });
    // On error, assume not processed to avoid missing events
    return false;
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);
  
  logInfo('WEBHOOK_REQUEST', `Received ${req.method} request`, {
    requestId,
    userAgent: req.headers.get('user-agent'),
    origin,
  });
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    logInfo('WEBHOOK_HEALTH_CHECK', 'Health check requested', { requestId });
    return new Response(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'GoCardless webhook endpoint is reachable',
      version: '2.0.0',
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
    const signature = req.headers.get('webhook-signature') || req.headers.get('Webhook-Signature');
    console.log(`[WEBHOOK ${requestId}] Signature header: ${signature ? `present (${signature.length} chars)` : 'MISSING'}`);

    // ALWAYS require valid signature in all environments for security
    if (!signature) {
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
      console.error(`[WEBHOOK ${requestId}] Expected signature format: HMAC-SHA256 hex`);
      console.error(`[WEBHOOK ${requestId}] Received signature: ${signature.substring(0, 20)}...`);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(body);
    const events: GoCardlessEvent[] = (payload?.events ?? []) as GoCardlessEvent[];
    
    logInfo('WEBHOOK_PAYLOAD', `Parsed payload with ${events.length} events`, {
      requestId,
      eventCount: events.length,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      logError('WEBHOOK_CONFIG', new Error('Server configuration error'), { requestId });
      return createErrorResponse('Server configuration error', 500, { requestId });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Process events with idempotency checks
    const processedEvents: string[] = [];
    const failedEvents: Array<{ eventId: string; error: string }> = [];

    for (const event of events) {
      const { resource_type, action, links, id: eventId } = event;
      const eventKey = `${resource_type}.${action}.${eventId || 'unknown'}`;

      logInfo('WEBHOOK_EVENT', `Processing event: ${eventKey}`, {
        requestId,
        resource_type,
        action,
        eventId,
        links: JSON.stringify(links),
      });

      // Check idempotency (if event ID is available)
      if (eventId && await isEventProcessed(adminClient, eventId)) {
        logInfo('WEBHOOK_IDEMPOTENCY', `Event already processed: ${eventId}`, {
          requestId,
          eventId,
        });
        processedEvents.push(eventId);
        continue;
      }

      try {
        switch (resource_type) {
          case 'mandates':
            await handleMandateEvent(adminClient, event, requestId);
            break;
          case 'payments':
            await handlePaymentEvent(adminClient, event, requestId);
            break;
          case 'billing_requests':
            await handleBillingRequestEvent(adminClient, event, requestId);
            break;
          default:
            logInfo('WEBHOOK_UNHANDLED', `Unhandled resource type: ${resource_type}`, {
              requestId,
              resource_type,
              action,
            });
        }

        if (eventId) {
          processedEvents.push(eventId);
        }
      } catch (error) {
        logError('WEBHOOK_EVENT_PROCESSING', error, {
          requestId,
          eventId,
          resource_type,
          action,
        });
        
        if (eventId) {
          failedEvents.push({
            eventId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return new Response(JSON.stringify({ 
      received: true,
      processed: processedEvents.length,
      failed: failedEvents.length,
      events: processedEvents,
      errors: failedEvents.length > 0 ? failedEvents : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logError('WEBHOOK_CRITICAL', error, {
      requestId,
      method: req.method,
      url: req.url,
    });
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: message,
      requestId,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleMandateEvent(
  adminClient: SupabaseClient,
  event: GoCardlessEvent,
  requestId: string
) {
  const { action, links } = event;
  const mandateId = links?.mandate;
  const billingRequestId = links?.billing_request;

  if (!mandateId) {
    logInfo('WEBHOOK_MANDATE', 'No mandate ID in event', { requestId, action });
    return;
  }

  logInfo('WEBHOOK_MANDATE', `Handling mandate event: ${action}`, {
    requestId,
    mandateId,
    billingRequestId,
  });

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
          .select('id, name');
        
        if (data?.length) {
          logInfo('WEBHOOK_MANDATE', 'Updated customer via billing request match', {
            requestId,
            customerId: data[0].id,
            customerName: data[0].name,
            mandateId,
          });
        } else {
          logInfo('WEBHOOK_MANDATE', 'No customer found with billing request', {
            requestId,
            billingRequestId,
            error: error?.message,
          });
        }
      } else {
        // Try to match by mandate ID directly (for mandates created outside our flow)
        const { data, error } = await adminClient
          .from('customers')
          .update({
            gocardless_mandate_status: 'active',
          })
          .eq('gocardless_id', mandateId)
          .select('id, name');
        
        if (data?.length) {
          logInfo('WEBHOOK_MANDATE', 'Updated customer via mandate ID match', {
            requestId,
            customerId: data[0].id,
            customerName: data[0].name,
            mandateId,
          });
        }
      }
      break;

    case 'cancelled':
    case 'expired':
    case 'failed':
      const { data: cancelledData, error: cancelledError } = await adminClient
        .from('customers')
        .update({
          gocardless_id: null,
          gocardless_mandate_status: action,
        })
        .eq('gocardless_id', mandateId)
        .select('id, name, user_id');
      
      if (cancelledData?.length) {
        const customer = cancelledData[0];
        logInfo('WEBHOOK_MANDATE', `Mandate ${action}`, {
          requestId,
          mandateId,
          customerId: customer.id,
          customerName: customer.name,
        });
        
        // CRITICAL: If mandate is cancelled/expired/failed, check for any processing payments
        // and mark them as unpaid so cleaner can collect manually
        const { data: processingJobs, error: jobsError } = await adminClient
          .from('jobs')
          .update({
            payment_status: 'unpaid',
            // Keep payment_method and payment_id for reference, but mark as unpaid
          })
          .eq('customer_id', customer.id)
          .eq('payment_status', 'processing')
          .eq('payment_method', 'gocardless')
          .select('id, amount_collected');
        
        if (jobsError) {
          logError('WEBHOOK_MANDATE', jobsError, {
            requestId,
            mandateId,
            customerId: customer.id,
            action: 'update_processing_jobs',
          });
        } else if (processingJobs && processingJobs.length > 0) {
          logInfo('WEBHOOK_MANDATE', `Marked ${processingJobs.length} processing payments as unpaid due to mandate ${action}`, {
            requestId,
            mandateId,
            customerId: customer.id,
            jobCount: processingJobs.length,
            totalAmount: processingJobs.reduce((sum, job) => sum + (job.amount_collected || 0), 0),
          });
        }
      } else if (cancelledError) {
        logError('WEBHOOK_MANDATE', cancelledError, {
          requestId,
          mandateId,
          action,
        });
      }
      break;
  }
}

async function handlePaymentEvent(
  adminClient: SupabaseClient,
  event: GoCardlessEvent,
  requestId: string
) {
  const { action, links } = event;
  const paymentId = links?.payment;

  if (!paymentId) {
    logInfo('WEBHOOK_PAYMENT', 'No payment ID in event', { requestId, action });
    return;
  }

  logInfo('WEBHOOK_PAYMENT', `Handling payment event: ${action}`, {
    requestId,
    paymentId,
    action,
  });

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
  if (!status) {
    logInfo('WEBHOOK_PAYMENT', 'Unknown payment action', {
      requestId,
      paymentId,
      action,
    });
    return;
  }

  const updateData: Record<string, unknown> = { 
    gocardless_payment_status: status 
  };

  // Set payment_date when payment is paid out
  if (action === 'paid_out') {
    updateData.payment_date = new Date().toISOString();
    updateData.payment_status = 'paid';
    logInfo('WEBHOOK_PAYMENT', 'Payment paid out', {
      requestId,
      paymentId,
    });
  }

  // Log payment confirmation
  if (action === 'confirmed' || action === 'paid_out') {
    logInfo('WEBHOOK_PAYMENT', 'Payment confirmed', {
      requestId,
      paymentId,
      action,
    });
  }

  // If payment failed, update payment_status to unpaid
  if (action === 'failed' || action === 'cancelled' || action === 'charged_back') {
    updateData.payment_status = 'unpaid';
    // Clear payment_date if it was set
    updateData.payment_date = null;
    logInfo('WEBHOOK_PAYMENT', `Payment ${action} - marking as unpaid`, {
      requestId,
      paymentId,
      action,
    });
  }
  
  // If payment is confirmed but not yet paid_out, ensure status is still processing
  if (action === 'confirmed' && updateData.payment_status !== 'paid') {
    updateData.payment_status = 'processing';
    logInfo('WEBHOOK_PAYMENT', 'Payment confirmed but not yet paid out - keeping as processing', {
      requestId,
      paymentId,
    });
  }

  const { data: updatedJob, error: updateError } = await adminClient
    .from('jobs')
    .update(updateData)
    .eq('gocardless_payment_id', paymentId)
    .select('id, customer_id, amount_collected');

  if (updateError) {
    logError('WEBHOOK_PAYMENT', updateError, {
      requestId,
      paymentId,
      action,
    });
  } else if (updatedJob?.length) {
    logInfo('WEBHOOK_PAYMENT', 'Payment status updated', {
      requestId,
      paymentId,
      jobId: updatedJob[0].id,
      customerId: updatedJob[0].customer_id,
      amount: updatedJob[0].amount_collected,
      action,
    });
  } else {
    logInfo('WEBHOOK_PAYMENT', 'No job found for payment', {
      requestId,
      paymentId,
      action,
    });
  }
}

async function handleBillingRequestEvent(
  adminClient: SupabaseClient,
  event: GoCardlessEvent,
  requestId: string
) {
  const { action, details, links } = event;
  const billingRequestId = links?.billing_request;
  
  logInfo('WEBHOOK_BILLING_REQUEST', `Handling billing request event: ${action}`, {
    requestId,
    action,
    billingRequestId,
  });

  if (action === 'fulfilled') {
    // The mandate has been created successfully
    const metadata = details?.metadata || {};
    const customerId = metadata.customer_id;
    
    if (customerId) {
      logInfo('WEBHOOK_BILLING_REQUEST', 'Billing request fulfilled', {
        requestId,
        customerId,
        billingRequestId,
      });
    }
  }
}
