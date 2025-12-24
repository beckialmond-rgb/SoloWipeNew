import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    console.log('[delete-account] Starting account deletion for user:', user.id);

    // Step 1: Get profile to check for subscriptions and GoCardless
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('subscription_id, subscription_status, stripe_customer_id, gocardless_organisation_id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[delete-account] Error fetching profile:', profileError);
      // Continue with deletion even if profile fetch fails
    }

    // Step 2: Cancel Stripe subscription if active
    if (profile?.subscription_id && profile?.subscription_status === 'active') {
      console.log('[delete-account] Cancelling Stripe subscription:', profile.subscription_id);
      try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (stripeSecretKey) {
          const cancelResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${profile.subscription_id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          if (!cancelResponse.ok) {
            const errorText = await cancelResponse.text();
            console.warn('[delete-account] Failed to cancel Stripe subscription (non-blocking):', errorText);
            // Continue with deletion even if subscription cancellation fails
          } else {
            console.log('[delete-account] Stripe subscription cancelled successfully');
          }
        } else {
          console.warn('[delete-account] STRIPE_SECRET_KEY not configured, skipping subscription cancellation');
        }
      } catch (err) {
        console.warn('[delete-account] Error cancelling Stripe subscription (non-blocking):', err);
        // Continue with deletion
      }
    }

    // Step 3: Disconnect GoCardless (clear credentials)
    if (profile?.gocardless_organisation_id) {
      console.log('[delete-account] Disconnecting GoCardless');
      const { error: disconnectError } = await adminClient
        .from('profiles')
        .update({
          gocardless_access_token_encrypted: null,
          gocardless_organisation_id: null,
          gocardless_connected_at: null,
        })
        .eq('id', user.id);

      if (disconnectError) {
        console.warn('[delete-account] Failed to disconnect GoCardless (non-blocking):', disconnectError);
        // Continue with deletion
      } else {
        console.log('[delete-account] GoCardless disconnected successfully');
      }
    }

    // Step 4: Delete storage files (job photos)
    console.log('[delete-account] Deleting storage files for user:', user.id);
    try {
      const { data: files, error: listError } = await adminClient.storage
        .from('job-photos')
        .list(user.id, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (!listError && files && files.length > 0) {
        const filePaths = files.map((file) => `${user.id}/${file.name}`);
        const { error: deleteError } = await adminClient.storage
          .from('job-photos')
          .remove(filePaths);

        if (deleteError) {
          console.warn('[delete-account] Failed to delete some storage files (non-blocking):', deleteError);
        } else {
          console.log('[delete-account] Deleted', files.length, 'storage files');
        }
      }
    } catch (err) {
      console.warn('[delete-account] Error deleting storage files (non-blocking):', err);
      // Continue with deletion
    }

    // Step 5: Delete the auth user (this will cascade delete profiles, customers, jobs via ON DELETE CASCADE)
    console.log('[delete-account] Deleting auth user:', user.id);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[delete-account] Failed to delete auth user:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[delete-account] Account deleted successfully for user:', user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[delete-account] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

