import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Encryption key derived from a secret - in production this should use Supabase Vault
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
    const { code, redirectUrl } = body;
    
    // Input validation
    if (!code || typeof code !== 'string' || code.length > 500) {
      console.error('[GC-CALLBACK] Invalid authorization code');
      return new Response(JSON.stringify({ error: 'Invalid authorization code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (redirectUrl && (typeof redirectUrl !== 'string' || redirectUrl.length > 500)) {
      console.error('[GC-CALLBACK] Invalid redirect URL');
      return new Response(JSON.stringify({ error: 'Invalid redirect URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[GC-CALLBACK] Processing authorization code, redirectUrl:', redirectUrl);

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

    // Exchange authorization code for access token
    const tokenUrl = environment === 'live'
      ? 'https://connect.gocardless.com/oauth/access_token'
      : 'https://connect-sandbox.gocardless.com/oauth/access_token';

    console.log('[GC-CALLBACK] Exchanging code for token at:', tokenUrl);

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
      console.error('[GC-CALLBACK] Token exchange failed:', errorText);
      
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
      
      return new Response(JSON.stringify({ error: 'Failed to exchange authorization code', details: errorText }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
