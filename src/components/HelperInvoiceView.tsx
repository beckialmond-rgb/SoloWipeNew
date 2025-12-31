import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Download, FileText, Calendar, Loader2, AlertTriangle, Plus, ChevronDown, ChevronUp, PoundSterling, Users } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface HelperInvoice {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  total_amount: number;
  helper_count: number;
  stripe_invoice_id: string | null;
  generated_at: string;
  created_at: string;
}

interface HelperInvoiceItem {
  id: string;
  invoice_id: string;
  team_member_id: string;
  helper_name: string;
  billing_start_date: string;
  billing_end_date: string | null;
  days_billed: number;
  monthly_rate: number;
  amount: number;
}

interface HelperInvoiceWithItems extends HelperInvoice {
  items: HelperInvoiceItem[];
}

export function HelperInvoiceView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  // Fetch invoices
  const { data: invoices = [], isLoading, error, refetch } = useQuery({
    queryKey: ['helper-invoices', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('helper_invoices')
        .select('*')
        .eq('owner_id', user.id)
        .order('billing_period_start', { ascending: false })
        .limit(12); // Last 12 invoices

      if (error) throw error;
      return data as HelperInvoice[];
    },
    enabled: !!user,
  });

  // Fetch invoice items for expanded invoices
  const { data: invoiceItemsMap = {} } = useQuery({
    queryKey: ['helper-invoice-items', expandedInvoices.size > 0 ? Array.from(expandedInvoices).join(',') : 'none'],
    queryFn: async () => {
      if (expandedInvoices.size === 0 || !user) return {};

      const invoiceIds = Array.from(expandedInvoices);
      const { data, error } = await supabase
        .from('helper_invoice_items')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('helper_name', { ascending: true });

      if (error) throw error;

      // Group items by invoice_id
      const grouped: Record<string, HelperInvoiceItem[]> = {};
      (data as HelperInvoiceItem[]).forEach(item => {
        if (!grouped[item.invoice_id]) {
          grouped[item.invoice_id] = [];
        }
        grouped[item.invoice_id].push(item);
      });

      return grouped;
    },
    enabled: expandedInvoices.size > 0 && !!user,
  });

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async (generateForCurrentMonth: boolean) => {
      if (!user) throw new Error('Not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await supabase.functions.invoke('generate-helper-invoice', {
        body: {
          generate_for_current_month: generateForCurrentMonth,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data.already_exists) {
        toast({
          title: 'Invoice already exists',
          description: `An invoice for this period already exists: ${data.invoice_number}`,
        });
      } else {
        toast({
          title: 'Invoice generated',
          description: `Invoice ${data.invoice.invoice_number} created successfully`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['helper-invoices', user?.id] });
      // Expand the newly created invoice
      if (data.invoice?.id) {
        setExpandedInvoices(prev => new Set(prev).add(data.invoice.id));
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to generate invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleInvoiceExpanded = (invoiceId: string) => {
    setExpandedInvoices(prev => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateRange = (start: string, end: string) => {
    try {
      const startDate = format(new Date(start), 'd MMM');
      const endDate = format(new Date(end), 'd MMM yyyy');
      return `${startDate} - ${endDate}`;
    } catch {
      return `${start} - ${end}`;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-card rounded-xl border border-destructive/50 shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-semibold">Error loading invoices</h3>
        </div>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Generate Button */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-primary flex-shrink-0" />
            <h3 className="font-semibold text-foreground">Helper Invoices</h3>
          </div>
          <Button
            size="sm"
            onClick={() => generateInvoiceMutation.mutate(true)}
            disabled={generateInvoiceMutation.isPending}
            className="touch-sm min-h-[44px]"
          >
            {generateInvoiceMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Generate Current Month
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          View and download invoices for helper billing charges. Each invoice shows the helpers active during the billing period.
        </p>
      </div>

      {/* Empty state */}
      {invoices.length === 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center space-y-4">
          <Receipt className="w-12 h-12 text-muted-foreground mx-auto flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">No invoices yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate an invoice for the current month to get started.
            </p>
            <Button
              onClick={() => generateInvoiceMutation.mutate(true)}
              disabled={generateInvoiceMutation.isPending}
            >
              {generateInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Current Month Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {invoices.length > 0 && (
        <div className="space-y-3">
          {invoices.map((invoice) => {
            const isExpanded = expandedInvoices.has(invoice.id);
            const items = invoiceItemsMap[invoice.id] || [];

            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
              >
                <Collapsible open={isExpanded} onOpenChange={() => toggleInvoiceExpanded(invoice.id)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-semibold text-foreground truncate">
                            {invoice.invoice_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDateRange(invoice.billing_period_start, invoice.billing_period_end)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{invoice.helper_count} {invoice.helper_count === 1 ? 'helper' : 'helpers'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <div className="font-bold text-foreground">
                            {formatCurrency(invoice.total_amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(invoice.generated_at)}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t border-border">
                      {/* Invoice Details */}
                      <div className="pt-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Billing Period:</span>
                          <span className="font-medium text-foreground">
                            {formatDateRange(invoice.billing_period_start, invoice.billing_period_end)}
                          </span>
                        </div>
                        {invoice.stripe_invoice_id && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Stripe Invoice:</span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {invoice.stripe_invoice_id}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Invoice Items */}
                      {items.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Helper Charges
                          </h4>
                          <div className="space-y-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="bg-muted/50 rounded-lg p-3 flex items-center justify-between"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-foreground truncate">
                                    {item.helper_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {item.days_billed} {item.days_billed === 1 ? 'day' : 'days'} @ {formatCurrency(item.monthly_rate)}/month
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="font-semibold text-foreground">
                                    {formatCurrency(item.amount)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Total */}
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">Total:</span>
                          <span className="font-bold text-lg text-foreground">
                            {formatCurrency(invoice.total_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

