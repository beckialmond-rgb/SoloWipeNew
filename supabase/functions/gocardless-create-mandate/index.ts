import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import {
  getCorsHeaders,
  decryptToken,
  isValidUUID,
  isValidEmail,
  sanitizeString,
  isValidUrl,
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

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
      }
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logError('CREATE_MANDATE', new Error('No authorization header'), { requestId });
      return createErrorResponse('No authorization header', 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logError('CREATE_MANDATE', userError || new Error('Unauthorized'), { requestId });
      return createErrorResponse('Unauthorized', 401);
    }

    logInfo('CREATE_MANDATE', `Starting mandate creation for user ${user.id}`, { requestId, userId: user.id });

    const body = await req.json();
    const { customerId, customerName, customerEmail, exitUrl, successUrl } = body;

    // Validate inputs
    if (!customerId || !isValidUUID(customerId)) {
      logError('CREATE_MANDATE', new Error('Invalid customer ID format'), { requestId, customerId });
      return createErrorResponse('Invalid customer ID format', 400);
    }

    const sanitizedName = sanitizeString(customerName, 100);
    if (!sanitizedName || sanitizedName.length < 1) {
      logError('CREATE_MANDATE', new Error('Customer name is required'), { requestId });
      return createErrorResponse('Customer name is required', 400);
    }

    // Email is optional but validate if provided
    const sanitizedEmail = customerEmail ? sanitizeString(customerEmail, 254) : undefined;
    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      logError('CREATE_MANDATE', new Error('Invalid email format'), { requestId, email: sanitizedEmail });
      return createErrorResponse('Invalid email format', 400);
    }

    // Validate URLs
    if (exitUrl && !isValidUrl(exitUrl)) {
      logError('CREATE_MANDATE', new Error('Invalid exit URL'), { requestId, exitUrl });
      return createErrorResponse('Invalid exit URL', 400);
    }

    if (successUrl && !isValidUrl(successUrl)) {
      logError('CREATE_MANDATE', new Error('Invalid success URL'), { requestId, successUrl });
      return createErrorResponse('Invalid success URL', 400);
    }

    // Get user's GoCardless credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      logError('CREATE_MANDATE', new Error('Server configuration error'), { requestId });
      return createErrorResponse('Server configuration error', 500);
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('gocardless_access_token_encrypted, business_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.gocardless_access_token_encrypted) {
      logError('CREATE_MANDATE', profileError || new Error('GoCardless not connected'), {
        requestId,
        userId: user.id,
        hasToken: !!profile?.gocardless_access_token_encrypted,
      });
      return createErrorResponse('GoCardless not connected', 400, { requiresReconnect: false });
    }

    const accessToken = await decryptToken(profile.gocardless_access_token_encrypted);
    
    logInfo('CREATE_MANDATE', 'Token decrypted, validating', {
      requestId,
      customerId,
      customerName: sanitizedName,
    });

    // Validate token with retry logic
    const isTokenValid = await validateGoCardlessToken(accessToken);
    
    if (!isTokenValid) {
      logError('CREATE_MANDATE', new Error('Token validation failed'), { requestId });
      return createErrorResponse('GoCardless connection expired. Please reconnect in Settings.', 401, {
        requiresReconnect: true,
      });
    }

    logInfo('CREATE_MANDATE', 'Token validated successfully', { requestId });

    // Step 1: Create a billing request with retry logic
    logInfo('CREATE_MANDATE', 'Creating billing request', { requestId, customerId });
    
    const billingRequestResponse = await makeGoCardlessRequest(
      '/billing_requests',
      {
        method: 'POST',
        body: JSON.stringify({
          billing_requests: {
            mandate_request: {
              scheme: 'bacs',
              currency: 'GBP',
            },
            metadata: {
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

    const billingRequestData = await billingRequestResponse.json();
    
    // Validate response data
    if (!billingRequestData?.billing_requests?.id) {
      logError('CREATE_MANDATE', new Error('Invalid billing request response structure'), {
        requestId,
        responseData: JSON.stringify(billingRequestData),
      });
      return createErrorResponse('Invalid response from GoCardless', 500, { requestId });
    }
    
    const billingRequestId = billingRequestData.billing_requests.id;

    logInfo('CREATE_MANDATE', 'Billing request created', {
      requestId,
      billingRequestId,
      customerId,
    });

    // Step 2: Create a billing request flow with sanitized customer details
    // Split name safely
    const nameParts = sanitizedName.split(' ');
    const givenName = nameParts[0] || sanitizedName;
    const familyName = nameParts.slice(1).join(' ') || sanitizedName;

    logInfo('CREATE_MANDATE', 'Creating billing request flow', {
      requestId,
      billingRequestId,
      givenName,
      familyName,
    });

    const flowResponse = await makeGoCardlessRequest(
      '/billing_request_flows',
      {
        method: 'POST',
        body: JSON.stringify({
          billing_request_flows: {
            redirect_uri: successUrl || exitUrl,
            exit_uri: exitUrl,
            links: {
              billing_request: billingRequestId,
            },
            prefilled_customer: {
              given_name: givenName,
              family_name: familyName,
              email: sanitizedEmail || undefined,
            },
            lock_customer_details: false,
            lock_bank_account: false,
            show_redirect_buttons: true,
            show_success_redirect_button: true,
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

    const flowData = await flowResponse.json();
    
    // Validate response data
    if (!flowData?.billing_request_flows?.authorisation_url) {
      logError('CREATE_MANDATE', new Error('Invalid billing request flow response structure'), {
        requestId,
        billingRequestId,
        responseData: JSON.stringify(flowData),
      });
      return createErrorResponse('Invalid response from GoCardless', 500, { requestId });
    }
    
    const authorisationUrl = flowData.billing_request_flows.authorisation_url;

    logInfo('CREATE_MANDATE', 'Billing request flow created', {
      requestId,
      billingRequestId,
      customerId,
      authorisationUrl: authorisationUrl.substring(0, 50) + '...',
    });

    // SECURITY: Validate customer belongs to authenticated user before update
    // First verify ownership
    const { data: customerCheck, error: ownershipError } = await adminClient
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('profile_id', user.id) // CRITICAL: Ensure customer belongs to user
      .single();

    if (ownershipError || !customerCheck) {
      logError('CREATE_MANDATE', ownershipError || new Error('Customer not found or access denied'), {
        requestId,
        customerId,
        userId: user.id,
      });
      return createErrorResponse('Customer not found or access denied', 403);
    }

    // Store billing request ID for webhook matching, but DON'T set status to pending yet
    // Status will be set to 'pending' only after SMS is successfully sent
    // This prevents showing "pending" status if user cancels SMS picker
    const { error: updateError } = await adminClient
      .from('customers')
      .update({ 
        gocardless_id: `br_${billingRequestId}` // Store billing request ID for webhook matching (status not set yet)
        // Note: gocardless_mandate_status will be set to 'pending' after SMS is sent
      })
      .eq('id', customerId)
      .eq('profile_id', user.id); // CRITICAL: Double-check ownership in update

    if (updateError) {
      logError('CREATE_MANDATE', updateError, {
        requestId,
        customerId,
        billingRequestId,
      });
    } else {
      logInfo('CREATE_MANDATE', 'Customer updated with billing request ID', {
        requestId,
        customerId,
        billingRequestId,
      });
    }

    logInfo('CREATE_MANDATE', 'Mandate creation complete', {
      requestId,
      customerId,
      billingRequestId,
    });

    return new Response(JSON.stringify({ 
      authorisationUrl,
      billingRequestId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logError('CREATE_MANDATE_CRITICAL', error, {
      requestId,
      method: req.method,
      url: req.url,
    });
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(message, 500, { requestId });
  }
});
