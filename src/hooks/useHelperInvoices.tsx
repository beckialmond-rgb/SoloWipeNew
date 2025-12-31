import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import {
  HelperEarningsInvoice,
  HelperEarningsInvoiceWithItems,
  HelperEarningsPayment,
  JobAvailableForInvoicing,
  HelperInvoiceSummary,
} from '@/types/database';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';

/**
 * Hook for managing helper invoices and payments
 * Provides functions for:
 * - Generating invoices
 * - Issuing invoices
 * - Recording payments
 * - Viewing invoice details
 * - Getting available jobs for invoicing
 */
export function useHelperInvoices(helperId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query: Get all invoices for owner or specific helper
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['helperInvoices', user?.id, helperId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('helper_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      // If helperId provided, filter by helper
      if (helperId) {
        query = query.eq('helper_id', helperId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as HelperEarningsInvoice[];
    },
    enabled: !!user,
  });

  // Query: Get invoice details with items and payments
  const getInvoiceDetails = async (invoiceId: string): Promise<HelperEarningsInvoiceWithItems | null> => {
    if (!user) return null;

    const { data: invoice, error: invoiceError } = await supabase
      .from('helper_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) return null;

    // Get invoice items
    const { data: items, error: itemsError } = await supabase
      .from('helper_invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('job_date', { ascending: true });

    if (itemsError) throw itemsError;

    // Get payments
    const { data: payments, error: paymentsError } = await supabase
      .from('helper_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (paymentsError) throw paymentsError;

    return {
      ...invoice,
      items: (items || []) as HelperEarningsInvoiceWithItems['items'],
      payments: (payments || []) as HelperEarningsInvoiceWithItems['payments'],
    };
  };

  // Query: Get invoice summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['helperInvoiceSummary', user?.id, helperId],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_helper_invoice_summary', {
        p_owner_id: user.id,
        p_helper_id: helperId || null,
        p_period_start: null,
        p_period_end: null,
      });

      if (error) throw error;
      return data?.[0] as HelperInvoiceSummary | null;
    },
    enabled: !!user,
  });

  // Query: Get jobs available for invoicing
  const getAvailableJobs = async (
    helperId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<JobAvailableForInvoicing[]> => {
    if (!user) return [];

    const { data, error } = await supabase.rpc('get_jobs_available_for_invoicing', {
      p_owner_id: user.id,
      p_helper_id: helperId,
      p_period_start: periodStart ? format(periodStart, 'yyyy-MM-dd') : null,
      p_period_end: periodEnd ? format(periodEnd, 'yyyy-MM-dd') : null,
    });

    if (error) throw error;
    return (data || []) as JobAvailableForInvoicing[];
  };

  // Mutation: Generate invoice
  const generateInvoiceMutation = useMutation({
    mutationFn: async ({
      helperId,
      periodType,
      periodStart,
      periodEnd,
    }: {
      helperId: string;
      periodType: 'weekly' | 'monthly';
      periodStart: Date;
      periodEnd: Date;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('generate_helper_invoice', {
        p_owner_id: user.id,
        p_helper_id: helperId,
        p_period_type: periodType,
        p_period_start: format(periodStart, 'yyyy-MM-dd'),
        p_period_end: format(periodEnd, 'yyyy-MM-dd'),
      });

      if (error) throw error;
      return data as string; // Returns invoice_id
    },
    onSuccess: (invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['helperInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['helperInvoiceSummary'] });
      toast({
        title: 'Invoice created',
        description: 'Invoice has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation: Issue invoice
  const issueInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('issue_helper_invoice', {
        p_invoice_id: invoiceId,
        p_user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helperInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['helperInvoiceSummary'] });
      toast({
        title: 'Invoice issued',
        description: 'Invoice has been issued and locked.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error issuing invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation: Record payment
  const recordPaymentMutation = useMutation({
    mutationFn: async ({
      invoiceId,
      paymentDate,
      paymentMethod,
      amount,
      paymentReference,
      notes,
    }: {
      invoiceId: string;
      paymentDate: Date;
      paymentMethod: 'bank_transfer' | 'cash' | 'cheque' | 'other';
      amount: number;
      paymentReference?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('record_helper_payment', {
        p_invoice_id: invoiceId,
        p_payment_date: format(paymentDate, 'yyyy-MM-dd'),
        p_payment_method: paymentMethod,
        p_amount: amount,
        p_payment_reference: paymentReference || null,
        p_notes: notes || null,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data as string; // Returns payment_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helperInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['helperInvoiceSummary'] });
      toast({
        title: 'Payment recorded',
        description: 'Payment has been recorded successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error recording payment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper: Get default period dates
  const getDefaultPeriodDates = (periodType: 'weekly' | 'monthly'): { start: Date; end: Date } => {
    const now = new Date();
    if (periodType === 'weekly') {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    } else {
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    }
  };

  // Helper: Get previous period dates
  const getPreviousPeriodDates = (periodType: 'weekly' | 'monthly'): { start: Date; end: Date } => {
    const now = new Date();
    if (periodType === 'weekly') {
      const prevWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(prevWeek, { weekStartsOn: 1 }),
        end: endOfWeek(prevWeek, { weekStartsOn: 1 }),
      };
    } else {
      const prevMonth = subMonths(now, 1);
      return {
        start: startOfMonth(prevMonth),
        end: endOfMonth(prevMonth),
      };
    }
  };

  return {
    // Data
    invoices,
    invoicesLoading,
    summary,
    summaryLoading,

    // Functions
    getInvoiceDetails,
    getAvailableJobs,
    getDefaultPeriodDates,
    getPreviousPeriodDates,

    // Mutations
    generateInvoice: generateInvoiceMutation.mutate,
    generateInvoiceAsync: generateInvoiceMutation.mutateAsync,
    isGeneratingInvoice: generateInvoiceMutation.isPending,

    issueInvoice: issueInvoiceMutation.mutate,
    issueInvoiceAsync: issueInvoiceMutation.mutateAsync,
    isIssuingInvoice: issueInvoiceMutation.isPending,

    recordPayment: recordPaymentMutation.mutate,
    recordPaymentAsync: recordPaymentMutation.mutateAsync,
    isRecordingPayment: recordPaymentMutation.isPending,
  };
}

