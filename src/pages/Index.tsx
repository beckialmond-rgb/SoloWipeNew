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
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Sparkles, SkipForward, CheckCircle, PoundSterling, Clock, RefreshCw } from 'lucide-react';
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
import { Button } from '@/components/ui/button';

const Index = () => {
  const { pendingJobs, upcomingJobs, completedToday, todayEarnings, completeJob, rescheduleJob, skipJob, refetchAll, isLoading } = useSupabaseData();
  const { toast } = useToast();
  const [localJobs, setLocalJobs] = useState<JobWithCustomer[]>([]);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [jobToSkip, setJobToSkip] = useState<JobWithCustomer | null>(null);
  const [skipAllConfirmOpen, setSkipAllConfirmOpen] = useState(false);
  const [isSkippingAll, setIsSkippingAll] = useState(false);

  // Pull to refresh
  const { isPulling, isRefreshing, pullDistance, handlers } = usePullToRefresh({
    onRefresh: async () => {
      await refetchAll();
      toast({
        title: 'Refreshed',
        description: 'Jobs updated',
        duration: 2000,
      });
    },
  });

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

  const handleSkipAllRequest = () => {
    if (localJobs.length > 0) {
      setSkipAllConfirmOpen(true);
    }
  };

  const handleConfirmSkipAll = async () => {
    if (localJobs.length === 0) return;
    
    setSkipAllConfirmOpen(false);
    setIsSkippingAll(true);
    
    const jobsToSkip = [...localJobs];
    
    // Optimistically clear local state
    setLocalJobs([]);
    
    try {
      // Skip all jobs in sequence
      for (const job of jobsToSkip) {
        await skipJob(job.id);
      }
      
      toast({
        title: 'All jobs skipped',
        description: `${jobsToSkip.length} jobs rescheduled to their next intervals.`,
      });
    } catch (error) {
      // Rollback on error
      setLocalJobs(pendingJobs);
      toast({
        title: 'Error',
        description: 'Failed to skip some jobs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSkippingAll(false);
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
    <div 
      className="min-h-screen bg-background pb-20"
      {...handlers}
    >
      <Header showLogo />

      {/* Pull to refresh indicator */}
      <motion.div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: pullDistance }}
        animate={{ height: isRefreshing ? 60 : pullDistance }}
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : 0 }}
          transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
        >
          <RefreshCw 
            className={`w-6 h-6 ${pullDistance >= 80 || isRefreshing ? 'text-primary' : 'text-muted-foreground'}`} 
          />
        </motion.div>
        {(isPulling || isRefreshing) && (
          <span className="ml-2 text-sm text-muted-foreground">
            {isRefreshing ? 'Refreshing...' : pullDistance >= 80 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        )}
      </motion.div>

      <main className="px-4 py-6 max-w-lg mx-auto">
        {isLoading ? (
          <LoadingState message="Loading your jobs..." />
        ) : (
          <>
            {/* Today's Stats Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border p-4 mb-6"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{localJobs.length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{completedToday.length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-2">
                    <PoundSterling className="w-5 h-5 text-accent" />
                  </div>
                  <p className="text-2xl font-bold text-accent">£{todayEarnings}</p>
                  <p className="text-xs text-muted-foreground">Earned</p>
                </div>
              </div>
            </motion.div>
            {/* Jobs count badge and Skip All button */}
            {localJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center justify-between"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {localJobs.length}
                  </span>
                  <span className="font-medium text-sm">
                    {localJobs.length === 1 ? 'job' : 'jobs'} today
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSkipAllRequest}
                  disabled={isSkippingAll}
                  className="gap-1.5"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip All
                </Button>
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

      <AlertDialog open={skipAllConfirmOpen} onOpenChange={setSkipAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip all jobs for today?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reschedule all {localJobs.length} pending {localJobs.length === 1 ? 'job' : 'jobs'} to their 
              next scheduled intervals based on each customer's frequency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSkipAll}>Skip All Jobs</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default Index;
