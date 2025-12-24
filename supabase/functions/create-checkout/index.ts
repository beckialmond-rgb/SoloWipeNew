import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

// SoloWipe Pro Subscription Pricing
const PRICES = {
  monthly: "price_1SdstJ4hy5D3Fg1bnepMLpw6", // £15/month
  annual: "price_1SdstJ4hy5D3Fg1bliu55p34",  // £150/year (save £30)
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
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

    // Parse request body for price type and optional coupon
    const body = await req.json().catch(() => ({}));
    const priceType = body.priceType || "monthly";
    // Trim and validate coupon code (handle empty strings and whitespace)
    const couponCode = body.couponCode?.trim() || null;
    const hasValidCoupon = couponCode && couponCode.length > 0;
    
    if (!PRICES[priceType as keyof typeof PRICES]) {
      throw new Error(`Invalid price type: ${priceType}`);
    }
    
    const priceId = PRICES[priceType as keyof typeof PRICES];
    logStep("Price selected", { priceType, priceId, couponCode: couponCode || 'none' });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
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
    
    // Validate coupon if provided
    let validCoupon = null;
    let extendedTrialDays: number | null = null; // Track extended trial from coupon
    if (hasValidCoupon && couponCode) {
      try {
        // Stripe coupon IDs are case-sensitive, but we'll try as-is first
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon.valid) {
          validCoupon = couponCode;
          
          // Check for extended trial in coupon metadata
          // Coupons can have metadata: { trial_days: "30" } or { trial_days: "60" }
          const trialDaysFromMetadata = coupon.metadata?.trial_days;
          if (trialDaysFromMetadata) {
            const parsed = parseInt(trialDaysFromMetadata, 10);
            if (!isNaN(parsed) && parsed > 0) {
              extendedTrialDays = parsed;
              logStep("Extended trial detected from coupon", { 
                couponCode, 
                trialDays: extendedTrialDays
              });
            }
          }
          
          logStep("Coupon validated", { 
            couponCode, 
            valid: true,
            percentOff: coupon.percent_off,
            duration: coupon.duration,
            durationInMonths: coupon.duration_in_months || 'N/A',
            extendedTrialDays: extendedTrialDays || 'none'
          });
        } else {
          logStep("Coupon invalid or expired", { 
            couponCode, 
            valid: false,
            reason: 'Coupon marked as invalid by Stripe'
          });
          return new Response(JSON.stringify({ 
            error: `Invalid or expired coupon code: ${couponCode}. Please check the code and try again.` 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
      } catch (couponError: unknown) {
        const errorMessage = couponError instanceof Error ? couponError.message : String(couponError);
        const isNotFound = errorMessage.includes('No such coupon') || 
                          errorMessage.includes('resource_missing') ||
                          (couponError as any)?.code === 'resource_missing';
        
        logStep("Coupon validation failed", { 
          couponCode, 
          error: errorMessage,
          isNotFound 
        });
        
        return new Response(JSON.stringify({ 
          error: isNotFound 
            ? `Coupon code "${couponCode}" not found. Please check the code and try again.`
            : `Error validating coupon: ${errorMessage}`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }
    
    // Determine trial period: use extended trial from coupon if available, otherwise default to 7 days
    const trialPeriodDays = extendedTrialDays || 7;
    
    // Build checkout session config
    const sessionConfig: any = {
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
        trial_period_days: trialPeriodDays,
      },
      success_url: `${origin}/settings?subscription=success`,
      cancel_url: `${origin}/settings?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        trial_days: trialPeriodDays.toString(), // Store trial period in metadata for reference
      },
    };
    
    // Add coupon discount if valid coupon provided
    if (validCoupon) {
      sessionConfig.discounts = [{ coupon: validCoupon }];
      logStep("Coupon applied to checkout", { couponCode: validCoupon });
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url, 
      trialPeriodDays,
      coupon: validCoupon || 'none',
      extendedTrial: extendedTrialDays ? true : false
    });

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
