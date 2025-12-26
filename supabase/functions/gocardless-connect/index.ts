import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate redirect URL against trusted domains with proper matching
function isValidRedirectUrl(urlString: string, environment: string): { valid: boolean; error?: string } {
  // Check max length
  if (urlString.length > 500) {
    return { valid: false, error: 'URL too long' };
  }

  try {
    const url = new URL(urlString);
    
    // Require HTTPS in production
    if (environment === 'live' && url.protocol !== 'https:') {
      return { valid: false, error: 'HTTPS required in production' };
    }

    // Allow HTTP only for localhost in development
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { valid: false, error: 'Invalid protocol' };
    }

    const hostname = url.hostname;
    
    // Trusted domains with exact matching or subdomain support
    const trustedDomains = ['lovable.app', 'lovableproject.com', 'solowipe.co.uk'];
    
    // Check for exact match or subdomain match (e.g., *.lovable.app)
    const isTrusted = trustedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );

    // Also allow localhost for development
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    if (!isTrusted && !isLocalhost) {
      return { valid: false, error: 'Untrusted domain' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
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

    const { redirectUrl: clientRedirectUrl } = await req.json();
    
    const clientId = Deno.env.get('GOCARDLESS_CLIENT_ID');
    const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
    
    console.log('=== GoCardless OAuth Debug ===');
    console.log('Client ID:', clientId);
    console.log('Client ID length:', clientId?.length || 0);
    console.log('Environment:', environment);
    console.log('Environment from env var:', Deno.env.get('GOCARDLESS_ENVIRONMENT'));
    console.log('Redirect URL from client:', clientRedirectUrl);
    console.log('Redirect URL length:', clientRedirectUrl?.length || 0);
    console.log('Redirect URL encoded check:', encodeURIComponent(clientRedirectUrl) === clientRedirectUrl ? 'No encoding needed' : 'Needs encoding');
    
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'GoCardless not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate client redirect URL is provided
    if (!clientRedirectUrl) {
      return new Response(JSON.stringify({ error: 'Missing redirect URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate redirect URL with proper domain matching
    const validation = isValidRedirectUrl(clientRedirectUrl, environment);
    if (!validation.valid) {
      console.log('Invalid redirect URL:', clientRedirectUrl, 'Reason:', validation.error);
      return new Response(JSON.stringify({ error: `Invalid redirect URL: ${validation.error}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use dynamic redirect URL from client
    const redirectUrl = clientRedirectUrl;
    console.log('Using dynamic redirect_uri:', redirectUrl);

    // Build OAuth authorization URL
    const baseUrl = environment === 'live' 
      ? 'https://connect.gocardless.com'
      : 'https://connect-sandbox.gocardless.com';
    
    console.log('OAuth base URL:', baseUrl);
    
    // CRITICAL FIX: Include redirect_uri in state parameter to ensure consistency
    // This ensures the same redirect_uri is used in both authorization and token exchange
    const stateData = {
      userId: user.id,
      redirectUri: redirectUrl,
      timestamp: Date.now(),
    };
    const state = btoa(JSON.stringify(stateData));
    
    console.log('[GC-CONNECT] State parameter contents:', JSON.stringify(stateData));
    console.log('[GC-CONNECT] State parameter (base64):', state);
    
    const authUrl = new URL(`${baseUrl}/oauth/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('initial_view', 'login');

    // Extract redirect_uri from constructed URL to verify it matches
    const redirectUriFromUrl = authUrl.searchParams.get('redirect_uri');
    console.log('=== REDIRECT URI VERIFICATION ===');
    console.log('Redirect URI we set:', redirectUrl);
    console.log('Redirect URI in OAuth URL:', redirectUriFromUrl);
    console.log('Match:', redirectUrl === redirectUriFromUrl ? '✅ YES' : '❌ NO - MISMATCH!');
    console.log('Expected in Dashboard:', redirectUrl);
    console.log('⚠️ CRITICAL: Verify this URL is registered in GoCardless Dashboard');
    console.log('⚠️ CRITICAL: Environment must match -', environment === 'live' ? 'LIVE Client ID → LIVE Dashboard' : 'SANDBOX Client ID → SANDBOX Dashboard');
    console.log('⚠️ CRITICAL: If using SANDBOX, use: https://manage-sandbox.gocardless.com/settings/api');
    console.log('⚠️ CRITICAL: If using LIVE, use: https://manage.gocardless.com/settings/api');
    console.log('=== END REDIRECT URI VERIFICATION ===');
    
    console.log('Full OAuth URL:', authUrl.toString());
    console.log(`➡️ Generated Redirect URL: ${redirectUrl}`);
    console.log('OAuth Base URL:', baseUrl);
    console.log('Environment:', environment);
    console.log('=== End Debug ===');

    return new Response(JSON.stringify({ url: authUrl.toString(), state }), {
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
