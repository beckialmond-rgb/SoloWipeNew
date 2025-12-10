import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/EmptyState';
import { useDemoData } from '@/hooks/useDemoData';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';

const Index = () => {
  const { pendingJobs, completeJob } = useDemoData();
  const { toast } = useToast();
  const [localJobs, setLocalJobs] = useState(pendingJobs);

  const handleCompleteJob = (jobId: string) => {
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22C55E', '#007AFF', '#FFD700'],
    });

    const result = completeJob(jobId);
    
    if (result) {
      // Update local state immediately
      setLocalJobs(prev => prev.filter(job => job.id !== jobId));
      
      toast({
        title: `£${result.collectedAmount} Collected!`,
        description: `Next clean: ${result.nextDate}`,
        duration: 3000,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {/* Jobs count badge */}
        {localJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {localJobs.length}
              </span>
              <span className="font-medium text-sm">
                {localJobs.length === 1 ? 'job' : 'jobs'} today
              </span>
            </div>
          </motion.div>
        )}

        {/* Jobs list */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {localJobs.map((job, index) => (
              <JobCard
                key={job.id}
                job={job}
                onComplete={handleCompleteJob}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {localJobs.length === 0 && (
          <EmptyState
            title="All done for today!"
            description="Great work! You've completed all your scheduled jobs."
            icon={<Sparkles className="w-8 h-8 text-accent" />}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
