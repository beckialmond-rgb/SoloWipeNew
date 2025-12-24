import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import {
  getCorsHeaders,
  decryptToken,
  isValidUUID,
  isValidAmount,
  sanitizeString,
  makeGoCardlessRequest,
  validateGoCardlessToken,
  logError,
  logInfo,
  createErrorResponse,
} from "../_shared/gocardless-utils.ts";

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
      logError('COLLECT_PAYMENT', new Error('No authorization header'), { requestId });
      return createErrorResponse('No authorization header', 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logError('COLLECT_PAYMENT', userError || new Error('Unauthorized'), { requestId });
      return createErrorResponse('Unauthorized', 401);
    }

    logInfo('COLLECT_PAYMENT', `Starting payment collection for user ${user.id}`, { requestId, userId: user.id });

    const body = await req.json();
    const { jobId, customerId, amount, description } = body;

    // Validate inputs
    if (!jobId || !isValidUUID(jobId)) {
      logError('COLLECT_PAYMENT', new Error('Invalid job ID format'), { requestId, jobId });
      return createErrorResponse('Invalid job ID format', 400);
    }

    if (!customerId || !isValidUUID(customerId)) {
      logError('COLLECT_PAYMENT', new Error('Invalid customer ID format'), { requestId, customerId });
      return createErrorResponse('Invalid customer ID format', 400);
    }

    if (!isValidAmount(amount)) {
      logError('COLLECT_PAYMENT', new Error('Invalid amount'), { requestId, amount });
      return createErrorResponse('Invalid amount. Must be between £0.01 and £100,000', 400);
    }

    const sanitizedDescription = sanitizeString(description, 200);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      logError('COLLECT_PAYMENT', new Error('Server configuration error'), { requestId });
      return createErrorResponse('Server configuration error', 500);
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get user's GoCardless credentials and customer's mandate
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('gocardless_access_token_encrypted, business_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.gocardless_access_token_encrypted) {
      logError('COLLECT_PAYMENT', profileError || new Error('GoCardless not connected'), {
        requestId,
        userId: user.id,
        hasToken: !!profile?.gocardless_access_token_encrypted,
      });
      return createErrorResponse('GoCardless not connected', 400, { requiresReconnect: false });
    }

    // SECURITY: Validate customer belongs to authenticated user
    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .select('gocardless_id, name, gocardless_mandate_status')
      .eq('id', customerId)
      .eq('profile_id', user.id) // CRITICAL: Ensure customer belongs to user
      .single();

    if (customerError || !customer?.gocardless_id) {
      logError('COLLECT_PAYMENT', customerError || new Error('No active mandate'), {
        requestId,
        customerId,
        hasMandate: !!customer?.gocardless_id,
      });
      return createErrorResponse('Customer does not have an active Direct Debit mandate', 400);
    }

    // CRITICAL: Validate mandate status before attempting payment
    // This prevents payment failures due to cancelled/expired mandates
    const mandateStatus = customer.gocardless_mandate_status;
    if (mandateStatus !== 'active') {
      logError('COLLECT_PAYMENT', new Error(`Mandate not active: ${mandateStatus}`), {
        requestId,
        customerId,
        customerName: customer.name,
        mandateId: customer.gocardless_id,
        mandateStatus,
      });
      
      let errorMessage = 'Direct Debit mandate is not active. ';
      if (mandateStatus === 'pending') {
        errorMessage += 'The mandate is still pending customer authorization. Please wait for the customer to complete setup.';
      } else if (mandateStatus === 'cancelled') {
        errorMessage += 'The customer has cancelled their Direct Debit. Please set up a new mandate.';
      } else if (mandateStatus === 'expired') {
        errorMessage += 'The mandate has expired. Please set up a new mandate.';
      } else if (mandateStatus === 'failed') {
        errorMessage += 'The mandate setup failed. Please set up a new mandate.';
      } else {
        errorMessage += `Current status: ${mandateStatus || 'unknown'}. Please check the customer's mandate status.`;
      }
      
      return createErrorResponse(errorMessage, 400, {
        mandateStatus,
        requiresNewMandate: ['cancelled', 'expired', 'failed'].includes(mandateStatus || ''),
      });
    }

    const accessToken = await decryptToken(profile.gocardless_access_token_encrypted);
    
    logInfo('COLLECT_PAYMENT', 'Payment collection started', {
      requestId,
      userId: user.id,
      customerId,
      customerName: customer.name,
      mandateId: customer.gocardless_id,
      amount,
      jobId,
    });

    // Validate token with retry logic
    logInfo('COLLECT_PAYMENT', 'Validating access token', { requestId });
    const isTokenValid = await validateGoCardlessToken(accessToken);
    
    if (!isTokenValid) {
      logError('COLLECT_PAYMENT', new Error('Token validation failed'), { requestId });
      return createErrorResponse('GoCardless connection expired. Please reconnect in Settings.', 401, {
        requiresReconnect: true,
      });
    }

    logInfo('COLLECT_PAYMENT', 'Token validated successfully', { requestId });

    // Create payment with sanitized description
    const paymentDescription = sanitizedDescription || `Window cleaning - ${customer.name.slice(0, 50)}`;
    
    // Calculate amounts
    const amountInPence = Math.round(amount * 100);
    
    // Calculate SoloWipe Service Fee: (amount in pence × 0.75%) + 30p, rounded to nearest integer
    // This is the platform commission on top of GoCardless fees
    const appFee = Math.round((amountInPence * 0.0075) + 30);
    
    logInfo('COLLECT_PAYMENT', 'Creating payment', {
      requestId,
      amountInPence,
      appFee,
      description: paymentDescription,
    });
    
    // CRITICAL: Verify mandate is still active in GoCardless before creating payment
    // This prevents race conditions where mandate is cancelled between job completion and payment
    logInfo('COLLECT_PAYMENT', 'Verifying mandate status in GoCardless', {
      requestId,
      mandateId: customer.gocardless_id,
    });
    
    try {
      const mandateResponse = await makeGoCardlessRequest(
        `/mandates/${customer.gocardless_id}`,
        {
          method: 'GET',
        },
        accessToken,
        {
          maxRetries: 2,
          initialDelay: 500,
          timeout: 10000, // 10 second timeout for mandate check
        }
      );
      
      const mandateData = await mandateResponse.json();
      const mandateStatus = mandateData?.mandates?.status;
      
      if (mandateStatus !== 'active') {
        logError('COLLECT_PAYMENT', new Error(`Mandate status in GoCardless is ${mandateStatus}, not active`), {
          requestId,
          mandateId: customer.gocardless_id,
          mandateStatus,
          customerId,
        });
        
        // Update customer record to reflect actual status
        // SECURITY: Validate ownership before update
        await adminClient
          .from('customers')
          .update({
            gocardless_mandate_status: mandateStatus,
            ...(mandateStatus !== 'active' ? { gocardless_id: null } : {}),
          })
          .eq('id', customerId)
          .eq('profile_id', user.id); // CRITICAL: Ensure customer belongs to user
        
        let errorMessage = 'Direct Debit mandate is not active in GoCardless. ';
        if (mandateStatus === 'pending') {
          errorMessage += 'The mandate is still pending. Please wait for the customer to complete setup.';
        } else if (mandateStatus === 'cancelled') {
          errorMessage += 'The customer has cancelled their Direct Debit. Please set up a new mandate.';
        } else if (mandateStatus === 'expired') {
          errorMessage += 'The mandate has expired. Please set up a new mandate.';
        } else if (mandateStatus === 'failed') {
          errorMessage += 'The mandate setup failed. Please set up a new mandate.';
        } else {
          errorMessage += `Current status: ${mandateStatus || 'unknown'}.`;
        }
        
        return createErrorResponse(errorMessage, 400, {
          mandateStatus,
          requiresNewMandate: ['cancelled', 'expired', 'failed'].includes(mandateStatus || ''),
        });
      }
      
      logInfo('COLLECT_PAYMENT', 'Mandate verified as active in GoCardless', {
        requestId,
        mandateId: customer.gocardless_id,
      });
    } catch (mandateError) {
      // If mandate check fails, log but continue - payment creation will fail if mandate is invalid
      logError('COLLECT_PAYMENT', mandateError, {
        requestId,
        mandateId: customer.gocardless_id,
        action: 'mandate_verification',
        note: 'Continuing with payment creation - GoCardless will reject if mandate invalid',
      });
    }

    // Create payment with retry logic and timeout protection
    const paymentResponse = await makeGoCardlessRequest(
      '/payments',
      {
        method: 'POST',
        body: JSON.stringify({
          payments: {
            amount: amountInPence,
            currency: 'GBP',
            description: paymentDescription,
            app_fee: appFee,
            links: {
              mandate: customer.gocardless_id,
            },
            metadata: {
              job_id: jobId,
              customer_id: customerId,
            },
          },
        }),
      },
      accessToken,
      {
        maxRetries: 3,
        initialDelay: 1000,
        retryableStatuses: [429, 500, 502, 503, 504],
        timeout: 30000, // 30 second timeout
      }
    );

    const paymentData = await paymentResponse.json();
    
    // Validate response data
    if (!paymentData?.payments) {
      logError('COLLECT_PAYMENT', new Error('Invalid payment response structure'), {
        requestId,
        responseData: JSON.stringify(paymentData),
      });
      return createErrorResponse('Invalid response from GoCardless', 500, { requestId });
    }

    const paymentId = paymentData.payments.id;
    const paymentStatus = paymentData.payments.status;
    const chargeDate = paymentData.payments.charge_date;

    // Validate required fields
    if (!paymentId) {
      logError('COLLECT_PAYMENT', new Error('Payment ID missing from response'), {
        requestId,
        responseData: JSON.stringify(paymentData),
      });
      return createErrorResponse('Payment creation failed: missing payment ID', 500, { requestId });
    }

    if (!paymentStatus) {
      logError('COLLECT_PAYMENT', new Error('Payment status missing from response'), {
        requestId,
        paymentId,
      });
      // Continue anyway as status can be checked later via webhook
    }

    logInfo('COLLECT_PAYMENT', 'Payment created successfully', {
      requestId,
      paymentId,
      paymentStatus,
      chargeDate,
      amount: paymentData.payments.amount,
      appFee,
    });

    // Calculate fee breakdown for financial reporting
    const amountPounds = amount;
    const platformFeePounds = appFee / 100; // Convert pence to pounds
    // GoCardless fee: 1% + 20p, capped at £4
    const gocardlessFeePounds = Math.min((amountPounds * 0.01) + 0.20, 4.00);
    const netAmount = amountPounds - platformFeePounds - gocardlessFeePounds;

    logInfo('COLLECT_PAYMENT', 'Fee breakdown calculated', {
      requestId,
      grossAmount: amountPounds.toFixed(2),
      platformFee: platformFeePounds.toFixed(2),
      gocardlessFee: gocardlessFeePounds.toFixed(2),
      netAmount: netAmount.toFixed(2),
    });

    // Update job with payment info and fee breakdown
    // CRITICAL: Use transaction-like approach - if job update fails, we still have payment ID
    // This allows recovery via webhook or manual sync
    logInfo('COLLECT_PAYMENT', 'Updating job record', { requestId, jobId });
    
    // SECURITY: Validate job belongs to authenticated user via customer relationship
    // First, check if job already has a payment (prevent duplicate payments)
    const { data: existingJob, error: checkError } = await adminClient
      .from('jobs')
      .select('gocardless_payment_id, payment_status, customer:customers!inner(profile_id)')
      .eq('id', jobId)
      .eq('customers.profile_id', user.id) // CRITICAL: Ensure job belongs to user's customer
      .single();
    
    if (checkError) {
      logError('COLLECT_PAYMENT', checkError, {
        requestId,
        jobId,
        paymentId,
        action: 'check_existing',
      });
      // Continue anyway - webhook will sync status
    } else if (existingJob?.gocardless_payment_id && existingJob.gocardless_payment_id !== paymentId) {
      logError('COLLECT_PAYMENT', new Error('Job already has a different payment ID'), {
        requestId,
        jobId,
        existingPaymentId: existingJob.gocardless_payment_id,
        newPaymentId: paymentId,
      });
      // Don't overwrite existing payment - return success but log warning
      logInfo('COLLECT_PAYMENT', 'Payment created but job already has payment - webhook will sync', {
        requestId,
        jobId,
        existingPaymentId: existingJob.gocardless_payment_id,
        newPaymentId: paymentId,
      });
    } else {
      // SECURITY: Ownership already validated in existingJob query above
      // Safe to update (existingJob query ensures job belongs to user's customer)
      const { error: updateError } = await adminClient
        .from('jobs')
        .update({
          gocardless_payment_id: paymentId,
          gocardless_payment_status: paymentStatus,
          payment_method: 'gocardless',
          payment_status: 'processing', // Mark as processing until paid_out (via webhook)
          payment_date: null, // Only set when paid_out (via webhook)
          amount_collected: amountPounds, // Store gross amount
          platform_fee: Math.round(platformFeePounds * 100) / 100, // Round to 2 decimals
          gocardless_fee: Math.round(gocardlessFeePounds * 100) / 100, // Round to 2 decimals
          net_amount: Math.round(netAmount * 100) / 100, // Round to 2 decimals
        })
        .eq('id', jobId); // Ownership already validated above

      if (updateError) {
        logError('COLLECT_PAYMENT', updateError, {
          requestId,
          jobId,
          paymentId,
          action: 'update_job',
          // Payment was created successfully, but job update failed
          // Webhook will sync status when payment updates
          recovery: 'webhook_will_sync',
        });
        // Don't fail - payment exists in GoCardless, webhook will update job
      } else {
        logInfo('COLLECT_PAYMENT', 'Job updated successfully', {
          requestId,
          jobId,
          paymentId,
        });
      }
    }

    logInfo('COLLECT_PAYMENT', 'Payment collection complete', {
      requestId,
      paymentId,
      paymentStatus,
    });

    return new Response(JSON.stringify({ 
      success: true,
      paymentId,
      paymentStatus,
      chargeDate,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logError('COLLECT_PAYMENT_CRITICAL', error, {
      requestId,
      method: req.method,
      url: req.url,
    });
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(message, 500, { requestId });
  }
});
