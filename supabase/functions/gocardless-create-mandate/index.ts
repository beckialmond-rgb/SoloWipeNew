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

    const { customerId, customerName, customerEmail, exitUrl, successUrl } = await req.json();

    if (!customerId || !customerName) {
      return new Response(JSON.stringify({ error: 'Customer ID and name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's GoCardless credentials
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    const accessToken = decryptToken(profile.gocardless_access_token_encrypted);
    const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
    const apiUrl = environment === 'live'
      ? 'https://api.gocardless.com'
      : 'https://api-sandbox.gocardless.com';

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

    // Step 2: Create a billing request flow
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
            given_name: customerName.split(' ')[0],
            family_name: customerName.split(' ').slice(1).join(' ') || customerName,
            email: customerEmail || undefined,
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

    console.log('Created billing request flow for customer:', customerId);

    // Update customer with pending mandate status
    await adminClient
      .from('customers')
      .update({ gocardless_mandate_status: 'pending' })
      .eq('id', customerId);

    return new Response(JSON.stringify({ 
      authorisationUrl,
      billingRequestId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in gocardless-create-mandate:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
