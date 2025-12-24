import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import {
  getCorsHeaders,
  decryptToken,
  isValidUUID,
  makeGoCardlessRequest,
  validateGoCardlessToken,
  logError,
  logInfo,
  createErrorResponse,
} from "../_shared/gocardless-utils.ts";

/**
 * Sync payment status from GoCardless API
 * This function checks the actual payment status in GoCardless and updates the job record
 * Useful when webhooks are delayed or missed
 */
serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logError('SYNC_PAYMENT', new Error('No authorization header'), { requestId });
      return createErrorResponse('No authorization header', 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logError('SYNC_PAYMENT', userError || new Error('Unauthorized'), { requestId });
      return createErrorResponse('Unauthorized', 401);
    }

    logInfo('SYNC_PAYMENT', `Starting payment sync for user ${user.id}`, { requestId, userId: user.id });

    const body = await req.json();
    const { jobId, paymentId } = body;

    // Validate inputs
    if (!jobId || !isValidUUID(jobId)) {
      logError('SYNC_PAYMENT', new Error('Invalid job ID format'), { requestId, jobId });
      return createErrorResponse('Invalid job ID format', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      logError('SYNC_PAYMENT', new Error('Server configuration error'), { requestId });
      return createErrorResponse('Server configuration error', 500);
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // SECURITY: Validate job belongs to authenticated user via customer relationship
    // Get job and payment info
    const { data: job, error: jobError } = await adminClient
      .from('jobs')
      .select('gocardless_payment_id, customer_id, payment_status, gocardless_payment_status, customer:customers!inner(profile_id)')
      .eq('id', jobId)
      .eq('customers.profile_id', user.id) // CRITICAL: Ensure job belongs to user's customer
      .single();

    if (jobError || !job) {
      logError('SYNC_PAYMENT', jobError || new Error('Job not found'), {
        requestId,
        jobId,
        userId: user.id,
      });
      return createErrorResponse('Job not found', 404);
    }

    // Use provided paymentId or job's payment ID
    const targetPaymentId = paymentId || job.gocardless_payment_id;
    
    if (!targetPaymentId) {
      logError('SYNC_PAYMENT', new Error('No payment ID found'), {
        requestId,
        jobId,
      });
      return createErrorResponse('Job does not have a GoCardless payment ID', 400);
    }

    // Get user's GoCardless credentials
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('gocardless_access_token_encrypted')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.gocardless_access_token_encrypted) {
      logError('SYNC_PAYMENT', profileError || new Error('GoCardless not connected'), {
        requestId,
        userId: user.id,
      });
      return createErrorResponse('GoCardless not connected', 400, { requiresReconnect: false });
    }

    const accessToken = await decryptToken(profile.gocardless_access_token_encrypted);
    
    // Validate token
    logInfo('SYNC_PAYMENT', 'Validating access token', { requestId });
    const isTokenValid = await validateGoCardlessToken(accessToken);
    
    if (!isTokenValid) {
      logError('SYNC_PAYMENT', new Error('Token validation failed'), { requestId });
      return createErrorResponse('GoCardless connection expired. Please reconnect in Settings.', 401, {
        requiresReconnect: true,
      });
    }

    // Fetch payment status from GoCardless
    logInfo('SYNC_PAYMENT', 'Fetching payment status from GoCardless', {
      requestId,
      paymentId: targetPaymentId,
    });

    const paymentResponse = await makeGoCardlessRequest(
      `/payments/${targetPaymentId}`,
      {
        method: 'GET',
      },
      accessToken,
      {
        maxRetries: 2,
        initialDelay: 500,
        timeout: 10000,
      }
    );

    const paymentData = await paymentResponse.json();
    
    if (!paymentData?.payments) {
      logError('SYNC_PAYMENT', new Error('Invalid payment response structure'), {
        requestId,
        paymentId: targetPaymentId,
        responseData: JSON.stringify(paymentData),
      });
      return createErrorResponse('Invalid response from GoCardless', 500, { requestId });
    }

    const paymentStatus = paymentData.payments.status;
    const chargeDate = paymentData.payments.charge_date;

    logInfo('SYNC_PAYMENT', 'Payment status retrieved', {
      requestId,
      paymentId: targetPaymentId,
      paymentStatus,
      chargeDate,
    });

    // Map GoCardless status to our status
    const statusMap: Record<string, string> = {
      pending_submission: 'pending_submission',
      submitted_to_bank: 'submitted',
      confirmed: 'confirmed',
      paid_out: 'paid_out',
      cancelled: 'cancelled',
      customer_approval_denied: 'failed',
      failed: 'failed',
      charged_back: 'charged_back',
    };

    const mappedStatus = statusMap[paymentStatus] || paymentStatus;

    const updateData: Record<string, unknown> = { 
      gocardless_payment_status: mappedStatus 
    };

    // Set payment_date when payment is paid out
    if (mappedStatus === 'paid_out') {
      updateData.payment_date = new Date().toISOString();
      updateData.payment_status = 'paid';
      logInfo('SYNC_PAYMENT', 'Payment paid out', {
        requestId,
        paymentId: targetPaymentId,
      });
    }

    // If payment failed, update payment_status to unpaid
    if (mappedStatus === 'failed' || mappedStatus === 'cancelled' || mappedStatus === 'charged_back') {
      updateData.payment_status = 'unpaid';
      logInfo('SYNC_PAYMENT', `Payment ${mappedStatus} - marking as unpaid`, {
        requestId,
        paymentId: targetPaymentId,
        status: mappedStatus,
      });
    }

    // SECURITY: Ownership already validated in job query above
    // Update job with latest payment status
    const { data: updatedJob, error: updateError } = await adminClient
      .from('jobs')
      .update(updateData)
      .eq('id', jobId) // Ownership already validated above
      .select('id, payment_status, gocardless_payment_status');

    if (updateError) {
      logError('SYNC_PAYMENT', updateError, {
        requestId,
        jobId,
        paymentId: targetPaymentId,
      });
      return createErrorResponse('Failed to update job status', 500, { requestId });
    }

    logInfo('SYNC_PAYMENT', 'Payment status synced successfully', {
      requestId,
      jobId,
      paymentId: targetPaymentId,
      oldStatus: job.gocardless_payment_status,
      newStatus: mappedStatus,
      paymentStatus: updateData.payment_status,
    });

    return new Response(JSON.stringify({ 
      success: true,
      paymentId: targetPaymentId,
      paymentStatus: mappedStatus,
      jobPaymentStatus: updateData.payment_status,
      updated: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logError('SYNC_PAYMENT_CRITICAL', error, {
      requestId,
      method: req.method,
      url: req.url,
    });
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(message, 500, { requestId });
  }
});

