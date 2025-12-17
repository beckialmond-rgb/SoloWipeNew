import { useState, useMemo } from 'react';
import { PoundSterling, Filter, Calendar, Users, List, Download, Search, X } from 'lucide-react';
import { format, startOfWeek, startOfMonth, subMonths } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Customer } from '@/types/database';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { downloadCSV } from '@/utils/exportCSV';
import { toast } from '@/hooks/use-toast';

type DateRange = 'today' | 'week' | 'month' | '3months';

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '3months', label: 'Last 3 Months' },
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
    case '3months':
      return format(subMonths(now, 3), 'yyyy-MM-dd');
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
  const { todayEarnings, weeklyEarnings, markJobPaid, isLoading: baseLoading, isMarkingPaid } = useSupabaseData();
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const startDate = getDateRangeStart(dateRange);

  const { data: completedJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['completedJobsRange', user?.id, startDate],
    queryFn: async () => {
      if (!user) return [];
      
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
      jobs = jobs.filter(job => job.payment_status === 'unpaid');
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
        if (job.payment_status === 'unpaid') {
          existing.unpaidAmount += job.amount_collected || 0;
        }
      } else {
        groups.set(job.customer_id, {
          customerId: job.customer_id,
          customerName: job.customer.name,
          customerAddress: job.customer.address,
          jobs: [job],
          totalAmount: job.amount_collected || 0,
          unpaidAmount: job.payment_status === 'unpaid' ? (job.amount_collected || 0) : 0,
        });
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredJobs]);

  const unpaidCount = useMemo(() => 
    completedJobs.filter(job => job.payment_status === 'unpaid').length,
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
      .filter(job => job.payment_status === 'unpaid')
      .reduce((sum, job) => sum + (job.amount_collected || 0), 0),
    [completedJobs]
  );

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
    if (filteredJobs.length === 0) return;

    const headers = ['Customer', 'Address', 'Date', 'Amount', 'Payment Status', 'Payment Method'];
    const rows = filteredJobs.map(job => [
      job.customer.name,
      job.customer.address,
      job.completed_at ? format(new Date(job.completed_at), 'dd/MM/yyyy') : '',
      (job.amount_collected || 0).toFixed(2),
      job.payment_status,
      job.payment_method || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const rangeLabel = dateRangeOptions.find(o => o.value === dateRange)?.label || dateRange;
    const filename = `Completed_Jobs_${rangeLabel.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    
    downloadCSV(csvContent, filename);
    
    toast({
      title: 'Export complete',
      description: `Exported ${filteredJobs.length} jobs to CSV.`,
    });
  };

  const isLoading = baseLoading || jobsLoading;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={false} title="Earnings" />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <LoadingState message="Loading earnings..." />
        ) : (
          <>
            {/* Today's Earnings Card */}
            <EarningsCard amount={todayEarnings} label="Total Earned Today" />

            {/* Paid vs Unpaid Summary */}
            <div className="mt-4 bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Collection Progress</span>
                <span className="text-sm text-muted-foreground">
                  {periodEarnings > 0 ? Math.round((paidTotal / periodEarnings) * 100) : 0}% collected
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="h-3 bg-muted rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: periodEarnings > 0 ? `${(paidTotal / periodEarnings) * 100}%` : '0%' }}
                />
              </div>

              {/* Summary Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <p className="text-lg font-bold text-green-600">£{paidTotal.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {completedJobs.filter(j => j.payment_status === 'paid').length} paid
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-lg font-bold text-amber-600">£{unpaidTotal.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {unpaidCount} unpaid
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Chart */}
            <div className="mt-6">
              <MonthlyEarningsChart />
            </div>

            {/* Weekly Summary */}
            <div className="mt-6">
              <WeeklyEarningsSummary weeks={weeklyEarnings} />
            </div>

            {/* Recent Completions */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Completed Jobs
                </h2>
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

              {/* Filters Row */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Toggle
                  pressed={groupByCustomer}
                  onPressedChange={setGroupByCustomer}
                  size="sm"
                  className="gap-1.5 h-9 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  {groupByCustomer ? <Users className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                  {groupByCustomer ? 'Grouped' : 'List'}
                </Toggle>

                {unpaidCount > 0 && (
                  <Toggle
                    pressed={showUnpaidOnly}
                    onPressedChange={setShowUnpaidOnly}
                    size="sm"
                    className="gap-1.5 h-9 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Unpaid
                  </Toggle>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-9 gap-1.5"
                  onClick={() => handleExportCSV()}
                  disabled={filteredJobs.length === 0}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </Button>
              </div>

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
            </div>
          </>
        )}
      </main>

      <BottomNav />

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