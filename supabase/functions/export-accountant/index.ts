import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Export Accountant CSV - Phase 9
 * 
 * Exports completed jobs as CSV for accountant use.
 * Only accessible to owners (helpers cannot access).
 * Respects RLS policies - only exports owner's jobs.
 */

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Authorization: Check if user is owner
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[EXPORT-ACCOUNTANT] Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify user role' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check role: owner or both allowed, helper-only denied
    const role = profile?.role;
    let isOwner = false;

    if (role === 'owner' || role === 'both') {
      isOwner = true;
    } else if (role === 'helper') {
      // Helper-only users cannot access
      return new Response(
        JSON.stringify({ error: 'Access denied. Only business owners can export accountant data.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Fallback: check if user has customers (backward compatibility)
      const { data: customers, error: customersError } = await supabaseClient
        .from('customers')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1);

      if (customersError) {
        console.error('[EXPORT-ACCOUNTANT] Customers check error:', customersError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify user role' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      isOwner = (customers?.length ?? 0) > 0;
      if (!isOwner) {
        return new Response(
          JSON.stringify({ error: 'Access denied. Only business owners can export accountant data.' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Parse request body
    const body = await req.json();
    const { startDate, endDate } = body;

    // Validate date range
    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: startDate and endDate' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate date range (endDate >= startDate)
    if (new Date(endDate) < new Date(startDate)) {
      return new Response(
        JSON.stringify({ error: 'endDate must be >= startDate' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Limit date range to 1 year (performance protection)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return new Response(
        JSON.stringify({ error: 'Date range cannot exceed 365 days' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ============================================================================
    // CSV Utility Functions (replicated from src/services/csv.ts)
    // Note: Cannot import frontend code in Deno, so logic is replicated here
    // ============================================================================

    /**
     * Escape a CSV field according to RFC 4180 standard
     * Fields containing comma, newline, or quote must be wrapped in double quotes
     * Internal double quotes must be escaped by doubling them (" -> "")
     */
    function escapeCSVField(value: string | number | null | undefined): string {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    /**
     * Format a date for CSV export in UK format (dd/MM/yyyy)
     * Returns empty string if date is invalid/null
     */
    function formatDate(date: Date | string | null | undefined): string {
      if (!date) {
        return '';
      }
      try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(dateObj.getTime())) {
          return '';
        }
        // Format as dd/MM/yyyy (UK standard)
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (error) {
        return '';
      }
    }

    /**
     * Format money amount to 2 decimal places
     * Returns '0.00' for null, undefined, or NaN values
     */
    function formatMoney(amount: number | null | undefined): string {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return '0.00';
      }
      return amount.toFixed(2);
    }

    /**
     * Calculate SoloWipe Platform Fee: (amount * 0.0075) + £0.30
     */
    function calculatePlatformFee(amountPounds: number): number {
      return (amountPounds * 0.0075) + 0.30;
    }

    /**
     * Calculate GoCardless Processing Fee: (amount * 0.01) + £0.20, capped at £4.00
     */
    function calculateProcessingFee(amountPounds: number): number {
      const fee = (amountPounds * 0.01) + 0.20;
      return Math.min(fee, 4.00);
    }

    /**
     * Generate safe invoice number from job ID
     * Format: INV-{first 8 chars of id in uppercase}
     */
    function generateInvoiceNumber(job: any): string {
      if (job.invoice_number) {
        return job.invoice_number;
      }
      if (job.id) {
        return `INV-${job.id.slice(0, 8).toUpperCase()}`;
      }
      return 'INV-UNKNOWN';
    }

    /**
     * Calculate fees for a job, using stored values when available, otherwise calculating
     * Fees only apply to GoCardless payments; cash/transfer have no fees
     */
    function calculateJobFees(job: any): {
      platformFee: number;
      gocardlessFee: number;
      netAmount: number;
    } {
      const isGoCardless = job.payment_method === 'gocardless';
      const grossAmount = job.amount_collected || 0;

      // Use stored fees if available, otherwise calculate
      const platformFee =
        job.platform_fee ??
        (isGoCardless ? calculatePlatformFee(grossAmount) : 0);

      const gocardlessFee =
        job.gocardless_fee ??
        (isGoCardless ? calculateProcessingFee(grossAmount) : 0);

      const netAmount =
        job.net_amount ??
        (isGoCardless ? grossAmount - platformFee - gocardlessFee : grossAmount);

      return { platformFee, gocardlessFee, netAmount };
    }

    // ============================================================================
    // Fetch completed jobs with customer data
    // ============================================================================

    // Fetch completed jobs with customer data
    // RLS ensures user can only see their own jobs via customer ownership
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('jobs')
      .select(`
        id,
        scheduled_date,
        completed_at,
        amount_collected,
        payment_status,
        payment_method,
        payment_date,
        invoice_number,
        platform_fee,
        gocardless_fee,
        net_amount,
        customer:customers!inner(
          name,
          address,
          is_archived,
          profile_id
        )
      `)
      .eq('status', 'completed')
      .gte('completed_at', `${startDate}T00:00:00`)
      .lte('completed_at', `${endDate}T23:59:59`)
      .order('completed_at', { ascending: false });

    if (jobsError) {
      console.error('[EXPORT-ACCOUNTANT] Jobs fetch error:', jobsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch jobs' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ============================================================================
    // Fetch expenses for the date range
    // ============================================================================
    const { data: expenses, error: expensesError } = await supabaseClient
      .from('expenses')
      .select(`
        *,
        job:jobs(
          id,
          customer:customers(
            name
          )
        )
      `)
      .eq('owner_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (expensesError) {
      console.error('[EXPORT-ACCOUNTANT] Expenses fetch error:', expensesError);
      // Continue without expenses rather than failing
    }

    // Build CSV content
    const csvRows: string[] = [];

    // CSV Header (matching exportJobsForAccountant() structure from csv.ts)
    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer Address',
      'Scheduled Date',
      'Completed Date',
      'Gross Amount',
      'Payment Method',
      'Payment Status',
      'Payment Date',
      'Platform Fee',
      'GoCardless Fee',
      'Net Amount',
    ];
    csvRows.push(headers.map(escapeCSVField).join(','));

    // CSV Data Rows for Jobs
    if (jobs && jobs.length > 0) {
      for (const job of jobs) {
        // Calculate fees (uses stored values if available, otherwise calculates)
        const { platformFee, gocardlessFee, netAmount } = calculateJobFees(job);
        const grossAmount = job.amount_collected || 0;
        const invoiceNumber = generateInvoiceNumber(job);

        // Build CSV row matching exportJobsForAccountant() structure
        const row = [
          escapeCSVField(invoiceNumber),
          formatDate(job.completed_at),
          escapeCSVField(job.customer?.name),
          escapeCSVField(job.customer?.address),
          formatDate(job.scheduled_date),
          formatDate(job.completed_at),
          formatMoney(grossAmount),
          escapeCSVField(job.payment_method),
          escapeCSVField(job.payment_status),
          formatDate(job.payment_date),
          formatMoney(platformFee),
          formatMoney(gocardlessFee),
          formatMoney(netAmount),
        ];

        csvRows.push(row.join(','));
      }
    }

    // Add Expenses Section
    if (expenses && expenses.length > 0) {
      // Empty row separator
      csvRows.push('');
      // Expenses header
      const expenseHeaders = [
        'Expense Date',
        'Category',
        'Amount',
        'Job ID',
        'Customer Name',
        'Notes',
        'Receipt URL',
      ];
      csvRows.push(expenseHeaders.map(escapeCSVField).join(','));

      // Expense rows (amounts are negative for accounting)
      for (const expense of expenses) {
        const categoryLabel = expense.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        const row = [
          formatDate(expense.date),
          escapeCSVField(categoryLabel),
          formatMoney(-expense.amount), // Negative for expenses
          escapeCSVField(expense.job_id || ''),
          escapeCSVField(expense.job?.customer?.name || ''),
          escapeCSVField(expense.notes || ''),
          escapeCSVField(expense.photo_url || ''),
        ];
        csvRows.push(row.join(','));
      }
    }

    if (csvRows.length === 1) {
      // Only headers, no data
      return new Response(
        JSON.stringify({ error: 'No data found for the selected date range' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const csvContent = csvRows.join('\n');

    // Generate filename
    const filename = `accountant_export_${startDate}_to_${endDate}.csv`;

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[EXPORT-ACCOUNTANT] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

