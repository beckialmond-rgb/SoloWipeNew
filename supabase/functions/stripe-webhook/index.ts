import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Note: Webhooks are server-to-server, but CORS headers are included for consistency
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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    
    logStep("Secrets verified");

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey);
    
    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      logStep("ERROR: No signature header");
      return new Response(JSON.stringify({ error: "No signature header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Event verified", { type: event.type, id: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("ERROR: Signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${errorMessage}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing subscription event", { 
          type: event.type, 
          subscriptionId: subscription.id,
          status: subscription.status 
        });

        // Find user by Stripe customer ID
        const { data: profiles, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string);

        if (profileError) {
          logStep("ERROR: Failed to find profile", { error: profileError.message });
          break;
        }

        if (!profiles || profiles.length === 0) {
          logStep("WARNING: No profile found for customer", { customerId: subscription.customer });
          break;
        }

        const profileId = profiles[0].id;
        const subscriptionStatus = subscription.status;
        const subscriptionEnd = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        // Determine grace period
        let gracePeriodEndsAt: string | null = null;
        const isPastDue = subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid';
        const isCanceled = subscriptionStatus === 'canceled' || subscriptionStatus === 'incomplete_expired';

        if (isPastDue || isCanceled) {
          // Set 7-day grace period from now
          const graceEnd = new Date();
          graceEnd.setDate(graceEnd.getDate() + 7);
          gracePeriodEndsAt = graceEnd.toISOString();
          logStep("Setting grace period", { gracePeriodEndsAt, reason: subscriptionStatus });
        }

        // Update profile with subscription data
        // Note: stripe_customer_id is set by checkout.session.completed event
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            subscription_id: subscriptionStatus !== 'canceled' ? subscription.id : null,
            subscription_status: subscriptionStatus,
            subscription_ends_at: subscriptionEnd,
            grace_period_ends_at: gracePeriodEndsAt,
            subscription_grace_period: !!gracePeriodEndsAt,
          })
          .eq('id', profileId);

        if (updateError) {
          logStep("ERROR: Failed to update profile", { error: updateError.message });
        } else {
          logStep("Profile updated successfully", { profileId, status: subscriptionStatus });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing payment failed event", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription as string | null 
        });

        if (!invoice.subscription) {
          logStep("WARNING: Invoice has no subscription", { invoiceId: invoice.id });
          break;
        }

        // Get subscription to find customer
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        
        // Find user by Stripe customer ID
        const { data: profiles, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string);

        if (profileError) {
          logStep("ERROR: Failed to find profile", { error: profileError.message });
          break;
        }

        if (!profiles || profiles.length === 0) {
          logStep("WARNING: No profile found for customer", { customerId: subscription.customer });
          break;
        }

        const profileId = profiles[0].id;

        // Set 7-day grace period
        const graceEnd = new Date();
        graceEnd.setDate(graceEnd.getDate() + 7);
        const gracePeriodEndsAt = graceEnd.toISOString();

        // Update profile with past_due status and grace period
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            subscription_status: 'past_due',
            grace_period_ends_at: gracePeriodEndsAt,
            subscription_grace_period: true,
          })
          .eq('id', profileId);

        if (updateError) {
          logStep("ERROR: Failed to update profile", { error: updateError.message });
        } else {
          logStep("Profile updated with grace period", { profileId, gracePeriodEndsAt });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing payment succeeded event", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription as string | null 
        });

        if (!invoice.subscription) {
          logStep("WARNING: Invoice has no subscription", { invoiceId: invoice.id });
          break;
        }

        // Get subscription to find customer
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        
        // Find user by Stripe customer ID
        const { data: profiles, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string);

        if (profileError) {
          logStep("ERROR: Failed to find profile", { error: profileError.message });
          break;
        }

        if (!profiles || profiles.length === 0) {
          logStep("WARNING: No profile found for customer", { customerId: subscription.customer });
          break;
        }

        const profileId = profiles[0].id;

        // Clear grace period and update to active
        const subscriptionEnd = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
            subscription_ends_at: subscriptionEnd,
            grace_period_ends_at: null,
            subscription_grace_period: false,
          })
          .eq('id', profileId);

        if (updateError) {
          logStep("ERROR: Failed to update profile", { error: updateError.message });
        } else {
          logStep("Profile updated - payment recovered", { profileId, status: subscription.status });
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout completed", { 
          sessionId: session.id,
          customerId: session.customer,
          subscriptionId: session.subscription
        });

        // When checkout completes, we need to link the customer to the user profile
        if (session.customer && session.metadata?.user_id) {
          const userId = session.metadata.user_id;
          const customerId = session.customer as string;
          
          logStep("Linking customer to profile", { userId, customerId });
          
          // Update profile with Stripe customer ID
          const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ 
              stripe_customer_id: customerId,
            })
            .eq('id', userId);
          
          if (updateError) {
            logStep("ERROR: Failed to link customer", { error: updateError.message });
          } else {
            logStep("Customer linked successfully", { userId, customerId });
          }
        }
        
        // The subscription will be updated by customer.subscription.updated event
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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

