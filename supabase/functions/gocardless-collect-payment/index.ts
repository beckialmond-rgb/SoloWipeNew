import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decryptToken(encrypted: string): string {
  const decoded = atob(encrypted);
  return decoded.replace('gc_token_', '');
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

    const { jobId, customerId, amount, description } = await req.json();

    if (!jobId || !customerId || !amount) {
      return new Response(JSON.stringify({ error: 'Job ID, customer ID and amount are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    const { data: customer, error: customerError } = await adminClient
      .from('customers')
      .select('gocardless_id, name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer?.gocardless_id) {
      return new Response(JSON.stringify({ error: 'Customer does not have an active Direct Debit mandate' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = decryptToken(profile.gocardless_access_token_encrypted);
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

    // Create payment
    const paymentResponse = await fetch(`${apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'GoCardless-Version': '2015-07-06',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payments: {
          amount: Math.round(amount * 100), // Convert to pence
          currency: 'GBP',
          description: description || `Window cleaning - ${customer.name}`,
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
      
      return new Response(JSON.stringify({ error: 'Failed to collect payment', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentData = await paymentResponse.json();
    const paymentId = paymentData.payments.id;
    const paymentStatus = paymentData.payments.status;
    const chargeDate = paymentData.payments.charge_date;

    console.log('[GC-COLLECT] ✅ Payment created successfully');
    console.log('[GC-COLLECT] Payment ID:', paymentId);
    console.log('[GC-COLLECT] Status:', paymentStatus);
    console.log('[GC-COLLECT] Charge Date:', chargeDate);
    console.log('[GC-COLLECT] Amount:', paymentData.payments.amount, 'pence');

    // Update job with payment info
    console.log('[GC-COLLECT] Step 3: Updating job record...');
    const { error: updateError } = await adminClient
      .from('jobs')
      .update({
        gocardless_payment_id: paymentId,
        gocardless_payment_status: paymentStatus,
        payment_method: 'gocardless',
        payment_status: 'paid', // Mark as paid immediately for DD
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
    console.error('Error in gocardless-collect-payment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
