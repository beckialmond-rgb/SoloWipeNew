import { useState, useMemo } from 'react';
import { PoundSterling, Filter, Calendar } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, subMonths } from 'date-fns';
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

const Earnings = () => {
  const { user } = useAuth();
  const { todayEarnings, weeklyEarnings, markJobPaid, isLoading: baseLoading } = useSupabaseData();
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');

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
    if (!showUnpaidOnly) return completedJobs;
    return completedJobs.filter(job => job.payment_status === 'unpaid');
  }, [completedJobs, showUnpaidOnly]);

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
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Paid</span>
                </div>
                <p className="text-xl font-bold text-green-600">
                  £{paidTotal.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedJobs.filter(j => j.payment_status === 'paid').length} jobs
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-muted-foreground">Unpaid</span>
                </div>
                <p className="text-xl font-bold text-amber-600">
                  £{unpaidTotal.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unpaidCount} jobs
                </p>
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

              {/* Filters Row */}
              <div className="flex items-center gap-2 mb-4">
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

                {unpaidCount > 0 && (
                  <Toggle
                    pressed={showUnpaidOnly}
                    onPressedChange={setShowUnpaidOnly}
                    size="sm"
                    className="gap-1.5 h-9 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Unpaid ({unpaidCount})
                  </Toggle>
                )}

                <div className="ml-auto text-sm text-muted-foreground">
                  £{periodEarnings.toFixed(2)}
                </div>
              </div>

              {filteredJobs.length > 0 ? (
                <div className="space-y-3">
                  {filteredJobs.map((job, index) => (
                    <CompletedJobItem 
                      key={job.id} 
                      job={job} 
                      index={index}
                      onMarkPaid={handleMarkPaid}
                    />
                  ))}
                </div>
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
        onClose={() => setIsMarkPaidOpen(false)}
        onConfirm={handleConfirmPaid}
      />
    </div>
  );
};

export default Earnings;