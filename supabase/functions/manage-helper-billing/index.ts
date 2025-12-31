import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-HELPER-BILLING] ${step}${detailsStr}`);
};

interface ManageHelperBillingRequest {
  action: "activate" | "deactivate";
  helper_id: string;
}

interface ManageHelperBillingResponse {
  success: boolean;
  message?: string;
  subscription_item_id?: string | null;
  error?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." } as ManageHelperBillingResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role (bypasses RLS for validation)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. Authenticate requester
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logStep("ERROR: Invalid authentication", { error: authError?.message });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // 2. Verify requester is an Owner (not a helper)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    let isOwner = false;
    
    if (profile?.role === 'owner' || profile?.role === 'both') {
      isOwner = true;
    } else if (profile?.role === 'helper') {
      isOwner = false;
    } else {
      // Fallback: check customers (temporary during migration)
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1);
      isOwner = (customers?.length ?? 0) > 0;
    }

    if (!isOwner) {
      logStep("ERROR: User is not an owner", { userId: user.id, role: profile?.role });
      return new Response(
        JSON.stringify({ success: false, error: "Only owners can manage helper billing" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    logStep("Owner verified", { ownerId: user.id });

    // 3. Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      logStep("ERROR: Invalid JSON", { error: String(error) });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { action, helper_id }: ManageHelperBillingRequest = body as ManageHelperBillingRequest;
    
    if (!action || (action !== "activate" && action !== "deactivate")) {
      logStep("ERROR: Invalid action", { action });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action. Must be 'activate' or 'deactivate'" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!helper_id || typeof helper_id !== 'string') {
      logStep("ERROR: Invalid helper_id", { helper_id });
      return new Response(
        JSON.stringify({ success: false, error: "Valid helper_id required" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    logStep("Processing request", { action, helper_id, ownerId: user.id });

    // 4. Verify helper belongs to owner
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('team_members')
      .select('id, owner_id, helper_id, stripe_subscription_item_id, is_active')
      .eq('id', helper_id)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (teamMemberError) {
      logStep("ERROR: Failed to fetch team member", { error: teamMemberError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify helper relationship" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    if (!teamMember) {
      logStep("ERROR: Helper not found or doesn't belong to owner", { helper_id, ownerId: user.id });
      return new Response(
        JSON.stringify({ success: false, error: "Helper not found or access denied" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    logStep("Helper verified", { teamMemberId: teamMember.id });

    // 5. Verify owner has active subscription
    const { data: ownerProfile, error: ownerProfileError } = await supabase
      .from('profiles')
      .select('subscription_id, subscription_status')
      .eq('id', user.id)
      .single();

    if (ownerProfileError) {
      logStep("ERROR: Failed to fetch owner profile", { error: ownerProfileError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify subscription" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const subscriptionStatus = ownerProfile?.subscription_status;
    const subscriptionId = ownerProfile?.subscription_id;

    // Allow both 'active' and 'trialing' statuses (users should be able to manage helpers during trial)
    if (!subscriptionId || (subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing')) {
      logStep("ERROR: Owner does not have active or trialing subscription", { 
        subscriptionId, 
        subscriptionStatus 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Owner must have an active subscription (or be in trial) to manage helper billing" 
        } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    logStep("Subscription verified", { subscriptionId, subscriptionStatus });

    // 6. Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY not set");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const stripe = new Stripe(stripeKey);
    const helperPriceId = Deno.env.get("STRIPE_HELPER_PRICE_ID");
    
    if (!helperPriceId) {
      logStep("ERROR: STRIPE_HELPER_PRICE_ID not set");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error: Helper price ID not configured" } as ManageHelperBillingResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // 7. Handle activation or deactivation
    if (action === "activate") {
      // ACTIVATION LOGIC
      
      // Precondition: Helper should NOT already have a subscription item
      if (teamMember.stripe_subscription_item_id) {
        logStep("ERROR: Helper already has subscription item", { 
          subscriptionItemId: teamMember.stripe_subscription_item_id 
        });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Helper already has an active subscription item" 
          } as ManageHelperBillingResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      logStep("Creating Stripe subscription item", { subscriptionId, helperPriceId });

      // Create Stripe subscription item
      const subscriptionItem = await stripe.subscriptionItems.create({
        subscription: subscriptionId,
        price: helperPriceId,
      });

      logStep("Subscription item created", { 
        subscriptionItemId: subscriptionItem.id 
      });

      // Update team_members record
      const { error: updateError } = await supabase
        .from('team_members')
        .update({
          stripe_subscription_item_id: subscriptionItem.id,
          billing_started_at: new Date().toISOString(),
          billing_stopped_at: null,
          is_active: true,
        })
        .eq('id', teamMember.id);

      if (updateError) {
        logStep("ERROR: Failed to update team member", { error: updateError.message });
        
        // Attempt to clean up Stripe subscription item if database update fails
        try {
          await stripe.subscriptionItems.del(subscriptionItem.id);
          logStep("Cleaned up Stripe subscription item after database error");
        } catch (cleanupError) {
          logStep("ERROR: Failed to cleanup Stripe item", { error: String(cleanupError) });
        }

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to update helper billing status" 
          } as ManageHelperBillingResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      // Reconciliation check: Verify activation invariants
      const { data: verifiedMember, error: verifyError } = await supabase
        .from('team_members')
        .select('stripe_subscription_item_id, is_active')
        .eq('id', teamMember.id)
        .single();

      if (verifyError) {
        logStep("ERROR: Failed to verify activation", { error: verifyError.message });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Activation verification failed: ${verifyError.message}` 
          } as ManageHelperBillingResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      if (!verifiedMember.stripe_subscription_item_id || verifiedMember.is_active !== true) {
        const details = {
          hasSubscriptionItem: !!verifiedMember.stripe_subscription_item_id,
          isActive: verifiedMember.is_active,
        };
        logStep("ERROR: Activation verification failed - invariants violated", details);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Activation verification failed: stripe_subscription_item_id=${details.hasSubscriptionItem}, is_active=${details.isActive}` 
          } as ManageHelperBillingResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      logStep("Helper activated successfully", { 
        helperId: helper_id,
        subscriptionItemId: subscriptionItem.id 
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Helper activated",
          subscription_item_id: subscriptionItem.id,
        } as ManageHelperBillingResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );

    } else {
      // DEACTIVATION LOGIC
      
      // Precondition: Helper must have a subscription item
      if (!teamMember.stripe_subscription_item_id) {
        logStep("ERROR: Helper does not have subscription item", { helperId: helper_id });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Helper does not have an active subscription item" 
          } as ManageHelperBillingResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      logStep("Deleting Stripe subscription item", { 
        subscriptionItemId: teamMember.stripe_subscription_item_id 
      });

      // Delete Stripe subscription item
      try {
        await stripe.subscriptionItems.del(teamMember.stripe_subscription_item_id);
        logStep("Subscription item deleted", { 
          subscriptionItemId: teamMember.stripe_subscription_item_id 
        });
      } catch (stripeError) {
        const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logStep("ERROR: Failed to delete Stripe subscription item", { error: errorMessage });
        
        // If item doesn't exist in Stripe, continue with database update
        if (!errorMessage.includes('No such subscription_item')) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to delete subscription item: ${errorMessage}` 
            } as ManageHelperBillingResponse),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            }
          );
        }
        logStep("WARNING: Subscription item not found in Stripe, continuing with database update");
      }

      // Update team_members record
      const { error: updateError } = await supabase
        .from('team_members')
        .update({
          stripe_subscription_item_id: null,
          billing_stopped_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', teamMember.id);

      if (updateError) {
        logStep("ERROR: Failed to update team member", { error: updateError.message });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to update helper billing status" 
          } as ManageHelperBillingResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      // CRITICAL FIX: Remove ALL job assignments (not just future ones)
      // This ensures helpers cannot see any assigned jobs after deactivation
      // Uses the cleanup_helper_assignments database function for security and consistency
      try {
        const { data: cleanupResult, error: cleanupError } = await supabase
          .rpc('cleanup_helper_assignments', {
            p_helper_id: teamMember.helper_id,
            p_owner_id: user.id,
          });

        if (cleanupError) {
          logStep("WARNING: Failed to cleanup ALL job assignments", { 
            error: cleanupError.message,
            helperId: helper_id,
            helperUserId: teamMember.helper_id 
          });
          // Continue - cleanup failure is non-critical, but log prominently
        } else {
          const deletedCount = cleanupResult || 0;
          logStep("Removed ALL job assignments for helper", { 
            count: deletedCount,
            helperId: helper_id,
            helperUserId: teamMember.helper_id 
          });
        }
      } catch (cleanupException) {
        logStep("WARNING: Exception during job assignment cleanup", { 
          error: String(cleanupException),
          helperId: helper_id,
          helperUserId: teamMember.helper_id 
        });
        // Continue - cleanup failure is non-critical
      }

      // Reconciliation check: Verify deactivation invariants
      const { data: verifiedMember, error: verifyError } = await supabase
        .from('team_members')
        .select('stripe_subscription_item_id, is_active, billing_stopped_at')
        .eq('id', teamMember.id)
        .single();

      if (verifyError) {
        logStep("ERROR: Failed to verify deactivation", { error: verifyError.message });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Deactivation verification failed: ${verifyError.message}` 
          } as ManageHelperBillingResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      if (verifiedMember.stripe_subscription_item_id !== null || 
          verifiedMember.is_active !== false || 
          verifiedMember.billing_stopped_at === null) {
        const details = {
          subscriptionItemId: verifiedMember.stripe_subscription_item_id,
          isActive: verifiedMember.is_active,
          billingStoppedAt: verifiedMember.billing_stopped_at,
        };
        logStep("ERROR: Deactivation verification failed - invariants violated", details);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Deactivation verification failed: stripe_subscription_item_id=${details.subscriptionItemId}, is_active=${details.isActive}, billing_stopped_at=${details.billingStoppedAt ? 'set' : 'null'}` 
          } as ManageHelperBillingResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      logStep("Helper deactivated successfully", { helperId: helper_id });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Helper deactivated",
          subscription_item_id: null,
        } as ManageHelperBillingResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR: Unexpected error", { error: errorMessage, stack: errorStack });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error" 
      } as ManageHelperBillingResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

