import { PoundSterling } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EarningsCard } from '@/components/EarningsCard';
import { CompletedJobItem } from '@/components/CompletedJobItem';
import { WeeklyEarningsSummary } from '@/components/WeeklyEarningsSummary';
import { MonthlyEarningsChart } from '@/components/MonthlyEarningsChart';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { useSupabaseData } from '@/hooks/useSupabaseData';

const Earnings = () => {
  const { completedToday, todayEarnings, weeklyEarnings, isLoading } = useSupabaseData();

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
                    <CompletedJobItem key={job.id} job={job} index={index} />
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
    </div>
  );
};

export default Earnings;
