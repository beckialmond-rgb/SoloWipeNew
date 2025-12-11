import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { JobCard } from '@/components/JobCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UpcomingJobsSection } from '@/components/UpcomingJobsSection';
import { RescheduleJobModal } from '@/components/RescheduleJobModal';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';
import { JobWithCustomer } from '@/types/database';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Index = () => {
  const { pendingJobs, upcomingJobs, completeJob, rescheduleJob, skipJob, isLoading } = useSupabaseData();
  const { toast } = useToast();
  const [localJobs, setLocalJobs] = useState<JobWithCustomer[]>([]);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [jobToSkip, setJobToSkip] = useState<JobWithCustomer | null>(null);

  // Sync local jobs with fetched pending jobs
  useEffect(() => {
    setLocalJobs(pendingJobs);
  }, [pendingJobs]);

  const handleCompleteJob = async (jobId: string) => {
    if (completingJobId) return; // Prevent double-clicks
    
    setCompletingJobId(jobId);

    // Fire confetti immediately for responsiveness
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22C55E', '#007AFF', '#FFD700'],
    });

    // Optimistically remove from local state
    setLocalJobs(prev => prev.filter(job => job.id !== jobId));

    try {
      const result = await completeJob(jobId);
      
      toast({
        title: `£${result.collectedAmount} Collected!`,
        description: `Next clean: ${result.nextDate}`,
        duration: 3000,
      });
    } catch (error) {
      // Rollback on error
      setLocalJobs(pendingJobs);
      toast({
        title: 'Error',
        description: 'Failed to complete job. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCompletingJobId(null);
    }
  };

  const handleSkipRequest = (job: JobWithCustomer) => {
    setJobToSkip(job);
    setSkipConfirmOpen(true);
  };

  const handleSkipRequestById = (jobId: string) => {
    const job = localJobs.find(j => j.id === jobId);
    if (job) {
      handleSkipRequest(job);
    }
  };

  const handleConfirmSkip = async () => {
    if (!jobToSkip) return;
    
    const jobId = jobToSkip.id;
    setSkipConfirmOpen(false);
    
    // Optimistically remove from local state
    setLocalJobs(prev => prev.filter(job => job.id !== jobId));
    
    try {
      await skipJob(jobId);
    } catch (error) {
      // Rollback on error
      setLocalJobs(pendingJobs);
    } finally {
      setJobToSkip(null);
    }
  };

  const handleJobClick = (job: JobWithCustomer) => {
    setSelectedJob(job);
    setRescheduleModalOpen(true);
  };

  const handleReschedule = async (jobId: string, newDate: string) => {
    await rescheduleJob(jobId, newDate);
    setSelectedJob(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo />

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <LoadingState message="Loading your jobs..." />
        ) : (
          <>
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
                    onSkip={handleSkipRequestById}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Empty state for today */}
            {localJobs.length === 0 && (
              <EmptyState
                title="All done for today!"
                description="Great work! You've completed all your scheduled jobs."
                icon={<Sparkles className="w-8 h-8 text-accent" />}
              />
            )}

            {/* Upcoming Jobs Section */}
            <UpcomingJobsSection jobs={upcomingJobs} onJobClick={handleJobClick} onSkip={handleSkipRequest} />
          </>
        )}
      </main>

      <RescheduleJobModal
        job={selectedJob}
        open={rescheduleModalOpen}
        onOpenChange={setRescheduleModalOpen}
        onReschedule={handleReschedule}
      />

      <AlertDialog open={skipConfirmOpen} onOpenChange={setSkipConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this job?</AlertDialogTitle>
            <AlertDialogDescription>
              {jobToSkip && (
                <>
                  This will reschedule <strong>{jobToSkip.customer.name}</strong> at{' '}
                  <strong>{jobToSkip.customer.address}</strong> to the next scheduled interval 
                  ({jobToSkip.customer.frequency_weeks} weeks from today).
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSkip}>Skip Job</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default Index;
