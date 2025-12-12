import { useState } from 'react';
import { PoundSterling } from 'lucide-react';
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

const Earnings = () => {
  const { completedToday, todayEarnings, weeklyEarnings, markJobPaid, isLoading } = useSupabaseData();
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);

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
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Recent Completions
              </h2>

              {completedToday.length > 0 ? (
                <div className="space-y-3">
                  {completedToday.map((job, index) => (
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
                  title="No jobs completed yet"
                  description="Complete jobs from the Today tab to see your earnings here"
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