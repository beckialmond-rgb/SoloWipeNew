import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-HELPER-INVOICE] ${step}${detailsStr}`);
};

interface GenerateInvoiceRequest {
  billing_period_start: string; // ISO date string (YYYY-MM-DD)
  billing_period_end: string; // ISO date string (YYYY-MM-DD)
  generate_for_current_month?: boolean; // If true, generates for current month
}

interface HelperBillingData {
  team_member_id: string;
  helper_id: string | null;
  helper_name: string | null;
  billing_started_at: string | null;
  billing_stopped_at: string | null;
  is_active: boolean;
}

interface InvoiceItem {
  team_member_id: string;
  helper_name: string;
  billing_start_date: string;
  billing_end_date: string | null;
  days_billed: number;
  monthly_rate: number;
  amount: number;
}

const HELPER_MONTHLY_RATE = 5.00; // £5 per month per helper

/**
 * Calculate days in a month
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calculate prorated amount for a helper based on days active
 */
function calculateProratedAmount(
  daysActive: number,
  daysInPeriod: number,
  monthlyRate: number
): number {
  if (daysInPeriod === 0) return 0;
  const amount = (monthlyRate * daysActive) / daysInPeriod;
  return Math.round(amount * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate unique invoice number
 */
function generateInvoiceNumber(billingPeriodStart: string): string {
  const date = new Date(billingPeriodStart);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `HELPER-${year}-${month}-${random}`;
}

/**
 * Calculate billing period for current month
 */
function getCurrentMonthPeriod(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Last day of month
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Calculate days a helper was active during billing period
 */
function calculateDaysActive(
  helper: HelperBillingData,
  periodStart: Date,
  periodEnd: Date
): { days: number; startDate: Date; endDate: Date | null } {
  // Determine actual start date (max of period start and billing start)
  const billingStart = helper.billing_started_at 
    ? new Date(helper.billing_started_at)
    : periodStart;
  const actualStart = billingStart > periodStart ? billingStart : periodStart;
  
  // Determine actual end date (min of period end and billing stop, or period end if still active)
  let actualEnd: Date | null = null;
  if (helper.billing_stopped_at) {
    const billingStop = new Date(helper.billing_stopped_at);
    actualEnd = billingStop < periodEnd ? billingStop : periodEnd;
  } else if (!helper.is_active) {
    // Helper is inactive but no billing_stopped_at set - use period end
    actualEnd = periodEnd;
  } else {
    // Helper is still active - use period end
    actualEnd = periodEnd;
  }
  
  // Calculate days (inclusive)
  const daysDiff = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const days = Math.max(0, daysDiff);
  
  return {
    days,
    startDate: actualStart,
    endDate: actualEnd,
  };
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
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    logStep("Function started");

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      logStep("ERROR: Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
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
        JSON.stringify({ success: false, error: "Authorization required" }),
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
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // 2. Verify requester is an Owner
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
      // Fallback: check customers
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
        JSON.stringify({ success: false, error: "Only owners can generate helper invoices" }),
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
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { billing_period_start, billing_period_end, generate_for_current_month }: GenerateInvoiceRequest = body as GenerateInvoiceRequest;
    
    // Determine billing period
    let periodStart: Date;
    let periodEnd: Date;
    let periodStartStr: string;
    let periodEndStr: string;

    if (generate_for_current_month) {
      const currentPeriod = getCurrentMonthPeriod();
      periodStartStr = currentPeriod.start;
      periodEndStr = currentPeriod.end;
      periodStart = new Date(periodStartStr);
      periodEnd = new Date(periodEndStr);
    } else if (billing_period_start && billing_period_end) {
      periodStartStr = billing_period_start;
      periodEndStr = billing_period_end;
      periodStart = new Date(periodStartStr);
      periodEnd = new Date(periodEndStr);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Either provide billing_period_start and billing_period_end, or set generate_for_current_month to true" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate dates
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid date format. Use YYYY-MM-DD" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (periodEnd <= periodStart) {
      return new Response(
        JSON.stringify({ success: false, error: "billing_period_end must be after billing_period_start" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    logStep("Processing invoice generation", { 
      periodStart: periodStartStr, 
      periodEnd: periodEndStr,
      ownerId: user.id 
    });

    // 4. Check if invoice already exists for this period
    const { data: existingInvoice } = await supabase
      .from('helper_invoices')
      .select('id, invoice_number')
      .eq('owner_id', user.id)
      .eq('billing_period_start', periodStartStr)
      .eq('billing_period_end', periodEndStr)
      .maybeSingle();

    if (existingInvoice) {
      logStep("Invoice already exists for this period", { invoiceId: existingInvoice.id });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Invoice already exists for this period",
          invoice_id: existingInvoice.id,
          invoice_number: existingInvoice.invoice_number,
          already_exists: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 5. Fetch all helpers for this owner
    const { data: helpers, error: helpersError } = await supabase
      .from('team_members')
      .select(`
        id,
        helper_id,
        billing_started_at,
        billing_stopped_at,
        is_active
      `)
      .eq('owner_id', user.id);

    // Fetch helper names separately if helper_id exists
    const helperIds = (helpers || []).filter(h => h.helper_id).map(h => h.helper_id);
    let helperNamesMap: Record<string, string> = {};
    
    if (helperIds.length > 0) {
      const { data: helperProfiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', helperIds);
      
      if (helperProfiles) {
        helperProfiles.forEach(profile => {
          helperNamesMap[profile.id] = profile.name || 'Unknown Helper';
        });
      }
    }

    if (helpersError) {
      logStep("ERROR: Failed to fetch helpers", { error: helpersError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch helpers" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    logStep("Fetched helpers", { count: helpers?.length || 0 });

    // 6. Calculate invoice items for each helper
    const invoiceItems: InvoiceItem[] = [];
    const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (const helper of (helpers || [])) {
      const helperData: HelperBillingData = {
        team_member_id: helper.id,
        helper_id: helper.helper_id,
        helper_name: helper.helper_id ? (helperNamesMap[helper.helper_id] || 'Unknown Helper') : 'Placeholder Helper',
        billing_started_at: helper.billing_started_at,
        billing_stopped_at: helper.billing_stopped_at,
        is_active: helper.is_active ?? true,
      };

      const { days, startDate, endDate } = calculateDaysActive(
        helperData,
        periodStart,
        periodEnd
      );

      // Only include helpers who were active during this period
      if (days > 0) {
        const amount = calculateProratedAmount(days, daysInPeriod, HELPER_MONTHLY_RATE);
        
        invoiceItems.push({
          team_member_id: helper.id,
          helper_name: helperData.helper_name,
          billing_start_date: startDate.toISOString().split('T')[0],
          billing_end_date: endDate ? endDate.toISOString().split('T')[0] : null,
          days_billed: days,
          monthly_rate: HELPER_MONTHLY_RATE,
          amount,
        });
      }
    }

    // 7. Calculate total amount
    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const helperCount = invoiceItems.length;

    logStep("Calculated invoice", { 
      totalAmount, 
      helperCount, 
      itemsCount: invoiceItems.length 
    });

    // 8. Generate invoice number
    const invoiceNumber = generateInvoiceNumber(periodStartStr);

    // 9. Create invoice record
    const { data: invoice, error: invoiceError } = await supabase
      .from('helper_invoices')
      .insert({
        owner_id: user.id,
        invoice_number: invoiceNumber,
        billing_period_start: periodStartStr,
        billing_period_end: periodEndStr,
        total_amount: totalAmount,
        helper_count: helperCount,
      })
      .select()
      .single();

    if (invoiceError) {
      logStep("ERROR: Failed to create invoice", { error: invoiceError.message });
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create invoice" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    logStep("Invoice created", { invoiceId: invoice.id, invoiceNumber });

    // 10. Create invoice items
    if (invoiceItems.length > 0) {
      const itemsToInsert = invoiceItems.map(item => ({
        invoice_id: invoice.id,
        team_member_id: item.team_member_id,
        helper_name: item.helper_name,
        billing_start_date: item.billing_start_date,
        billing_end_date: item.billing_end_date,
        days_billed: item.days_billed,
        monthly_rate: item.monthly_rate,
        amount: item.amount,
      }));

      const { error: itemsError } = await supabase
        .from('helper_invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        logStep("ERROR: Failed to create invoice items", { error: itemsError.message });
        // Clean up invoice if items fail
        await supabase.from('helper_invoices').delete().eq('id', invoice.id);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create invoice items" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          }
        );
      }

      logStep("Invoice items created", { count: invoiceItems.length });
    }

    // 11. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          billing_period_start: invoice.billing_period_start,
          billing_period_end: invoice.billing_period_end,
          total_amount: invoice.total_amount,
          helper_count: invoice.helper_count,
          generated_at: invoice.generated_at,
        },
        items: invoiceItems,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR: Unexpected error", { error: errorMessage, stack: errorStack });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error" 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

