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

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('Failed to create payment:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to collect payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentData = await paymentResponse.json();
    const paymentId = paymentData.payments.id;
    const paymentStatus = paymentData.payments.status;

    console.log('Created payment:', paymentId, 'Status:', paymentStatus);

    // Update job with payment info
    await adminClient
      .from('jobs')
      .update({
        gocardless_payment_id: paymentId,
        gocardless_payment_status: paymentStatus,
        payment_method: 'gocardless',
        payment_status: 'paid', // Mark as paid immediately for DD
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({ 
      success: true,
      paymentId,
      paymentStatus,
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
