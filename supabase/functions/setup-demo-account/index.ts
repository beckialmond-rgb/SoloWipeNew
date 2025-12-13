import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@solowipe.com";
const DEMO_PASSWORD = "demo123456";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Setting up demo account...");

    // Check if demo user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let demoUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

    if (!demoUser) {
      console.log("Creating demo user...");
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          business_name: "Demo Window Cleaning",
        },
      });

      if (createError) {
        console.error("Error creating demo user:", createError);
        throw createError;
      }

      demoUser = newUser.user;
      console.log("Demo user created:", demoUser.id);
    } else {
      console.log("Demo user already exists:", demoUser.id);
    }

    const userId = demoUser.id;

    // Check if demo data exists
    const { data: existingCustomers } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("profile_id", userId)
      .limit(1);

    if (!existingCustomers || existingCustomers.length === 0) {
      console.log("Creating demo customers...");

      // Create demo customers
      const demoCustomers = [
        {
          profile_id: userId,
          name: "Mrs. Thompson",
          address: "14 High Street, Manchester, M1 2AB",
          mobile_phone: "+447700900123",
          price: 25,
          frequency_weeks: 4,
          status: "active",
          notes: "Gate code: 1234. Friendly dog named Max.",
        },
        {
          profile_id: userId,
          name: "Mr. Williams",
          address: "22 Maple Drive, Leeds, LS1 4PQ",
          mobile_phone: "+447700900456",
          price: 20,
          frequency_weeks: 4,
          status: "active",
          notes: null,
        },
        {
          profile_id: userId,
          name: "The Patels",
          address: "8 Oak Avenue, Birmingham, B15 2TT",
          mobile_phone: "+447700900789",
          price: 35,
          frequency_weeks: 2,
          status: "active",
          notes: "Back garden access via side gate. Large conservatory.",
        },
        {
          profile_id: userId,
          name: "Mrs. O'Brien",
          address: "45 Church Lane, Liverpool, L1 9DQ",
          mobile_phone: "+447700900321",
          price: 18,
          frequency_weeks: 4,
          status: "active",
          notes: null,
        },
        {
          profile_id: userId,
          name: "Dr. Singh",
          address: "101 Victoria Road, Sheffield, S1 2LF",
          mobile_phone: "+447700900654",
          price: 30,
          frequency_weeks: 3,
          status: "active",
          notes: "Conservatory at back. Prefers morning appointments.",
        },
      ];

      const { data: customers, error: customersError } = await supabaseAdmin
        .from("customers")
        .insert(demoCustomers)
        .select();

      if (customersError) {
        console.error("Error creating customers:", customersError);
        throw customersError;
      }

      console.log("Created", customers.length, "demo customers");

      // Create demo jobs for today
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

      const demoJobs = customers.flatMap((customer, index) => {
        const jobs = [];
        
        // Some jobs for today
        if (index < 3) {
          jobs.push({
            customer_id: customer.id,
            scheduled_date: today,
            status: "pending",
            payment_status: "unpaid",
          });
        }
        
        // Some jobs for tomorrow
        if (index >= 2 && index < 4) {
          jobs.push({
            customer_id: customer.id,
            scheduled_date: tomorrow,
            status: "pending",
            payment_status: "unpaid",
          });
        }
        
        // Some jobs for next week
        if (index >= 3) {
          jobs.push({
            customer_id: customer.id,
            scheduled_date: nextWeek,
            status: "pending",
            payment_status: "unpaid",
          });
        }

        return jobs;
      });

      const { error: jobsError } = await supabaseAdmin.from("jobs").insert(demoJobs);

      if (jobsError) {
        console.error("Error creating jobs:", jobsError);
        throw jobsError;
      }

      console.log("Created", demoJobs.length, "demo jobs");

      // Create some completed jobs for earnings history
      const completedJobs = customers.slice(0, 3).map((customer) => ({
        customer_id: customer.id,
        scheduled_date: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
        status: "completed",
        completed_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        amount_collected: customer.id === customers[0].id ? 25 : customer.id === customers[1].id ? 20 : 35,
        payment_status: "paid",
        payment_method: "cash",
        payment_date: new Date(Date.now() - 7 * 86400000).toISOString(),
      }));

      await supabaseAdmin.from("jobs").insert(completedJobs);
      console.log("Created completed jobs for history");
    } else {
      console.log("Demo data already exists");
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in setup-demo-account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
