import { useState, useMemo } from 'react';
import { PoundSterling, Filter, Calendar, Users, List, Download, Search, X, TrendingUp, CreditCard, Banknote, ArrowRight, Target, ChevronDown, ChevronUp, Wallet, ChevronRight } from 'lucide-react';
import { format, startOfWeek, startOfMonth, subMonths, startOfYear, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EarningsCard } from '@/components/EarningsCard';
import { CompletedJobItem } from '@/components/CompletedJobItem';
import { WeeklyEarningsSummary } from '@/components/WeeklyEarningsSummary';
import { MonthlyEarningsChart } from '@/components/MonthlyEarningsChart';
import { MarkPaidModal } from '@/components/MarkPaidModal';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { JobWithCustomer } from '@/types/database';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Customer } from '@/types/database';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { downloadCSV } from '@/utils/exportCSV';
import { toast } from '@/hooks/use-toast';

type DateRange = 'today' | 'week' | 'month' | 'year';

const dateRangeOptions: { value: DateRange; label: string; icon: typeof Calendar }[] = [
  { value: 'today', label: 'Today', icon: Calendar },
  { value: 'week', label: 'Week', icon: Calendar },
  { value: 'month', label: 'Month', icon: Calendar },
  { value: 'year', label: 'Year', icon: Calendar },
];

const getDateRangeStart = (range: DateRange): string => {
  const now = new Date();
  switch (range) {
    case 'today':
      return format(now, 'yyyy-MM-dd');
    case 'week':
      return format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    case 'month':
      return format(startOfMonth(now), 'yyyy-MM-dd');
    case 'year':
      return format(startOfYear(now), 'yyyy-MM-dd');
    default:
      return format(now, 'yyyy-MM-dd');
  }
};

interface GroupedCustomer {
  customerId: string;
  customerName: string;
  customerAddress: string;
  jobs: JobWithCustomer[];
  totalAmount: number;
  unpaidAmount: number;
}

const Earnings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { todayEarnings, weeklyEarnings, markJobPaid, isLoading: baseLoading, isMarkingPaid, upcomingJobs, customers, businessName } = useSupabaseData();
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [includeArchivedForExport, setIncludeArchivedForExport] = useState(true);
  const [monthlyOverviewExpanded, setMonthlyOverviewExpanded] = useState(false);

  const startDate = getDateRangeStart(dateRange);

  const { data: completedJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['completedJobsRange', user?.id, startDate],
    queryFn: async () => {
      if (!user) return [];
      
      // Query includes archived customers by default for complete financial reporting
      // The UI can filter them out if needed, but the query keeps all data available
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('status', 'completed')
        .gte('completed_at', `${startDate}T00:00:00`)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(job => ({
        ...job,
        customer: job.customer as Customer,
      })) as JobWithCustomer[];
    },
    enabled: !!user,
  });

  const filteredJobs = useMemo(() => {
    let jobs = completedJobs;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      jobs = jobs.filter(job => 
        job.customer.name.toLowerCase().includes(query) ||
        job.customer.address.toLowerCase().includes(query)
      );
    }
    
    // Filter by payment status
    if (showUnpaidOnly) {
      jobs = jobs.filter(job => job.payment_status === 'unpaid' || job.payment_status === 'processing');
    }
    
    return jobs;
  }, [completedJobs, showUnpaidOnly, searchQuery]);

  const groupedByCustomer = useMemo((): GroupedCustomer[] => {
    const groups: Map<string, GroupedCustomer> = new Map();
    
    filteredJobs.forEach(job => {
      const existing = groups.get(job.customer_id);
      if (existing) {
        existing.jobs.push(job);
        existing.totalAmount += job.amount_collected || 0;
        if (job.payment_status === 'unpaid' || job.payment_status === 'processing') {
          existing.unpaidAmount += job.amount_collected || 0;
        }
      } else {
        groups.set(job.customer_id, {
          customerId: job.customer_id,
          customerName: job.customer.name,
          customerAddress: job.customer.address,
          jobs: [job],
          totalAmount: job.amount_collected || 0,
          unpaidAmount: (job.payment_status === 'unpaid' || job.payment_status === 'processing') ? (job.amount_collected || 0) : 0,
        });
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredJobs]);

  const unpaidCount = useMemo(() => 
    completedJobs.filter(job => job.payment_status === 'unpaid' || job.payment_status === 'processing').length,
    [completedJobs]
  );

  const periodEarnings = useMemo(() => 
    completedJobs.reduce((sum, job) => sum + (job.amount_collected || 0), 0),
    [completedJobs]
  );

  const paidTotal = useMemo(() => 
    completedJobs
      .filter(job => job.payment_status === 'paid')
      .reduce((sum, job) => sum + (job.amount_collected || 0), 0),
    [completedJobs]
  );

  const unpaidTotal = useMemo(() => 
    completedJobs
      .filter(job => job.payment_status === 'unpaid' || job.payment_status === 'processing')
      .reduce((sum, job) => sum + (job.amount_collected || 0), 0),
    [completedJobs]
  );

  // Fee breakdown calculation for GoCardless payments
  const feeBreakdown = useMemo(() => {
    const gocardlessJobs = completedJobs.filter(
      job => job.payment_method === 'gocardless' && job.payment_status === 'paid'
    );
    
    const grossTotal = gocardlessJobs.reduce((sum, job) => sum + (job.amount_collected || 0), 0);
    const platformFeeTotal = gocardlessJobs.reduce((sum, job) => sum + (job.platform_fee || 0), 0);
    const gocardlessFeeTotal = gocardlessJobs.reduce((sum, job) => sum + (job.gocardless_fee || 0), 0);
    const netTotal = gocardlessJobs.reduce((sum, job) => sum + (job.net_amount || 0), 0);
    
    // Fallback calculation if fees not stored (for old payments)
    const fallbackGross = gocardlessJobs.reduce((sum, job) => {
      if (job.platform_fee === null && job.amount_collected) {
        return sum + job.amount_collected;
      }
      return sum;
    }, 0);
    
    // If we have stored fees, use them; otherwise calculate
    const totalPlatformFee = platformFeeTotal > 0 ? platformFeeTotal : 
      gocardlessJobs.reduce((sum, job) => {
        if (job.platform_fee === null && job.amount_collected) {
          return sum + ((job.amount_collected * 0.0075) + 0.30);
        }
        return sum + (job.platform_fee || 0);
      }, 0);
    
    const totalGoCardlessFee = gocardlessFeeTotal > 0 ? gocardlessFeeTotal :
      gocardlessJobs.reduce((sum, job) => {
        if (job.gocardless_fee === null && job.amount_collected) {
          return sum + Math.min((job.amount_collected * 0.01) + 0.20, 4.00);
        }
        return sum + (job.gocardless_fee || 0);
      }, 0);
    
    const calculatedNet = grossTotal - totalPlatformFee - totalGoCardlessFee;
    const finalNet = netTotal > 0 ? netTotal : calculatedNet;
    
    return {
      grossTotal: grossTotal || fallbackGross,
      platformFeeTotal: totalPlatformFee,
      gocardlessFeeTotal: totalGoCardlessFee,
      netTotal: finalNet,
      gocardlessJobCount: gocardlessJobs.length,
      totalFees: totalPlatformFee + totalGoCardlessFee,
    };
  }, [completedJobs]);

  // Income Mix calculation (Cash vs Transfer vs Direct Debit)
  const incomeMix = useMemo(() => {
    const paidJobs = completedJobs.filter(job => job.payment_status === 'paid');
    const cash = paidJobs
      .filter(job => job.payment_method?.toLowerCase() === 'cash')
      .reduce((sum, job) => sum + (job.amount_collected || 0), 0);
    const transfer = paidJobs
      .filter(job => job.payment_method?.toLowerCase() === 'transfer' || job.payment_method?.toLowerCase() === 'bank transfer' || job.payment_method?.toLowerCase() === 'bank')
      .reduce((sum, job) => sum + (job.amount_collected || 0), 0);
    const directDebit = paidJobs
      .filter(job => {
        const method = job.payment_method?.toLowerCase() || '';
        return method.includes('direct debit') || method.includes('dd') || method.includes('gocardless');
      })
      .reduce((sum, job) => sum + (job.amount_collected || 0), 0);
    
    const total = cash + transfer + directDebit;
    return {
      cash,
      transfer,
      directDebit,
      total,
      cashPercent: total > 0 ? (cash / total) * 100 : 0,
      transferPercent: total > 0 ? (transfer / total) * 100 : 0,
      directDebitPercent: total > 0 ? (directDebit / total) * 100 : 0,
    };
  }, [completedJobs]);

  // Projected earnings for current month based on upcoming scheduled jobs
  const projectedEarnings = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Get upcoming jobs for the rest of this month
    const remainingJobsThisMonth = upcomingJobs.filter(job => {
      const jobDate = new Date(job.scheduled_date);
      return jobDate >= now && jobDate <= monthEnd;
    });
    
    const projected = remainingJobsThisMonth.reduce((sum, job) => {
      return sum + (job.customer?.price || 0);
    }, 0);
    
    // Actual earnings for this month so far
    const actualThisMonth = completedJobs
      .filter(job => {
        if (!job.completed_at) return false;
        const completedDate = new Date(job.completed_at);
        return completedDate >= monthStart && completedDate <= now;
      })
      .reduce((sum, job) => sum + (job.amount_collected || 0), 0);
    
    return {
      projected,
      actual: actualThisMonth,
      total: actualThisMonth + projected,
      onTrack: projected > 0,
    };
  }, [upcomingJobs, completedJobs]);

  const handleMarkPaid = (job: JobWithCustomer) => {
    setSelectedJob(job);
    setIsMarkPaidOpen(true);
  };

  const handleConfirmPaid = async (method: 'cash' | 'transfer') => {
    if (!selectedJob) return;
    await markJobPaid(selectedJob.id, method);
    setIsMarkPaidOpen(false);
    setSelectedJob(null);
  };

  const toggleCustomerExpanded = (customerId: string) => {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const handleExportCSV = () => {
    // Filter jobs for export based on includeArchivedForExport toggle
    const jobsToExport = includeArchivedForExport 
      ? filteredJobs 
      : filteredJobs.filter(job => !job.customer?.is_archived);
    
    if (jobsToExport.length === 0) {
      toast({
        title: 'No data to export',
        description: includeArchivedForExport 
          ? 'No jobs found for export.' 
          : 'No jobs found. Try enabling "Include Archived" to export jobs from archived customers.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Customer', 'Address', 'Date', 'Gross Amount', 'Payment Status', 'Payment Method', 'Platform Fee', 'GoCardless Fee', 'Net Amount'];
    const rows = jobsToExport.map(job => {
      const isGoCardless = job.payment_method === 'gocardless';
      const grossAmount = job.amount_collected || 0;
      const platformFee = job.platform_fee ?? (isGoCardless ? (grossAmount * 0.0075) + 0.30 : 0);
      const gocardlessFee = job.gocardless_fee ?? (isGoCardless ? Math.min((grossAmount * 0.01) + 0.20, 4.00) : 0);
      const netAmount = job.net_amount ?? (isGoCardless ? grossAmount - platformFee - gocardlessFee : grossAmount);
      
      return [
        job.customer.name,
        job.customer.address,
        job.completed_at ? format(new Date(job.completed_at), 'dd/MM/yyyy') : '',
        grossAmount.toFixed(2),
        job.payment_status,
        job.payment_method || '',
        platformFee.toFixed(2),
        gocardlessFee.toFixed(2),
        netAmount.toFixed(2),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const rangeLabel = dateRangeOptions.find(o => o.value === dateRange)?.label || dateRange;
    const filename = `Completed_Jobs_${rangeLabel.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    downloadCSV(csvContent, filename);
    
    toast({
      title: 'Export complete',
      description: `Exported ${jobsToExport.length} job${jobsToExport.length !== 1 ? 's' : ''} to CSV.`,
    });
  };

  const isLoading = baseLoading || jobsLoading;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={false} title="Earnings" />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <LoadingState type="skeleton" skeletonType="earnings" />
        ) : (
          <>
            {/* Quick Time Toggles */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
            >
              {dateRangeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = dateRange === option.value;
                return (
                  <motion.button
                    key={option.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setDateRange(option.value)}
                    className={cn(
                      "flex-1 min-w-[80px] px-3 py-2.5 rounded-xl touch-sm transition-all",
                      "flex flex-col items-center gap-1.5",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card border border-border text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-semibold", isActive ? "text-primary-foreground" : "text-foreground")}>
                      {option.label}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Period Earnings Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <EarningsCard 
                amount={dateRange === 'today' ? todayEarnings : periodEarnings} 
                label={`Total Earned ${dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : dateRange === 'month' ? 'This Month' : 'This Year'}`} 
              />
            </motion.div>

            {/* Fee Breakdown for GoCardless Payments */}
            {feeBreakdown.gocardlessJobCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mt-4 bg-card rounded-xl border border-border shadow-sm p-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Direct Debit Fee Breakdown</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Gross (DD payments)</span>
                    <span className="text-base font-semibold text-foreground">£{feeBreakdown.grossTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Platform Fee (0.75% + 30p)</span>
                    <span className="text-sm font-medium text-destructive">-£{feeBreakdown.platformFeeTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">GoCardless Fee</span>
                    <span className="text-sm font-medium text-destructive">-£{feeBreakdown.gocardlessFeeTotal.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-foreground">Net Payout</span>
                      <span className="text-xl font-bold text-success">£{feeBreakdown.netTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{feeBreakdown.gocardlessJobCount} Direct Debit payment{feeBreakdown.gocardlessJobCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Projected vs Actual (for month view) */}
            {dateRange === 'month' && projectedEarnings.onTrack && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 bg-card rounded-xl border border-border shadow-sm p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Monthly Projection</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Actual</p>
                    <p className="text-lg font-bold text-foreground">£{projectedEarnings.actual.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Projected</p>
                    <p className="text-lg font-bold text-primary">£{projectedEarnings.projected.toFixed(0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-lg font-bold text-success">£{projectedEarnings.total.toFixed(0)}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Collection Progress - Enhanced with Link to Unpaid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 bg-card rounded-xl border border-border shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Collection Progress</span>
                <span className="text-sm font-bold text-muted-foreground">
                  {periodEarnings > 0 ? Math.round((paidTotal / periodEarnings) * 100) : 0}% collected
                </span>
              </div>
              
              {/* Progress Bar - Enhanced */}
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: periodEarnings > 0 ? `${(paidTotal / periodEarnings) * 100}%` : '0%' }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-success to-green-400 dark:from-success dark:to-green-500 rounded-full"
                />
              </div>

              {/* Summary Row - Enhanced */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-success flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold text-success dark:text-success">£{paidTotal.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {completedJobs.filter(j => j.payment_status === 'paid').length} paid
                    </p>
                  </div>
                </div>
                {unpaidTotal > 0 ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/money')}
                    className="flex items-center gap-3 text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                  >
                    <div className="w-4 h-4 rounded-full bg-warning flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xl font-bold text-warning dark:text-warning">£{unpaidTotal.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {unpaidCount} unpaid <span className="text-primary font-medium">→ Tap to collect</span>
                      </p>
                    </div>
                  </motion.button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-muted flex-shrink-0" />
                    <div>
                      <p className="text-xl font-bold text-muted-foreground">£0.00</p>
                      <p className="text-xs text-muted-foreground">All collected</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Income Mix Visualization */}
            {incomeMix.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 bg-card rounded-xl border border-border shadow-sm p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-foreground">Income Mix</span>
                  <span className="text-xs text-muted-foreground">Paid jobs only</span>
                </div>
                
                {/* Progress Pills */}
                <div className="flex gap-2 mb-4 h-8 rounded-full overflow-hidden bg-muted/50">
                  {incomeMix.cash > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${incomeMix.cashPercent}%` }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                      className="bg-green-500 dark:bg-green-600 flex items-center justify-center"
                    >
                      <span className="text-xs font-bold text-white px-2 truncate">Cash</span>
                    </motion.div>
                  )}
                  {incomeMix.transfer > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${incomeMix.transferPercent}%` }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="bg-blue-500 dark:bg-blue-600 flex items-center justify-center"
                    >
                      <span className="text-xs font-bold text-white px-2 truncate">Transfer</span>
                    </motion.div>
                  )}
                  {incomeMix.directDebit > 0 && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${incomeMix.directDebitPercent}%` }}
                      transition={{ duration: 0.6, delay: 0.5 }}
                      className="bg-primary dark:bg-primary flex items-center justify-center"
                    >
                      <span className="text-xs font-bold text-white px-2 truncate">DD</span>
                    </motion.div>
                  )}
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {incomeMix.cash > 0 && (
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Banknote className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-semibold text-green-700 dark:text-green-400">Cash</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">£{incomeMix.cash.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">{incomeMix.cashPercent.toFixed(0)}%</p>
                    </div>
                  )}
                  {incomeMix.transfer > 0 && (
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Transfer</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">£{incomeMix.transfer.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">{incomeMix.transferPercent.toFixed(0)}%</p>
                    </div>
                  )}
                  {incomeMix.directDebit > 0 && (
                    <div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Direct Debit</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">£{incomeMix.directDebit.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">{incomeMix.directDebitPercent.toFixed(0)}%</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Monthly Chart - Expandable */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <Collapsible open={monthlyOverviewExpanded} onOpenChange={setMonthlyOverviewExpanded}>
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <h3 className="text-sm font-semibold text-foreground">6 Month Overview</h3>
                        <p className="text-xs text-muted-foreground">
                          {monthlyOverviewExpanded ? 'Tap to collapse' : 'Tap to expand'}
                        </p>
                      </div>
                    </div>
                    {monthlyOverviewExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <MonthlyEarningsChart />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </motion.div>

            {/* Weekly Summary - Only show for week view */}
            {dateRange === 'week' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-6"
              >
                <WeeklyEarningsSummary weeks={weeklyEarnings} />
              </motion.div>
            )}

            {/* Recent Completions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Completed Jobs
                </h2>
                {filteredJobs.length > 0 && (
                  <span className="text-sm text-muted-foreground font-medium">
                    {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
                  </span>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 h-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filters Row - Simplified */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">

                <Toggle
                  pressed={groupByCustomer}
                  onPressedChange={setGroupByCustomer}
                  size="sm"
                  className="gap-1.5 h-9 touch-sm data-[state=on]:bg-primary/15 dark:data-[state=on]:bg-primary/25 data-[state=on]:text-primary dark:data-[state=on]:text-primary border border-primary/30 dark:border-primary/40"
                >
                  {groupByCustomer ? <Users className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                  {groupByCustomer ? 'Grouped' : 'List'}
                </Toggle>

                {unpaidCount > 0 && (
                  <Toggle
                    pressed={showUnpaidOnly}
                    onPressedChange={setShowUnpaidOnly}
                    size="sm"
                    className="gap-1.5 h-9 touch-sm data-[state=on]:bg-warning/15 dark:data-[state=on]:bg-warning/25 data-[state=on]:text-warning dark:data-[state=on]:text-warning border border-warning/30 dark:border-warning/40"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Unpaid ({unpaidCount})
                  </Toggle>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-9 gap-1.5 touch-sm"
                  onClick={() => handleExportCSV()}
                  disabled={filteredJobs.length === 0}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="text-sm">Export</span>
                </Button>
              </div>

              {/* Include Archived Toggle for Export - Compact */}
              {filteredJobs.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-muted/30 dark:bg-muted/50 rounded-lg mb-4 border border-border/50">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="include-archived-earnings" className="text-sm font-medium text-foreground cursor-pointer">
                      Include Archived
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      Include archived customers in export
                    </p>
                  </div>
                  <Switch
                    id="include-archived-earnings"
                    checked={includeArchivedForExport}
                    onCheckedChange={setIncludeArchivedForExport}
                  />
                </div>
              )}

              {filteredJobs.length > 0 ? (
                groupByCustomer ? (
                  <div className="space-y-3">
                    {groupedByCustomer.map((group, groupIndex) => (
                      <Collapsible
                        key={group.customerId}
                        open={expandedCustomers.has(group.customerId)}
                        onOpenChange={() => toggleCustomerExpanded(group.customerId)}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: groupIndex * 0.05 }}
                          className="bg-card rounded-xl border border-border overflow-hidden"
                        >
                          <CollapsibleTrigger className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="font-medium text-foreground truncate">
                                {group.customerName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {group.jobs.length} {group.jobs.length === 1 ? 'job' : 'jobs'}
                                {group.unpaidAmount > 0 && (
                                  <span className="text-amber-600 ml-2">
                                    (£{group.unpaidAmount.toFixed(2)} unpaid)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-2">
                              <p className="font-bold text-accent">
                                £{group.totalAmount.toFixed(2)}
                              </p>
                              <ChevronDown className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform",
                                expandedCustomers.has(group.customerId) && "rotate-180"
                              )} />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t border-border px-4 py-3 space-y-2 bg-muted/30">
                              {group.jobs.map((job, index) => (
                                <CompletedJobItem 
                                  key={job.id} 
                                  job={job} 
                                  index={index}
                                  businessName={businessName}
                                  onMarkPaid={handleMarkPaid}
                                  isProcessing={isMarkingPaid}
                                />
                              ))}
                            </div>
                          </CollapsibleContent>
                        </motion.div>
                      </Collapsible>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredJobs.map((job, index) => (
                      <CompletedJobItem 
                        key={job.id} 
                        job={job} 
                        index={index}
                        onMarkPaid={handleMarkPaid}
                        isProcessing={isMarkingPaid}
                      />
                    ))}
                  </div>
                )
              ) : (
                <EmptyState
                  title={showUnpaidOnly ? "No unpaid jobs" : "No jobs completed"}
                  description={showUnpaidOnly ? "All jobs in this period have been paid" : "No completed jobs in the selected time period"}
                  icon={<PoundSterling className="w-8 h-8 text-accent" />}
                />
              )}
            </motion.div>
          </>
        )}
      </main>

      <MarkPaidModal
        isOpen={isMarkPaidOpen}
        job={selectedJob}
        onClose={() => !isMarkingPaid && setIsMarkPaidOpen(false)}
        onConfirm={handleConfirmPaid}
      />
    </div>
  );
};

export default Earnings;