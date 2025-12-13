import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { code, redirectUrl } = await req.json();
    
    if (!code) {
      return new Response(JSON.stringify({ error: 'No authorization code provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('GOCARDLESS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOCARDLESS_CLIENT_SECRET');
    const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
    
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'GoCardless not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange authorization code for access token
    const tokenUrl = environment === 'live'
      ? 'https://connect.gocardless.com/oauth/access_token'
      : 'https://connect-sandbox.gocardless.com/oauth/access_token';

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUrl,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('GoCardless token exchange failed:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to exchange authorization code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const organisationId = tokenData.organisation_id;

    console.log('Successfully obtained GoCardless access token for user:', user.id);

    // Simple encryption (base64 encoding with prefix) - in production use proper encryption
    const encryptedToken = btoa(`gc_token_${accessToken}`);

    // Store credentials in user's profile using service role client
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        gocardless_access_token_encrypted: encryptedToken,
        gocardless_organisation_id: organisationId,
        gocardless_connected_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to store GoCardless credentials:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to store credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('GoCardless connected successfully for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      organisationId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in gocardless-callback:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
