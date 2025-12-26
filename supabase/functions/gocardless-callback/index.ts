import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption key derived from a secret - in production this should use Supabase Vault
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

async function encryptToken(token: string): Promise<string> {
  const key = await getEncryptionKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  );
  
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[GC-CALLBACK] Starting callback processing');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[GC-CALLBACK] No authorization header');
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
      console.error('[GC-CALLBACK] User authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`💰 Starting GoCardless flow for user ${user.id}...`);
    console.log('[GC-CALLBACK] User authenticated:', user.id);

    // Create admin client for database operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    // IDEMPOTENCY CHECK: Check if user already has a valid GoCardless connection
    const { data: existingProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('gocardless_access_token_encrypted, gocardless_organisation_id, gocardless_connected_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[GC-CALLBACK] Failed to fetch profile:', profileError);
    }

    // If already connected with valid token, return success without re-processing
    if (existingProfile?.gocardless_access_token_encrypted && existingProfile?.gocardless_organisation_id) {
      console.log('[GC-CALLBACK] User already has valid GoCardless connection, skipping re-processing');
      return new Response(JSON.stringify({ 
        success: true, 
        organisationId: existingProfile.gocardless_organisation_id,
        alreadyConnected: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { code, redirectUrl, state: stateParam } = body;
    
    console.log('[GC-CALLBACK] === CALLBACK PROCESSING START ===');
    console.log('[GC-CALLBACK] Received code:', code ? `${code.substring(0, 10)}...` : 'MISSING');
    console.log('[GC-CALLBACK] Received redirectUrl from body:', redirectUrl || 'MISSING');
    console.log('[GC-CALLBACK] Received state parameter:', stateParam ? `${stateParam.substring(0, 20)}...` : 'MISSING');
    
    // CRITICAL SECURITY FIX: Validate state parameter to prevent CSRF attacks
    // The state parameter must contain the authenticated user's ID to prevent
    // an attacker from tricking a user into connecting the attacker's GoCardless account
    if (!stateParam) {
      console.error('[GC-CALLBACK] ❌ SECURITY: Missing state parameter - rejecting to prevent CSRF');
      return new Response(JSON.stringify({ error: 'Missing state parameter. Please restart the connection process.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let stateData: { userId?: string; redirectUri?: string; timestamp?: number } | null = null;
    try {
      stateData = JSON.parse(atob(stateParam));
      console.log('[GC-CALLBACK] State parameter decoded:', JSON.stringify(stateData));
    } catch (e) {
      console.error('[GC-CALLBACK] ❌ SECURITY: Invalid state parameter format - rejecting to prevent CSRF');
      return new Response(JSON.stringify({ error: 'Invalid state parameter. Please restart the connection process.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Verify the state parameter contains the authenticated user's ID
    if (!stateData.userId || stateData.userId !== user.id) {
      console.error('[GC-CALLBACK] ❌ SECURITY: State parameter userId mismatch - rejecting to prevent CSRF');
      console.error('[GC-CALLBACK] Expected userId:', user.id);
      console.error('[GC-CALLBACK] State userId:', stateData.userId);
      return new Response(JSON.stringify({ error: 'State parameter validation failed. Please restart the connection process.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional: Validate state timestamp to prevent replay attacks (state should be recent, e.g., within 1 hour)
    if (stateData.timestamp) {
      const stateAge = Date.now() - stateData.timestamp;
      const maxAge = 60 * 60 * 1000; // 1 hour
      if (stateAge > maxAge) {
        console.error('[GC-CALLBACK] ❌ SECURITY: State parameter expired - rejecting to prevent replay attacks');
        return new Response(JSON.stringify({ error: 'Connection session expired. Please restart the connection process.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log('[GC-CALLBACK] ✅ State parameter validated - userId matches authenticated user');
    
    // CRITICAL FIX: Determine redirect_uri deterministically
    // Priority: 1. State parameter (most reliable), 2. Request body redirectUrl, 3. Construct from same logic as connect function
    let redirectUriToUse: string | null = null;
    
    // Extract redirect_uri from validated state parameter
    if (stateData.redirectUri && typeof stateData.redirectUri === 'string') {
      redirectUriToUse = stateData.redirectUri;
      console.log('[GC-CALLBACK] ✅ Extracted redirect_uri from state parameter:', redirectUriToUse);
    }
    
    // Fallback to redirectUrl from request body
    if (!redirectUriToUse && redirectUrl && typeof redirectUrl === 'string') {
      redirectUriToUse = redirectUrl;
      console.log('[GC-CALLBACK] ⚠️ Using redirectUrl from request body (fallback):', redirectUriToUse);
    }
    
    // Final fallback: construct using same deterministic logic as connect function
    // This ensures consistency even if state and redirectUrl are both missing
    if (!redirectUriToUse) {
      // Use the same logic as gocardless-connect function to construct redirect URI
      // This is the production URL - in a real deployment, you might want to determine this from environment
      // For now, we'll use the production URL as the default
      redirectUriToUse = 'https://solowipe.co.uk/gocardless-callback';
      console.log('[GC-CALLBACK] ⚠️ Using constructed redirect_uri (final fallback):', redirectUriToUse);
    }
    
    console.log('[GC-CALLBACK] ✅ Final redirect_uri to use:', redirectUriToUse);
    
    // Input validation
    if (!code || typeof code !== 'string' || code.length > 500) {
      console.error('[GC-CALLBACK] Invalid authorization code');
      return new Response(JSON.stringify({ error: 'Invalid authorization code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (redirectUriToUse.length > 500) {
      console.error('[GC-CALLBACK] Invalid redirect URL (too long)');
      return new Response(JSON.stringify({ error: 'Invalid redirect URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('GOCARDLESS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOCARDLESS_CLIENT_SECRET');
    const environment = Deno.env.get('GOCARDLESS_ENVIRONMENT') || 'sandbox';
    
    if (!clientId || !clientSecret) {
      console.error('[GC-CALLBACK] GoCardless credentials not configured');
      return new Response(JSON.stringify({ error: 'GoCardless not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[GC-CALLBACK] Environment:', environment);
    console.log('[GC-CALLBACK] Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'MISSING');

    // Exchange authorization code for access token
    const tokenUrl = environment === 'live'
      ? 'https://connect.gocardless.com/oauth/access_token'
      : 'https://connect-sandbox.gocardless.com/oauth/access_token';

    console.log('[GC-CALLBACK] === TOKEN EXCHANGE REQUEST ===');
    console.log('[GC-CALLBACK] Token URL:', tokenUrl);
    console.log('[GC-CALLBACK] Using redirect_uri:', redirectUriToUse);
    console.log('[GC-CALLBACK] ⚠️ CRITICAL: This redirect_uri MUST exactly match what was used in the OAuth authorization request');
    console.log('[GC-CALLBACK] ⚠️ CRITICAL: It must also match what is registered in GoCardless Dashboard');
    console.log('[GC-CALLBACK] Environment:', environment === 'live' ? 'LIVE' : 'SANDBOX');
    console.log('[GC-CALLBACK] Dashboard URL:', environment === 'live' 
      ? 'https://manage.gocardless.com/settings/api'
      : 'https://manage-sandbox.gocardless.com/settings/api');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUriToUse, // Use redirect_uri from state (ensures exact match)
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[GC-CALLBACK] ❌ Token exchange failed');
      console.error('[GC-CALLBACK] Status:', tokenResponse.status, tokenResponse.statusText);
      console.error('[GC-CALLBACK] Error response:', errorText);
      console.error('[GC-CALLBACK] Redirect URI used:', redirectUriToUse);
      console.error('[GC-CALLBACK] Environment:', environment);
      
      // Check for redirect_uri mismatch error
      if (errorText.includes('redirect_uri') || errorText.includes('redirect URI')) {
        console.error('[GC-CALLBACK] ❌ REDIRECT URI MISMATCH ERROR');
        console.error('[GC-CALLBACK] This means the redirect_uri used in token exchange does not match:');
        console.error('[GC-CALLBACK] 1. The redirect_uri used in the OAuth authorization request, OR');
        console.error('[GC-CALLBACK] 2. The redirect_uri registered in GoCardless Dashboard');
        console.error('[GC-CALLBACK] Redirect URI that was used:', redirectUriToUse);
        console.error('[GC-CALLBACK] ⚠️ ACTION REQUIRED:');
        console.error('[GC-CALLBACK] 1. Verify this exact URL is registered in GoCardless Dashboard');
        console.error('[GC-CALLBACK] 2. Dashboard URL:', environment === 'live' 
          ? 'https://manage.gocardless.com/settings/api'
          : 'https://manage-sandbox.gocardless.com/settings/api');
        console.error('[GC-CALLBACK] 3. Make sure: NO trailing slash, correct protocol (https for production), correct domain');
        console.error('[GC-CALLBACK] 4. Verify environment matches (sandbox Client ID → sandbox Dashboard, live Client ID → live Dashboard)');
        
        return new Response(JSON.stringify({ 
          error: 'Redirect URI mismatch',
          details: `The redirect URI used does not match what's registered in GoCardless Dashboard. Used: ${redirectUriToUse}. Check browser console for detailed instructions.`,
          redirectUri: redirectUriToUse,
          environment,
          dashboardUrl: environment === 'live' 
            ? 'https://manage.gocardless.com/settings/api'
            : 'https://manage-sandbox.gocardless.com/settings/api'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Check if it's a "code already used" error - this means a previous call succeeded
      if (errorText.includes('already been used') || errorText.includes('invalid_grant')) {
        console.log('[GC-CALLBACK] Code already used - checking if connection exists');
        
        // Re-check the profile in case the previous call succeeded
        const { data: recheckProfile } = await adminClient
          .from('profiles')
          .select('gocardless_access_token_encrypted, gocardless_organisation_id')
          .eq('id', user.id)
          .single();
        
        if (recheckProfile?.gocardless_access_token_encrypted) {
          console.log('[GC-CALLBACK] Previous call succeeded, connection exists');
          return new Response(JSON.stringify({ 
            success: true, 
            organisationId: recheckProfile.gocardless_organisation_id,
            alreadyConnected: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      console.error('[GC-CALLBACK] === END ERROR DETAILS ===');
      return new Response(JSON.stringify({ 
        error: 'Failed to exchange authorization code', 
        details: errorText,
        redirectUri: redirectUriToUse
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[GC-CALLBACK] ✅ Token exchange successful');
    console.log('[GC-CALLBACK] === END TOKEN EXCHANGE REQUEST ===');

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const organisationId = tokenData.organisation_id;

    console.log('[GC-CALLBACK] Token exchange successful');
    console.log('[GC-CALLBACK] Organisation ID:', organisationId);
    console.log('[GC-CALLBACK] Access token received:', accessToken ? `${accessToken.substring(0, 8)}...${accessToken.substring(accessToken.length - 4)}` : 'MISSING');

    if (!accessToken) {
      console.error('[GC-CALLBACK] No access token in response');
      return new Response(JSON.stringify({ error: 'No access token received from GoCardless' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Encrypt token using AES-GCM
    const encryptedToken = await encryptToken(accessToken);
    console.log('[GC-CALLBACK] Token encrypted with AES-GCM, length:', encryptedToken.length);

    // Store credentials in user's profile using service role client with retry logic
    console.log('[GC-CALLBACK] Updating profile for user:', user.id);
    
    let updateSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!updateSuccess && retryCount < maxRetries) {
      const { data: updateData, error: updateError } = await adminClient
        .from('profiles')
        .update({
          gocardless_access_token_encrypted: encryptedToken,
          gocardless_organisation_id: organisationId,
          gocardless_connected_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select();

      if (updateError) {
        retryCount++;
        console.error(`[GC-CALLBACK] Update attempt ${retryCount} failed:`, updateError);
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
          continue;
        }
        return new Response(JSON.stringify({ error: 'Failed to store credentials', details: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('[GC-CALLBACK] Profile update result:', JSON.stringify(updateData));
      updateSuccess = true;
    }

    // Verify the update was successful by re-reading
    const { data: verifyProfile, error: verifyError } = await adminClient
      .from('profiles')
      .select('gocardless_access_token_encrypted, gocardless_organisation_id, gocardless_connected_at')
      .eq('id', user.id)
      .single();

    if (verifyError || !verifyProfile?.gocardless_access_token_encrypted) {
      console.error('[GC-CALLBACK] ❌ Verification failed - token not stored');
      console.error('[GC-CALLBACK] Verify error:', verifyError);
      console.error('[GC-CALLBACK] Verify profile:', JSON.stringify(verifyProfile));
      return new Response(JSON.stringify({ 
        error: 'Token storage verification failed',
        details: 'The token was not stored correctly. Please try connecting again.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Payment confirmed: GoCardless connection successful for user ${user.id}`);
    console.log('[GC-CALLBACK] ✅ GoCardless connected and verified for user:', user.id);
    console.log('[GC-CALLBACK] ✅ Stored token length:', verifyProfile.gocardless_access_token_encrypted.length);
    console.log('[GC-CALLBACK] ✅ Connected at:', verifyProfile.gocardless_connected_at);

    return new Response(JSON.stringify({ 
      success: true, 
      organisationId 
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
