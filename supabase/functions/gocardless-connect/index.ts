import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders } from "../_shared/cors.ts";

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

    // Also allow localhost for development (any port)
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
  const corsHeaders = getCorsHeaders(req);
  
  console.log(`[${new Date().toISOString()}] Request received: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests - MUST be first, before any other code
  if (req.method === 'OPTIONS') {
    console.log('[CORS] OPTIONS preflight request received');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
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

    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('[GC-CONNECT] Failed to parse request body:', error);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { redirectUrl: clientRedirectUrl } = body || {};
    
    const clientId = Deno.env.get('GOCARDLESS_CLIENT_ID');
    const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
    
    console.log('=== GoCardless OAuth Debug ===');
    console.log('Client ID:', clientId);
    console.log('Environment:', environment);
    console.log('Redirect URL from client:', clientRedirectUrl);
    
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
    
    console.log('=== URI EXACTNESS CHECK ===');
    console.log('OAuth base URL:', baseUrl);
    console.log('Environment:', environment);
    console.log('Client ID (first 8 chars):', clientId?.substring(0, 8) + '...');
    console.log('Redirect URI being sent:', redirectUrl);
    console.log('Redirect URI length:', redirectUrl.length);
    console.log('Redirect URI has trailing slash:', redirectUrl.endsWith('/'));
    console.log('Redirect URI protocol:', new URL(redirectUrl).protocol);
    console.log('Redirect URI hostname:', new URL(redirectUrl).hostname);
    console.log('Redirect URI pathname:', new URL(redirectUrl).pathname);
    console.log('Redirect URI search:', new URL(redirectUrl).search);
    console.log('⚠️ VERIFY: This redirect_uri MUST exactly match what is registered in GoCardless Dashboard');
    console.log('⚠️ VERIFY: No trailing slash differences, http vs https, www vs non-www');
    console.log('=== END URI CHECK ===');
    
    const state = btoa(JSON.stringify({ userId: user.id, timestamp: Date.now() }));
    
    const authUrl = new URL(`${baseUrl}/oauth/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'read_write');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('initial_view', 'login');

    console.log('=== FULL OAUTH URL GENERATED ===');
    console.log('Full OAuth URL:', authUrl.toString());
    console.log('This is the URL that will redirect to GoCardless');
    console.log('After user authorizes, GoCardless will redirect back to:', redirectUrl);
    console.log('GoCardless will append: ?code=XXX&state=YYY to the redirect URL');
    console.log('=== END OAuth URL Debug ===');

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
