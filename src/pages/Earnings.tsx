import { PoundSterling } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { EarningsCard } from '@/components/EarningsCard';
import { CompletedJobItem } from '@/components/CompletedJobItem';
import { EmptyState } from '@/components/EmptyState';
import { useDemoData } from '@/hooks/useDemoData';

const Earnings = () => {
  const { completedToday, todayEarnings } = useDemoData();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo={false} title="Earnings" />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {/* Total Earnings Card */}
        <EarningsCard amount={todayEarnings} label="Total Earned Today" />

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
      </main>

      <BottomNav />
    </div>
  );
};

export default Earnings;
