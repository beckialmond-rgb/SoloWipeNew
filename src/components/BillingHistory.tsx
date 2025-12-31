import { useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Loader2, AlertTriangle, Calendar, CreditCard, ChevronDown, ChevronUp, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { useBillingHistory } from '@/hooks/useBillingHistory';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function BillingHistory() {
  const { history, currentMonthTotal, totalMonthlyCost, isLoading, error, refetch } = useBillingHistory();
  const { status } = useSubscription();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const subscriptionInactive = status === 'inactive' || status === 'past_due';

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return format(dateObj, 'd MMM yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading billing history...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-card rounded-xl border border-destructive/50 shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-semibold">Error loading billing history</h3>
        </div>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-full">
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (history.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center space-y-4">
        <Receipt className="w-12 h-12 text-muted-foreground mx-auto flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-foreground mb-1">No billing history yet</h3>
          <p className="text-sm text-muted-foreground">
            You haven't added any helpers yet. Billing history will appear here once helpers are activated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subscription Warning Banner */}
      {subscriptionInactive && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning">Subscription Inactive</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your subscription is inactive. Billing history may be incomplete.
            </p>
          </div>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Receipt className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="font-semibold text-foreground">Billing Summary</h3>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current month (pro-rated):</span>
            <span className="font-medium text-foreground">{formatCurrency(currentMonthTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Projected monthly cost:</span>
            <span className="font-medium text-foreground">{formatCurrency(totalMonthlyCost)}</span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Billing History</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Chronological record of helper billing events
          </p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Helper</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((period) => (
                <TableRow
                  key={period.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-medium">
                    <div>
                      <div className="text-foreground">
                        {period.helper_name || period.helper_email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {period.helper_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {period.event_type === 'activated' ? 'Helper activated' : 'Helper deactivated'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {formatDate(period.period_start)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {period.is_active ? (
                      <span className="text-sm text-muted-foreground">Ongoing</span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        {formatDate(period.period_end)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">
                      {period.days_active} {period.days_active === 1 ? 'day' : 'days'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium text-foreground">{formatCurrency(period.cost)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={period.is_active ? 'default' : 'secondary'}
                      className={cn(
                        period.is_active
                          ? 'bg-success/10 text-success border-success/20'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {period.is_active ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-border">
          {history.map((period) => {
            const isExpanded = expandedRows.has(period.id);
            return (
              <motion.div
                key={period.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-semibold text-foreground truncate">
                        {period.helper_name || period.helper_email}
                      </h5>
                      <Badge
                        variant={period.is_active ? 'default' : 'secondary'}
                        className={cn(
                          'text-xs',
                          period.is_active
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {period.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{period.helper_email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Start: {formatDate(period.period_start)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {period.is_active ? 'End: Ongoing' : `End: ${formatDate(period.period_end)}`}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Duration: {period.days_active} {period.days_active === 1 ? 'day' : 'days'}
                  </div>
                  <div className="font-medium text-foreground text-right">
                    Cost: {formatCurrency(period.cost)}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Event: {period.event_type === 'activated' ? 'Helper activated' : 'Helper deactivated'}
                </div>

                {/* Collapsible Stripe Details */}
                {period.stripe_subscription_item_id && (
                  <Collapsible open={isExpanded} onOpenChange={() => toggleRow(period.id)}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1 gap-3">
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                          Stripe Details
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="bg-muted/50 rounded-lg p-2 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Subscription Item ID:</span>
                          <code className="text-xs font-mono bg-background px-1.5 py-0.5 rounded">
                            {period.stripe_subscription_item_id.slice(0, 20)}...
                          </code>
                        </div>
                          <a
                          href={`https://dashboard.stripe.com/test/subscription_items/${period.stripe_subscription_item_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          View in Stripe Dashboard
                        </a>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

