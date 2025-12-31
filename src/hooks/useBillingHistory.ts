import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { HelperInvoiceWithItems, HelperInvoiceItem } from '@/types/database';
import { differenceInDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export interface BillingPeriod {
  id: string; // helper_invoice_items.id
  invoice_id: string; // helper_invoices.id
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  helper_id: string; // team_member_id
  helper_name: string | null;
  helper_email: string | null;
  billing_start_date: string;
  billing_end_date: string | null;
  days_billed: number;
  monthly_rate: number;
  amount: number;
  period_start: Date;
  period_end: Date;
  days_active: number;
  cost: number;
  stripe_subscription_item_id: string | null;
  is_active: boolean;
  // Legacy fields for backward compatibility (deprecated)
  event_type?: 'activated' | 'deactivated';
  billing_started_at?: string;
  billing_stopped_at?: string | null;
}

interface UseBillingHistoryReturn {
  history: BillingPeriod[];
  totalMonthlyCost: number; // Sum of all active helpers × £5 (projected monthly)
  currentMonthTotal: number; // Total cost for current calendar month (pro-rated)
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const HELPER_MONTHLY_COST = 5; // £5 per helper per month
const DAYS_PER_MONTH = 30; // Used for pro-rating

/**
 * Calculate cost for a billing period
 * Formula: (days_active / 30) * 5
 * Minimum 1 day for cost calculation
 */
function calculateCost(daysActive: number): number {
  const days = Math.max(1, daysActive); // Minimum 1 day
  const cost = (days / DAYS_PER_MONTH) * HELPER_MONTHLY_COST;
  return Math.round(cost * 100) / 100; // Round to 2 decimal places
}

/**
 * Transform helper invoice items into billing periods
 */
function transformToBillingPeriods(invoices: HelperInvoiceWithItems[]): BillingPeriod[] {
  const periods: BillingPeriod[] = [];
  
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      // Get helper email from team_members if available
      // Note: We'll fetch this separately if needed, for now use null
      const periodStart = parseISO(item.billing_start_date);
      const periodEnd = item.billing_end_date ? parseISO(item.billing_end_date) : parseISO(invoice.billing_period_end);
      
      periods.push({
        id: item.id,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        billing_period_start: invoice.billing_period_start,
        billing_period_end: invoice.billing_period_end,
        helper_id: item.team_member_id,
        helper_name: item.helper_name,
        helper_email: null, // Will be populated from team_members if needed
        billing_start_date: item.billing_start_date,
        billing_end_date: item.billing_end_date,
        days_billed: item.days_billed,
        monthly_rate: item.monthly_rate,
        amount: Number(item.amount),
        period_start: periodStart,
        period_end: periodEnd,
        days_active: item.days_billed,
        cost: Number(item.amount),
        stripe_subscription_item_id: null, // Can be fetched from team_members if needed
        is_active: item.billing_end_date === null,
      });
    }
  }
  
  // Sort by period_start DESC (newest first)
  return periods.sort((a, b) => b.period_start.getTime() - a.period_start.getTime());
}

/**
 * Calculate current month total cost (pro-rated)
 * Sums costs for billing periods that overlap with current calendar month
 */
function calculateCurrentMonthTotal(periods: BillingPeriod[]): number {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  return periods.reduce((total, period) => {
    // Check if period overlaps with current month
    const periodStart = period.period_start;
    const periodEnd = period.period_end;
    
    // Skip if period ends before month starts or starts after month ends
    if (periodEnd < monthStart || periodStart > monthEnd) {
      return total;
    }
    
    // Calculate overlap days
    const overlapStart = periodStart > monthStart ? periodStart : monthStart;
    const overlapEnd = periodEnd < monthEnd ? periodEnd : monthEnd;
    
    // Ensure valid overlap (should always be true after the check above, but safety check)
    if (overlapStart <= overlapEnd) {
      const overlapDays = Math.max(1, differenceInDays(overlapEnd, overlapStart) + 1); // +1 to include both start and end days
      const periodCost = calculateCost(overlapDays);
      return total + periodCost;
    }
    
    return total;
  }, 0);
}

export function useBillingHistory(): UseBillingHistoryReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch helper_invoices with items
  const {
    data: history = [],
    isLoading,
    error,
    refetch,
  } = useQuery<BillingPeriod[]>({
    queryKey: ['billingHistory', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch invoices with items
      const { data: invoices, error: invoicesError } = await supabase
        .from('helper_invoices')
        .select(
          `
          *,
          items:helper_invoice_items(*)
        `
        )
        .eq('owner_id', user.id)
        .order('billing_period_start', { ascending: false });

      if (invoicesError) {
        console.error('[useBillingHistory] Error fetching invoices:', invoicesError);
        throw new Error(invoicesError.message || 'Failed to fetch billing history');
      }

      // Fetch team_members to get helper emails and stripe_subscription_item_id
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select('id, helper_email, stripe_subscription_item_id')
        .eq('owner_id', user.id);

      if (membersError) {
        console.error('[useBillingHistory] Error fetching team members:', membersError);
        // Non-critical error, continue without helper emails
      }

      // Create a map of team_member_id -> helper_email and stripe_subscription_item_id
      const memberMap = new Map(
        (teamMembers || []).map(m => [m.id, { email: m.helper_email, stripeId: m.stripe_subscription_item_id }])
      );

      // Transform invoices to billing periods
      const invoiceData = (invoices || []) as HelperInvoiceWithItems[];
      const periods = transformToBillingPeriods(invoiceData);
      
      // Enrich periods with helper email and stripe subscription item id from team_members
      return periods.map(period => {
        const memberInfo = memberMap.get(period.helper_id);
        return {
          ...period,
          helper_email: memberInfo?.email || null,
          stripe_subscription_item_id: memberInfo?.stripeId || null,
        };
      });
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Calculate computed values
  const activeHelpers = history.filter((h) => h.is_active);
  const totalMonthlyCost = activeHelpers.length * HELPER_MONTHLY_COST;
  const currentMonthTotal = calculateCurrentMonthTotal(history);

  return {
    history,
    totalMonthlyCost,
    currentMonthTotal,
    isLoading,
    error: error as Error | null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['billingHistory', user?.id] });
    },
  };
}

