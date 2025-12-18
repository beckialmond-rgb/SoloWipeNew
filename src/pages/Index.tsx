import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { JobCard } from '@/components/JobCard';
import { CompletedJobItem } from '@/components/CompletedJobItem';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UpcomingJobsSection } from '@/components/UpcomingJobsSection';
import { RescheduleJobModal } from '@/components/RescheduleJobModal';
import { JobNotesModal } from '@/components/JobNotesModal';
import { OnMyWayButton } from '@/components/OnMyWayButton';
import { QuickAddCustomerModal } from '@/components/QuickAddCustomerModal';
import { WelcomeFlow } from '@/components/WelcomeFlow';
import { WelcomeTour, useWelcomeTour } from '@/components/WelcomeTour';
import { AskForReviewButton } from '@/components/AskForReviewButton';
import { PriceAdjustModal } from '@/components/PriceAdjustModal';
import { PhotoCaptureModal } from '@/components/PhotoCaptureModal';
import { OptimizeRouteButton } from '@/components/OptimizeRouteButton';
import { MarkPaidModal } from '@/components/MarkPaidModal';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useJobReminders } from '@/hooks/useJobReminders';
import { useHaptics } from '@/hooks/useHaptics';
import { syncStatus } from '@/lib/offlineStorage';
import { Sparkles, SkipForward, CheckCircle, PoundSterling, Clock, RefreshCw, ChevronDown, UserPlus, Navigation, X, Gift, CreditCard, AlertTriangle } from 'lucide-react';
import { JobWithCustomer } from '@/types/database';
import { ToastAction } from '@/components/ui/toast';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const Index = () => {
  const navigate = useNavigate();
  const { pendingJobs, upcomingJobs, completedToday, todayEarnings, customers, businessName, completeJob, rescheduleJob, skipJob, updateJobNotes, undoCompleteJob, undoSkipJob, addCustomer, refetchAll, isLoading, markJobPaid, profile, isMarkingPaid } = useSupabaseData();
  const { user } = useAuth();
  const { subscribed, status } = useSubscription();
  const { toast, dismiss } = useToast();
  const { showTour, completeTour } = useWelcomeTour();
  const { success } = useHaptics();
  
  // Calculate grace period for trial banner
  const gracePeriodDaysRemaining = user?.created_at 
    ? Math.max(0, 7 - differenceInDays(new Date(), new Date(user.created_at)))
    : 0;
  const isInGracePeriod = !subscribed && status !== 'trialing' && gracePeriodDaysRemaining > 0;
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(() => {
    return localStorage.getItem('solowipe_trial_banner_dismissed') === 'true';
  });
  const [ddPromptDismissed, setDdPromptDismissed] = useState(() => {
    return localStorage.getItem('solowipe_dd_prompt_dismissed') === 'true';
  });

  const handleDismissDdPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDdPromptDismissed(true);
    localStorage.setItem('solowipe_dd_prompt_dismissed', 'true');
  };
  
  // Enable job reminders for upcoming jobs
  const allUpcomingJobs = [...pendingJobs, ...upcomingJobs];
  useJobReminders(allUpcomingJobs);
  const [localJobs, setLocalJobs] = useState<JobWithCustomer[]>([]);
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [jobToSkip, setJobToSkip] = useState<JobWithCustomer | null>(null);
  const [skipAllConfirmOpen, setSkipAllConfirmOpen] = useState(false);
  const [isSkippingAll, setIsSkippingAll] = useState(false);
  const [notesJob, setNotesJob] = useState<JobWithCustomer | null>(null);
  const [completedOpen, setCompletedOpen] = useState(true);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [jobToComplete, setJobToComplete] = useState<JobWithCustomer | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [priceAdjustOpen, setPriceAdjustOpen] = useState(false);
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false);
  const [jobToMarkPaid, setJobToMarkPaid] = useState<JobWithCustomer | null>(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    return localStorage.getItem('solowipe_welcome_dismissed') === 'true';
  });
  
  const handleDismissTrialBanner = () => {
    setTrialBannerDismissed(true);
    localStorage.setItem('solowipe_trial_banner_dismissed', 'true');
  };

  // Pull to refresh - full cloud sync
  const { isPulling, isRefreshing, pullDistance, handlers } = usePullToRefresh({
    onRefresh: async () => {
      await refetchAll();
      syncStatus.setLastSynced(new Date().toISOString());
      success(); // Haptic feedback
      toast({
        title: 'Synced with cloud',
        description: 'All data refreshed from server',
        duration: 2000,
      });
    },
  });

  // Get today's date key for localStorage
  const todayKey = `solowipe_job_order_${format(new Date(), 'yyyy-MM-dd')}`;

  // Track if order was restored (to show toast only once)
  const [orderRestored, setOrderRestored] = useState(false);

  // Apply saved order to jobs
  const applyPersistedOrder = useCallback((jobs: JobWithCustomer[]): { jobs: JobWithCustomer[], wasRestored: boolean } => {
    const savedOrder = localStorage.getItem(todayKey);
    if (!savedOrder) return { jobs, wasRestored: false };
    
    try {
      const orderedIds: string[] = JSON.parse(savedOrder);
      const jobMap = new Map(jobs.map(job => [job.id, job]));
      const orderedJobs: JobWithCustomer[] = [];
      
      // Add jobs in saved order
      for (const id of orderedIds) {
        const job = jobMap.get(id);
        if (job) {
          orderedJobs.push(job);
          jobMap.delete(id);
        }
      }
      
      // Add any new jobs not in saved order
      for (const job of jobMap.values()) {
        orderedJobs.push(job);
      }
      
      // Only count as restored if order actually differs
      const wasRestored = orderedJobs.length > 0 && 
        orderedJobs.some((job, i) => jobs[i]?.id !== job.id);
      
      return { jobs: orderedJobs, wasRestored };
    } catch {
      return { jobs, wasRestored: false };
    }
  }, [todayKey]);

  // Save order to localStorage
  const saveJobOrder = useCallback((jobs: JobWithCustomer[]) => {
    const orderIds = jobs.map(job => job.id);
    localStorage.setItem(todayKey, JSON.stringify(orderIds));
  }, [todayKey]);

  // Handle reorder with persistence and feedback
  const handleReorder = useCallback((newOrder: JobWithCustomer[]) => {
    setLocalJobs(newOrder);
    saveJobOrder(newOrder);
    toast({
      title: 'Order saved',
      description: 'Your job order has been saved',
      duration: 1500,
    });
  }, [saveJobOrder, toast]);

  // Sync local jobs with fetched pending jobs, applying saved order
  useEffect(() => {
    const { jobs: orderedJobs, wasRestored } = applyPersistedOrder(pendingJobs);
    setLocalJobs(orderedJobs);
    
    // Show toast only once when order is restored
    // Use a more stable check to prevent duplicate toasts
    if (wasRestored && !orderRestored && pendingJobs.length > 0) {
      setOrderRestored(true);
      toast({
        title: 'Order restored',
        description: 'Your custom job order has been applied',
        duration: 2000,
      });
    }
  }, [pendingJobs, applyPersistedOrder]); // Remove toast and orderRestored from deps to prevent loops

  // Show welcome flow for new users
  useEffect(() => {
    if (!isLoading && customers.length === 0 && !welcomeDismissed) {
      setShowWelcome(true);
    }
  }, [isLoading, customers.length, welcomeDismissed]);

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    setWelcomeDismissed(true);
    localStorage.setItem('solowipe_welcome_dismissed', 'true');
  };

  const handleAddFirstCustomer = () => {
    setShowWelcome(false);
    setQuickAddOpen(true);
  };

  const handleCompleteRequest = (job: JobWithCustomer) => {
    setJobToComplete(job);
    setCapturedPhotoUrl(null);
    // Prefetch confetti chunk during the completion flow (keeps initial bundle smaller).
    void import('canvas-confetti');
    setPriceAdjustOpen(true);
  };

  const handleConfirmComplete = async (amount: number, photoUrl?: string) => {
    if (!jobToComplete || completingJobId) return;
    
    const jobId = jobToComplete.id;
    setPriceAdjustOpen(false);
    setCompletingJobId(jobId);

    // Fire confetti (loaded on-demand to keep the initial bundle smaller).
    try {
      const { default: confetti } = await import('canvas-confetti');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22C55E', '#007AFF', '#FFD700'],
      });
    } catch {
      // Non-critical: ignore if confetti fails to load.
    }

    // Optimistically remove from local state
    setLocalJobs(prev => prev.filter(job => job.id !== jobId));

    try {
      const result = await completeJob(jobId, amount, photoUrl);
      
      const ddMessage = result.isDirectDebit ? ' (Direct Debit)' : '';
      const { id: toastId } = toast({
        title: `£${result.collectedAmount} Collected!${ddMessage}`,
        description: result.isDirectDebit 
          ? `Payment collecting via DD. Next clean: ${result.nextDate}`
          : `Next clean: ${result.nextDate}`,
        duration: 5000,
        action: !result.isDirectDebit ? (
          <ToastAction
            altText="Undo"
            onClick={async () => {
              dismiss(toastId);
              try {
                await undoCompleteJob(result.jobId, result.newJobId);
              } catch {
                toast({
                  title: 'Error',
                  description: 'Failed to undo completion',
                  variant: 'destructive',
                });
              }
            }}
          >
            Undo
          </ToastAction>
        ) : undefined,
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
      setJobToComplete(null);
      setCapturedPhotoUrl(null);
    }
  };

  const handleCapturePhoto = () => {
    setPhotoCaptureOpen(true);
  };

  const handlePhotoCapture = (url: string) => {
    setCapturedPhotoUrl(url);
    setPhotoCaptureOpen(false);
  };

  const handleMarkPaidRequest = (job: JobWithCustomer) => {
    setJobToMarkPaid(job);
    setMarkPaidModalOpen(true);
  };

  const handleConfirmMarkPaid = async (method: 'cash' | 'transfer') => {
    if (!jobToMarkPaid) return;
    try {
      await markJobPaid(jobToMarkPaid.id, method);
      toast({
        title: 'Payment recorded',
        description: `${jobToMarkPaid.customer.name} marked as paid via ${method}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setMarkPaidModalOpen(false);
      setJobToMarkPaid(null);
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
    const customerName = jobToSkip.customer.name;
    setSkipConfirmOpen(false);
    
    // Optimistically remove from local state
    setLocalJobs(prev => prev.filter(job => job.id !== jobId));
    
    try {
      const result = await skipJob(jobId);
      
      const { id: toastId } = toast({
        title: 'Job skipped',
        description: `${result.customerName} rescheduled to ${result.nextDate}`,
        duration: 5000,
        action: (
          <ToastAction
            altText="Undo"
            onClick={async () => {
              dismiss(toastId);
              try {
                await undoSkipJob(result.jobId, result.originalDate);
                toast({
                  title: 'Skip undone',
                  description: `${result.customerName} restored to original date`,
                });
              } catch {
                toast({
                  title: 'Error',
                  description: 'Failed to undo skip',
                  variant: 'destructive',
                });
              }
            }}
          >
            Undo
          </ToastAction>
        ),
      });
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

  const handleSaveNotes = async (jobId: string, notes: string | null) => {
    await updateJobNotes(jobId, notes);
  };

  const nextJob = localJobs[0];

  return (
    <div 
      className="min-h-screen bg-background pb-20"
      {...handlers}
    >
      <Header showLogo showWeather />

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
        ) : showWelcome ? (
          <WelcomeFlow 
            businessName={businessName}
            onAddFirstCustomer={handleAddFirstCustomer}
            onDismiss={handleDismissWelcome}
          />
        ) : (
          <>
            {/* Trial Welcome Banner */}
            {isInGracePeriod && !trialBannerDismissed && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/30 rounded-xl p-4 mb-6 relative"
              >
                <button
                  onClick={handleDismissTrialBanner}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex items-start gap-3 pr-6">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Welcome to your free trial!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You have <span className="font-medium text-emerald-600">{gracePeriodDaysRemaining} day{gracePeriodDaysRemaining !== 1 ? 's' : ''}</span> to explore all Pro features free. Add customers, complete jobs, and see how SoloWipe transforms your workflow.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* GoCardless Status Indicator */}
            {(() => {
              const ddCustomerCount = customers.filter(c => c.gocardless_id && c.status === 'active').length;
              
              if (profile?.gocardless_organisation_id) {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4"
                  >
                    {profile?.gocardless_access_token_encrypted ? (
                      <button
                        onClick={() => navigate('/settings')}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-success/10 border border-success/20 rounded-lg text-sm hover:bg-success/20 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-success" />
                          <span className="text-success font-medium">
                            Direct Debit active
                            {ddCustomerCount > 0 && (
                              <span className="text-success/70 font-normal"> • {ddCustomerCount} customer{ddCustomerCount !== 1 ? 's' : ''}</span>
                            )}
                          </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-success -rotate-90" />
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/settings')}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg text-sm hover:bg-warning/20 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          <span className="text-warning font-medium">Direct Debit needs reconnecting</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-warning -rotate-90" />
                      </button>
                    )}
                  </motion.div>
                );
              }
              
              if (customers.length >= 3 && !ddPromptDismissed) {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4"
                  >
                    <div className="relative">
                      <button
                        onClick={() => navigate('/settings')}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 pr-10 bg-primary/10 border border-primary/20 rounded-lg text-sm hover:bg-primary/20 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          <span className="text-primary font-medium">Set up Direct Debit to get paid automatically</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-primary -rotate-90" />
                      </button>
                      <button
                        onClick={handleDismissDdPrompt}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-primary/20 transition-colors"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4 text-primary/60" />
                      </button>
                    </div>
                  </motion.div>
                );
              }
              
              return null;
            })()}

            {/* Today's Stats Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border p-5 mb-6"
            >
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{localJobs.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Pending</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{completedToday.length}</p>
                  <p className="text-sm text-muted-foreground mt-1">Completed</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
                    <PoundSterling className="w-6 h-6 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-success">£{todayEarnings}</p>
                  <p className="text-sm text-muted-foreground mt-1">Earned</p>
                </div>
              </div>
            </motion.div>

            {/* On My Way Button - shows only if there's a next job with phone */}
            {nextJob && nextJob.customer.mobile_phone && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <OnMyWayButton 
                  job={nextJob} 
                  businessName={businessName}
                  className="w-full"
                />
              </motion.div>
            )}

            {/* Jobs count badge and action buttons */}
            {localJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center justify-between gap-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-xl">
                  <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {localJobs.length}
                  </span>
                  <span className="font-medium">
                    {localJobs.length === 1 ? 'job' : 'jobs'} today
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setQuickAddOpen(true)}
                    className="gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Quick Add
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleSkipAllRequest}
                    disabled={isSkippingAll}
                    className="gap-2"
                  >
                    <SkipForward className="w-4 h-4" />
                    Skip All
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Route optimization */}
            {localJobs.length >= 2 && (
              <div className="mb-4">
                <OptimizeRouteButton jobs={localJobs} onReorder={handleReorder} />
              </div>
            )}

            {/* Jobs list - Drag to reorder */}
            <Reorder.Group axis="y" values={localJobs} onReorder={handleReorder} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {localJobs.map((job, index) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onComplete={handleCompleteRequest}
                    onSkip={handleSkipRequestById}
                    index={index}
                    isNextUp={index === 0}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>

            {/* Empty state for today */}
            {localJobs.length === 0 && completedToday.length === 0 && customers.length > 0 && (
              <EmptyState
                title="All done for today!"
                description="Great work! You've completed all your scheduled jobs."
                icon={<Sparkles className="w-8 h-8 text-accent" />}
              />
            )}

            {/* Empty state for new users without welcome */}
            {localJobs.length === 0 && customers.length === 0 && !showWelcome && (
              <div className="text-center py-12">
                <Button
                  onClick={() => setQuickAddOpen(true)}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Add Your First Customer
                </Button>
              </div>
            )}

            {/* Completed Today Section */}
            {completedToday.length > 0 && (
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen} className="mt-8">
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    Completed Today ({completedToday.length})
                  </h2>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${completedOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  {completedToday.map((job, index) => (
                    <div key={job.id}>
                      <CompletedJobItem
                        job={job}
                        index={index}
                        onAddNote={(job) => setNotesJob(job)}
                        onMarkPaid={(job) => !isMarkingPaid && handleMarkPaidRequest(job)}
                        isProcessing={isMarkingPaid}
                      />
                      {/* Ask for Review button after completion - only if google review link is configured */}
                      {job.customer.mobile_phone && profile?.google_review_link && (
                        <div className="mt-2 flex justify-end">
                          <AskForReviewButton
                            customerName={job.customer.name}
                            customerPhone={job.customer.mobile_phone}
                            businessName={businessName}
                            googleReviewLink={profile.google_review_link}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
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

      <JobNotesModal
        job={notesJob}
        isOpen={!!notesJob}
        onClose={() => setNotesJob(null)}
        onSave={handleSaveNotes}
      />

      <QuickAddCustomerModal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSubmit={addCustomer}
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

      <PriceAdjustModal
        isOpen={priceAdjustOpen}
        job={jobToComplete}
        onClose={() => {
          setPriceAdjustOpen(false);
          setJobToComplete(null);
          setCapturedPhotoUrl(null);
        }}
        onConfirm={handleConfirmComplete}
        onCapturePhoto={handleCapturePhoto}
        capturedPhotoUrl={capturedPhotoUrl}
      />

      <PhotoCaptureModal
        isOpen={photoCaptureOpen}
        onClose={() => setPhotoCaptureOpen(false)}
        onCapture={handlePhotoCapture}
        jobId={jobToComplete?.id}
      />

      <MarkPaidModal
        isOpen={markPaidModalOpen}
        job={jobToMarkPaid}
        onClose={() => {
          if (!isMarkingPaid) {
            setMarkPaidModalOpen(false);
            setJobToMarkPaid(null);
          }
        }}
        onConfirm={handleConfirmMarkPaid}
      />

      <BottomNav />

      {/* Welcome Tour for first-time users */}
      {showTour && <WelcomeTour onComplete={completeTour} />}
    </div>
  );
};

export default Index;
