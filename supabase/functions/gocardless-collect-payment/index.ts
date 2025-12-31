import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption key derived from a secret - matches gocardless-callback
async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('SERVICE_ROLE_KEY environment variable is required but not set');
  }
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
    console.log('[GC-COLLECT] Attempting legacy token decryption');
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

function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         isFinite(amount) && 
         amount > 0 && 
         amount <= 100000; // Max £100,000 per payment
}

function sanitizeDescription(description: unknown): string {
  if (typeof description !== 'string') return '';
  // Remove any potentially harmful characters, limit length
  return description
    .replace(/[<>"'&]/g, '')
    .slice(0, 200)
    .trim();
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
    const { jobId, customerId, amount, description } = body;

    // Validate inputs
    if (!jobId || !isValidUUID(jobId)) {
      return new Response(JSON.stringify({ error: 'Invalid job ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!customerId || !isValidUUID(customerId)) {
      return new Response(JSON.stringify({ error: 'Invalid customer ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidAmount(amount)) {
      return new Response(JSON.stringify({ error: 'Invalid amount. Must be between £0.01 and £100,000' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitizedDescription = sanitizeDescription(description);

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    // CRITICAL FIX #1: Check if payment already exists for this job
    // This prevents duplicate payments if the function is called multiple times
    const { data: existingJob, error: jobCheckError } = await adminClient
      .from('jobs')
      .select('gocardless_payment_id')
      .eq('id', jobId)
      .single();

    if (jobCheckError || !existingJob) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingJob.gocardless_payment_id) {
      console.log('[GC-COLLECT] ⚠️ Payment already exists for job:', jobId);
      return new Response(JSON.stringify({ 
        error: 'Payment already created for this job' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's GoCardless credentials and customer's mandate
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
    // This prevents users from collecting payments for other users' customers
    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .select('id, profile_id, gocardless_id, name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (customer.profile_id !== user.id) {
      console.error('[GC-COLLECT] ❌ SECURITY: Customer ownership mismatch');
      console.error('[GC-COLLECT] Customer profile_id:', customer.profile_id);
      console.error('[GC-COLLECT] Authenticated user id:', user.id);
      return new Response(JSON.stringify({ error: 'Unauthorized: Customer does not belong to you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!customer.gocardless_id) {
      return new Response(JSON.stringify({ error: 'Customer does not have an active Direct Debit mandate' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[GC-COLLECT] ✅ Customer ownership validated');

    const accessToken = await decryptToken(profile.gocardless_access_token_encrypted);
    const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
    const apiUrl = environment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com';

    console.log('[GC-COLLECT] ====================================');
    console.log('[GC-COLLECT] PAYMENT COLLECTION STARTED');
    console.log('[GC-COLLECT] ====================================');
    console.log('[GC-COLLECT] Environment:', environment);
    console.log('[GC-COLLECT] API URL:', apiUrl);
    console.log('[GC-COLLECT] Customer:', customer.name);
    console.log('[GC-COLLECT] Customer GC ID (Mandate):', customer.gocardless_id);
    console.log('[GC-COLLECT] Amount:', amount, 'GBP');
    console.log('[GC-COLLECT] Job ID:', jobId);
    console.log('[GC-COLLECT] Token (masked):', accessToken ? `${accessToken.substring(0, 8)}...${accessToken.substring(accessToken.length - 4)}` : 'MISSING');

    // Validate token with a test API call
    console.log('[GC-COLLECT] Step 1: Validating access token...');
    const testResponse = await fetch(`${apiUrl}/creditors`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'GoCardless-Version': '2015-07-06',
      },
    });

    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.error('[GC-COLLECT] ❌ Token validation FAILED');
      console.error('[GC-COLLECT] Status:', testResponse.status);
      console.error('[GC-COLLECT] Error:', testError);
      return new Response(JSON.stringify({ 
        error: 'GoCardless connection expired. Please reconnect in Settings.',
        requiresReconnect: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const creditorData = await testResponse.json();
    console.log('[GC-COLLECT] ✅ Token validated successfully');
    console.log('[GC-COLLECT] Creditor:', creditorData?.creditors?.[0]?.name || 'Unknown');

    // Create payment with sanitized description
    const paymentDescription = sanitizedDescription || `Window cleaning - ${customer.name.slice(0, 50)}`;
    
    // Calculate amounts
    const amountInPence = Math.round(amount * 100);
    
    // Calculate app fee: (amount in pence × 0.75%) + 20p, rounded to nearest integer
    const appFee = Math.round((amountInPence * 0.0075) + 20);
    
    console.log('[GC-COLLECT] Amount in pence:', amountInPence);
    console.log('[GC-COLLECT] App fee (pence):', appFee);
    
    const paymentResponse = await fetch(`${apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
      },
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
    });

    console.log('[GC-COLLECT] Step 2: Payment API Response Status:', paymentResponse.status);

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('[GC-COLLECT] ❌ Payment creation FAILED');
      console.error('[GC-COLLECT] Status:', paymentResponse.status);
      console.error('[GC-COLLECT] Error:', errorText);
      
      // Parse error for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('[GC-COLLECT] Error type:', errorJson?.error?.type);
        console.error('[GC-COLLECT] Error message:', errorJson?.error?.message);
        console.error('[GC-COLLECT] Error errors:', JSON.stringify(errorJson?.error?.errors));
      } catch {
        // Not JSON, already logged raw text
      }
      
      return new Response(JSON.stringify({ error: 'Failed to collect payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentData = await paymentResponse.json();
    const paymentId = paymentData.payments.id;
    const paymentStatus = paymentData.payments.status;
    const chargeDate = paymentData.payments.charge_date;

    console.log(`✅ Payment confirmed: ${paymentId}`);
    console.log('[GC-COLLECT] ✅ Payment created successfully');
    console.log('[GC-COLLECT] Payment ID:', paymentId);
    console.log('[GC-COLLECT] Status:', paymentStatus);
    console.log('[GC-COLLECT] Charge Date:', chargeDate);
    console.log('[GC-COLLECT] Amount:', paymentData.payments.amount, 'pence');
    console.log('[GC-COLLECT] App Fee:', appFee, 'pence');

    // CRITICAL SECURITY: Validate that the job belongs to the authenticated user
    // This prevents users from updating other users' jobs
    console.log('[GC-COLLECT] Step 3: Validating job ownership...');
    const { data: job, error: jobCheckError } = await adminClient
      .from('jobs')
      .select('id, customer_id')
      .eq('id', jobId)
      .single();

    if (jobCheckError || !job) {
      console.error('[GC-COLLECT] ❌ Job not found:', jobCheckError);
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify job belongs to the same customer we validated earlier
    if (job.customer_id !== customerId) {
      console.error('[GC-COLLECT] ❌ SECURITY: Job customer mismatch');
      console.error('[GC-COLLECT] Job customer_id:', job.customer_id);
      console.error('[GC-COLLECT] Requested customer_id:', customerId);
      return new Response(JSON.stringify({ error: 'Unauthorized: Job does not belong to this customer' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[GC-COLLECT] ✅ Job ownership validated');

    // Update job with payment info
    console.log('[GC-COLLECT] Step 4: Updating job record...');
    const { error: updateError } = await adminClient
      .from('jobs')
      .update({
        gocardless_payment_id: paymentId,
        gocardless_payment_status: paymentStatus,
        payment_method: 'gocardless',
        payment_status: 'processing', // Mark as processing until paid_out (funds arrive in 3-5 days)
      })
      .eq('id', jobId);

    if (updateError) {
      console.error('[GC-COLLECT] ⚠️ Job update failed:', updateError);
    } else {
      console.log('[GC-COLLECT] ✅ Job updated successfully');
    }

    console.log('[GC-COLLECT] ====================================');
    console.log('[GC-COLLECT] PAYMENT COLLECTION COMPLETE');
    console.log('[GC-COLLECT] ====================================');

    return new Response(JSON.stringify({ 
      success: true,
      paymentId,
      paymentStatus,
      chargeDate,
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
