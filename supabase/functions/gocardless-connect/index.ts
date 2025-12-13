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

    const { redirectUrl } = await req.json();
    
    const clientId = Deno.env.get('GOCARDLESS_CLIENT_ID');
    const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
    
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'GoCardless not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build OAuth authorization URL
    const baseUrl = environment === 'live' 
      ? 'https://connect.gocardless.com'
      : 'https://connect-sandbox.gocardless.com';
    
    const state = btoa(JSON.stringify({ userId: user.id, timestamp: Date.now() }));
    
    const authUrl = new URL(`${baseUrl}/oauth/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('initial_view', 'login');

    console.log('Generated GoCardless OAuth URL for user:', user.id);

    return new Response(JSON.stringify({ url: authUrl.toString(), state }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in gocardless-connect:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
