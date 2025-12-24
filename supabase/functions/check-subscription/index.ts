import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server configuration error: Missing SUPABASE_URL or SERVICE_ROLE_KEY");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
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
      subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
      subscriptionStatus = activeSubscription.status; // 'active' or 'trialing'
      productId = activeSubscription.items.data[0]?.price?.product || null;
      
      if (activeSubscription.trial_end) {
        trialEnd = new Date(activeSubscription.trial_end * 1000).toISOString();
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
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
