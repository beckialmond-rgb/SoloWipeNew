import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is a helper - if so, check owner's subscription instead
    const { data: teamMemberships } = await supabaseClient
      .from('team_members')
      .select('owner_id')
      .eq('helper_id', user.id)
      .limit(1);

    const { data: userCustomers } = await supabaseClient
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .limit(1);

    const isHelper = (teamMemberships?.length ?? 0) > 0 && (userCustomers?.length ?? 0) === 0;

    if (isHelper && teamMemberships?.[0]?.owner_id) {
      // Helper detected - check owner's subscription from database instead of Stripe
      const ownerId = teamMemberships[0].owner_id;
      logStep("Helper detected - checking owner subscription", { helperId: user.id, ownerId });
      
      // Get owner's subscription status from their profile
      const { data: ownerProfile } = await supabaseClient
        .from('profiles')
        .select('subscription_status, subscription_id, subscription_ends_at, stripe_customer_id')
        .eq('id', ownerId)
        .single();
      
      if (ownerProfile) {
        const ownerSubscriptionStatus = ownerProfile.subscription_status || 'inactive';
        const hasActiveSub = ownerSubscriptionStatus === 'active' || ownerSubscriptionStatus === 'trialing';
        
        logStep("Owner subscription status retrieved", { 
          ownerId, 
          status: ownerSubscriptionStatus,
          hasActiveSub 
        });
        
        // Update helper's profile with owner's subscription status (for display purposes)
        // This allows helpers to see subscription status without modifying owner's data
        await supabaseClient
          .from('profiles')
          .update({ 
            subscription_status: ownerSubscriptionStatus,
            subscription_id: ownerProfile.subscription_id,
            subscription_ends_at: ownerProfile.subscription_ends_at,
            stripe_customer_id: ownerProfile.stripe_customer_id
          })
          .eq('id', user.id);
        
        return new Response(JSON.stringify({
          subscribed: hasActiveSub,
          subscription_status: ownerSubscriptionStatus,
          subscription_end: ownerProfile.subscription_ends_at || null,
          customer_id: ownerProfile.stripe_customer_id || null,
          product_id: null, // Product ID not stored in profile, would need Stripe lookup
          trial_end: null // Trial end not stored separately in profile
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // Owner profile not found - treat as inactive
        logStep("Owner profile not found", { ownerId });
        await supabaseClient
          .from('profiles')
          .update({ 
            subscription_status: 'inactive',
            stripe_customer_id: null,
            subscription_id: null,
            subscription_ends_at: null
          })
          .eq('id', user.id);
        
        return new Response(JSON.stringify({ 
          subscribed: false,
          subscription_status: 'inactive'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // For owners, check Stripe subscription as normal
    const stripe = new Stripe(stripeKey);
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      
      // Update profile with subscription status
      await supabaseClient
        .from('profiles')
        .update({ 
          subscription_status: 'inactive',
          stripe_customer_id: null,
          subscription_id: null,
          subscription_ends_at: null
        })
        .eq('id', user.id);
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: 'inactive'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });
    
    // Filter for active or trialing status
    const activeSubscription = subscriptions.data.find(
      (sub: { status: string }) => sub.status === 'active' || sub.status === 'trialing'
    );
    
    const hasActiveSub = !!activeSubscription;
    let subscriptionId = null;
    let subscriptionEnd = null;
    let subscriptionStatus = 'inactive';
    let productId = null;
    let trialEnd = null;

    if (hasActiveSub && activeSubscription) {
      subscriptionId = activeSubscription.id;
      
      // Safely convert timestamps - handle null/undefined/invalid values
      const periodEnd = activeSubscription.current_period_end;
      if (periodEnd && 
          typeof periodEnd === 'number' && 
          !isNaN(periodEnd) &&
          periodEnd > 0 &&
          isFinite(periodEnd)) {
        try {
          const date = new Date(periodEnd * 1000);
          if (!isNaN(date.getTime())) {
            subscriptionEnd = date.toISOString();
          } else {
            logStep("Warning: Invalid date from current_period_end", { 
              current_period_end: periodEnd,
              dateValue: date.toString()
            });
            subscriptionEnd = null;
          }
        } catch (e) {
          logStep("Warning: Failed to convert current_period_end", { 
            current_period_end: periodEnd,
            error: e instanceof Error ? e.message : String(e)
          });
          subscriptionEnd = null;
        }
      } else {
        logStep("Warning: current_period_end is invalid or missing", { 
          current_period_end: periodEnd,
          type: typeof periodEnd,
          isNaN: periodEnd !== undefined ? isNaN(periodEnd as number) : 'N/A'
        });
        subscriptionEnd = null;
      }
      
      subscriptionStatus = activeSubscription.status; // 'active' or 'trialing'
      productId = activeSubscription.items.data[0]?.price?.product || null;
      
      // Safely convert trial_end timestamp
      const trialEndValue = activeSubscription.trial_end;
      if (trialEndValue && 
          typeof trialEndValue === 'number' && 
          !isNaN(trialEndValue) &&
          trialEndValue > 0 &&
          isFinite(trialEndValue)) {
        try {
          const date = new Date(trialEndValue * 1000);
          if (!isNaN(date.getTime())) {
            trialEnd = date.toISOString();
          } else {
            trialEnd = null;
          }
        } catch (e) {
          logStep("Warning: Failed to convert trial_end", { 
            trial_end: trialEndValue,
            error: e instanceof Error ? e.message : String(e)
          });
          trialEnd = null;
        }
      } else {
        trialEnd = null;
      }
      
      logStep("Subscription found", { 
        subscriptionId, 
        status: subscriptionStatus, 
        endDate: subscriptionEnd, 
        trialEnd,
        productId 
      });
    } else {
      logStep("No active subscription found");
    }

    // Update profile with subscription data
    try {
      await supabaseClient
        .from('profiles')
        .update({ 
          stripe_customer_id: customerId,
          subscription_id: subscriptionId,
          subscription_status: subscriptionStatus,
          subscription_ends_at: subscriptionEnd
        })
        .eq('id', user.id);
      logStep("Profile updated with subscription data");
    } catch (updateError) {
      logStep("Warning: Failed to update profile", { 
        error: updateError instanceof Error ? updateError.message : String(updateError)
      });
      // Continue - profile update failure shouldn't break the response
    }
    
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_status: subscriptionStatus,
      subscription_end: subscriptionEnd,
      customer_id: customerId,
      product_id: productId,
      trial_end: trialEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { 
      message: errorMessage,
      stack: errorStack,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    console.error('[CHECK-SUBSCRIPTION] Full error details:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
