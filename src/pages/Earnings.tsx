import { useState, useMemo } from 'react';
import { PoundSterling, Filter } from 'lucide-react';
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

const Earnings = () => {
  const { completedToday, todayEarnings, weeklyEarnings, markJobPaid, isLoading } = useSupabaseData();
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);

  const filteredJobs = useMemo(() => {
    if (!showUnpaidOnly) return completedToday;
    return completedToday.filter(job => job.payment_status === 'unpaid');
  }, [completedToday, showUnpaidOnly]);

  const unpaidCount = useMemo(() => 
    completedToday.filter(job => job.payment_status === 'unpaid').length,
    [completedToday]
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={false} title="Earnings" />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <LoadingState message="Loading earnings..." />
        ) : (
          <>
            {/* Total Earnings Card */}
            <EarningsCard amount={todayEarnings} label="Total Earned Today" />

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
                  Recent Completions
                </h2>
                {unpaidCount > 0 && (
                  <Toggle
                    pressed={showUnpaidOnly}
                    onPressedChange={setShowUnpaidOnly}
                    size="sm"
                    className="gap-1.5 data-[state=on]:bg-amber-100 data-[state=on]:text-amber-700"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Unpaid ({unpaidCount})
                  </Toggle>
                )}
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
                  title={showUnpaidOnly ? "No unpaid jobs" : "No jobs completed yet"}
                  description={showUnpaidOnly ? "All recent jobs have been paid" : "Complete jobs from the Today tab to see your earnings here"}
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