import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption key derived from a secret - matches gocardless-callback
async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SERVICE_ROLE_KEY') || 'fallback-secret-key';
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret.slice(0, 32).padEnd(32, '0')),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('gocardless-token-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function decryptToken(encrypted: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const decoder = new TextDecoder();
    
    // Decode base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    // Extract IV (first 12 bytes) and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    // Fallback for legacy Base64 encoded tokens (migration support)
    console.log('[GC-MANDATE] Attempting legacy token decryption');
    try {
      const decoded = atob(encrypted);
      if (decoded.startsWith('gc_token_')) {
        return decoded.replace('gc_token_', '');
      }
    } catch {
      // Not a legacy token either
    }
    throw new Error('Failed to decrypt token');
  }
}

// Input validation helpers
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function sanitizeString(str: unknown, maxLength: number = 100): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>"'&]/g, '')
    .slice(0, maxLength)
    .trim();
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`💰 Starting GoCardless flow for user ${user.id}...`);

    const body = await req.json();
    const { customerId, customerName, customerEmail, exitUrl, successUrl } = body;

    // Validate inputs
    if (!customerId || !isValidUUID(customerId)) {
      return new Response(JSON.stringify({ error: 'Invalid customer ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitizedName = sanitizeString(customerName, 100);
    if (!sanitizedName || sanitizedName.length < 1) {
      return new Response(JSON.stringify({ error: 'Customer name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Email is optional but validate if provided
    const sanitizedEmail = customerEmail ? sanitizeString(customerEmail, 254) : undefined;
    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URLs
    if (exitUrl && !isValidUrl(exitUrl)) {
      return new Response(JSON.stringify({ error: 'Invalid exit URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (successUrl && !isValidUrl(successUrl)) {
      return new Response(JSON.stringify({ error: 'Invalid success URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's GoCardless credentials
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('gocardless_access_token_encrypted, business_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.gocardless_access_token_encrypted) {
      return new Response(JSON.stringify({ error: 'GoCardless not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL SECURITY: Validate that the customer belongs to the authenticated user
    // This prevents users from modifying other users' customers
    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .select('id, profile_id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (customer.profile_id !== user.id) {
      console.error('[GC-MANDATE] ❌ SECURITY: Customer ownership mismatch');
      console.error('[GC-MANDATE] Customer profile_id:', customer.profile_id);
      console.error('[GC-MANDATE] Authenticated user id:', user.id);
      return new Response(JSON.stringify({ error: 'Unauthorized: Customer does not belong to you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[GC-MANDATE] ✅ Customer ownership validated');

    const accessToken = await decryptToken(profile.gocardless_access_token_encrypted);
    const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
    const apiUrl = environment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com';

    console.log('[GC-MANDATE] Environment:', environment);
    console.log('[GC-MANDATE] Token (first 4 chars):', accessToken.substring(0, 4));

    // Step 0: Validate token with a test API call
    console.log('[GC-MANDATE] Validating access token...');
    const testResponse = await fetch(`${apiUrl}/creditors`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'GoCardless-Version': '2015-07-06',
      },
    });

    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.error('[GC-MANDATE] Token validation failed:', testResponse.status, testError);
      return new Response(JSON.stringify({ 
        error: 'GoCardless connection expired. Please reconnect in Settings.',
        requiresReconnect: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[GC-MANDATE] Token validated successfully');

    // Step 1: Create a billing request
    const billingRequestResponse = await fetch(`${apiUrl}/billing_requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
      },
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
    });

    if (!billingRequestResponse.ok) {
      const errorText = await billingRequestResponse.text();
      console.error('Failed to create billing request:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to create billing request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const billingRequestData = await billingRequestResponse.json();
    const billingRequestId = billingRequestData.billing_requests.id;

    console.log('Created billing request:', billingRequestId);

    // Step 2: Create a billing request flow with sanitized customer details
    // Split name safely
    const nameParts = sanitizedName.split(' ');
    const givenName = nameParts[0] || sanitizedName;
    const familyName = nameParts.slice(1).join(' ') || sanitizedName;

    const flowResponse = await fetch(`${apiUrl}/billing_request_flows`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
      },
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
    });

    if (!flowResponse.ok) {
      const errorText = await flowResponse.text();
      console.error('Failed to create billing request flow:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to create mandate setup flow' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const flowData = await flowResponse.json();
    const authorisationUrl = flowData.billing_request_flows.authorisation_url;

    console.log(`➡️ Generated Redirect URL: ${authorisationUrl}`);
    console.log('Created billing request flow for customer:', customerId);

    // Update customer with pending mandate status and billing request ID for webhook matching
    await adminClient
      .from('customers')
      .update({ 
        gocardless_mandate_status: 'pending',
        gocardless_id: `br_${billingRequestId}` // Temporarily store billing request ID for webhook matching
      })
      .eq('id', customerId);

    return new Response(JSON.stringify({ 
      authorisationUrl,
      billingRequestId,
    }), {
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
