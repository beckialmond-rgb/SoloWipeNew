import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SoloWipe Pro Subscription Pricing
const PRICES = {
  monthly: "price_1SjwvU4hy5D3Fg1bxwaOEPJt", // £25/month
  annual: "price_1SjwvU4hy5D3Fg1bfIEAV8aj",  // £250/year (save £50)
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is a helper (helpers don't need subscriptions - access is managed by owner)
    // Phase 4: Use explicit role field with fallback to inference
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    let isHelper = false;
    
    if (profile?.role === 'helper') {
      isHelper = true;
    } else if (profile?.role === 'both' || profile?.role === 'owner') {
      isHelper = false;
    } else {
      // Fallback: infer from data relationships (temporary during migration)
      const { data: teamMemberships } = await supabaseClient
        .from('team_members')
        .select('id')
        .eq('helper_id', user.id)
        .limit(1);

      const { data: userCustomers } = await supabaseClient
        .from('customers')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1);

      isHelper = (teamMemberships?.length ?? 0) > 0 && (userCustomers?.length ?? 0) === 0;
    }

    if (isHelper) {
      logStep("Helper detected - blocking subscription", { userId: user.id });
      return new Response(JSON.stringify({ 
        error: "Helpers don't need a subscription. Your access is managed by your team owner." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Parse request body for price type and coupon code
    const body = await req.json().catch(() => ({}));
    const priceType = body.priceType || "monthly";
    const couponCode = body.couponCode || null;
    
    if (!PRICES[priceType as keyof typeof PRICES]) {
      throw new Error(`Invalid price type: ${priceType}`);
    }
    
    const priceId = PRICES[priceType as keyof typeof PRICES];
    logStep("Price selected", { priceType, priceId, couponCode: couponCode || "none" });

    const stripe = new Stripe(stripeKey);
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
      
      // Check if already subscribed (active or trialing)
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 10,
      });
      
      const hasActiveSub = subscriptions.data.some(
        (sub: { status: string }) => sub.status === 'active' || sub.status === 'trialing'
      );
      
      if (hasActiveSub) {
        logStep("User already has active or trialing subscription");
        return new Response(JSON.stringify({ 
          error: "You already have an active subscription. Use the customer portal to manage it." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    const origin = req.headers.get("origin") || "https://solowipe.lovable.app";
    
    let session;
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        subscription_data: {
          trial_period_days: 7,
        },
        success_url: `${origin}/settings?subscription=success`,
        cancel_url: `${origin}/settings?subscription=cancelled`,
        metadata: {
          user_id: user.id,
        },
      };

      // Add coupon code if provided
      if (couponCode && couponCode.trim().length > 0) {
        sessionParams.discounts = [{ coupon: couponCode.trim() }];
        logStep("Coupon code applied", { couponCode: couponCode.trim() });
      }

      session = await stripe.checkout.sessions.create(sessionParams);
    } catch (stripeError) {
      const stripeErrorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
      logStep("ERROR: Stripe API call failed", { error: stripeErrorMessage });
      throw new Error(`Failed to create Stripe checkout session: ${stripeErrorMessage}`);
    }

    if (!session || !session.id) {
      logStep("ERROR: Stripe session creation returned invalid response", { session });
      throw new Error("Stripe checkout session creation failed: Invalid response from Stripe");
    }

    if (!session.url) {
      logStep("ERROR: Stripe session created but missing URL", { sessionId: session.id, session });
      throw new Error("Stripe checkout session created but no URL returned. Please check Stripe configuration.");
    }

    logStep("Checkout session created", { sessionId: session.id, url: session.url, trial: true });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack,
    } : { message: String(error) };
    
    // Log full error details for debugging
    console.error('❌ CRITICAL STRIPE CHECKOUT ERROR:', JSON.stringify(errorDetails, Object.getOwnPropertyNames(error)));
    logStep("ERROR", errorDetails);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
