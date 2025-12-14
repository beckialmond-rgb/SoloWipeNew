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

    console.log('[GC-CALLBACK] User authenticated:', user.id);

    // Create admin client for database operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    const { code, redirectUrl } = await req.json();
    
    if (!code) {
      console.error('[GC-CALLBACK] No authorization code provided');
      return new Response(JSON.stringify({ error: 'No authorization code provided' }), {
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

    // Simple encryption (base64 encoding with prefix) - in production use proper encryption
    const encryptedToken = btoa(`gc_token_${accessToken}`);
    console.log('[GC-CALLBACK] Token encrypted, length:', encryptedToken.length);

    // Store credentials in user's profile using service role client
    console.log('[GC-CALLBACK] Updating profile for user:', user.id);
    
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
      console.error('[GC-CALLBACK] Failed to store credentials:', updateError);
      console.error('[GC-CALLBACK] Update error details:', JSON.stringify(updateError));
      return new Response(JSON.stringify({ error: 'Failed to store credentials', details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[GC-CALLBACK] Profile update result:', JSON.stringify(updateData));

    // Verify the update was successful by re-reading
    const { data: verifyProfile, error: verifyError } = await adminClient
      .from('profiles')
      .select('gocardless_access_token_encrypted, gocardless_organisation_id, gocardless_connected_at')
      .eq('id', user.id)
      .single();

    if (verifyError || !verifyProfile?.gocardless_access_token_encrypted) {
      console.error('[GC-CALLBACK] Verification failed - token not stored');
      console.error('[GC-CALLBACK] Verify error:', verifyError);
      console.error('[GC-CALLBACK] Verify profile:', verifyProfile);
      return new Response(JSON.stringify({ error: 'Token storage verification failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[GC-CALLBACK] ✅ GoCardless connected and verified for user:', user.id);
    console.log('[GC-CALLBACK] Stored token length:', verifyProfile.gocardless_access_token_encrypted.length);

    return new Response(JSON.stringify({ 
      success: true, 
      organisationId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[GC-CALLBACK] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
