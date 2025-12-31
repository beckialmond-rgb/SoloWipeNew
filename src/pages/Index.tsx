import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, addDays } from 'date-fns';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { JobCard } from '@/components/JobCard';
import { JobAssignmentPicker } from '@/components/JobAssignmentPicker';
import { JobAssignmentAvatar } from '@/components/JobAssignmentAvatar';
import { useRouteSorting } from '@/hooks/useRouteSorting';
import { JobWithCustomerAndAssignment } from '@/types/database';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UpcomingJobsSection } from '@/components/UpcomingJobsSection';
import { TodaySection } from '@/components/TodaySection';
import { StatSummaryCard } from '@/components/StatSummaryCard';
import { TextCustomerButton } from '@/components/TextCustomerButton';
import { TomorrowSMSButton } from '@/components/TomorrowSMSButton';
import { RescheduleJobModal } from '@/components/RescheduleJobModal';
import { BulkRescheduleModal } from '@/components/BulkRescheduleModal';
import { BulkAssignmentModal } from '@/components/BulkAssignmentModal';
import { JobNotesModal } from '@/components/JobNotesModal';
import { OnMyWayButton } from '@/components/OnMyWayButton';
import { QuickAddCustomerModal } from '@/components/QuickAddCustomerModal';
import { WelcomeFlow } from '@/components/WelcomeFlow';
import { WelcomeTour, useWelcomeTour } from '@/components/WelcomeTour';
import { SetupChecklist } from '@/components/SetupChecklist';
import { HelperWelcomeCelebration } from '@/components/HelperWelcomeCelebration';
import { PriceAdjustModal } from '@/components/PriceAdjustModal';
import { PhotoCaptureModal } from '@/components/PhotoCaptureModal';
import { OptimizeRouteButton } from '@/components/OptimizeRouteButton';
import { MarkPaidModal } from '@/components/MarkPaidModal';
import { BusinessNameModal } from '@/components/BusinessNameModal';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageCounters } from '@/hooks/useUsageCounters';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { useToast } from '@/hooks/use-toast';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useJobReminders } from '@/hooks/useJobReminders';
import { useHaptics } from '@/hooks/useHaptics';
import { useTimezone } from '@/hooks/useTimezone';
import { syncStatus } from '@/lib/offlineStorage';
import { cn } from '@/lib/utils';
import { Sparkles, SkipForward, CheckCircle, PoundSterling, Clock, RefreshCw, ChevronDown, ChevronUp, UserPlus, Navigation, X, Gift, CreditCard, AlertTriangle, MapPin, MessageSquare, CheckSquare, Square, Calendar, UserCheck } from 'lucide-react';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { prepareSMSContext, openSMSApp } from '@/utils/openSMS';
import { JobWithCustomer } from '@/types/database';
import { DEFAULT_BUSINESS_NAME } from '@/constants/app';
import { getUserFriendlyError } from '@/lib/errorMessages';
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
  const { pendingJobs, upcomingJobs, assignedJobs, completedToday, todayEarnings, customers, businessName, completeJob, rescheduleJob, skipJob, updateJobNotes, undoCompleteJob, undoSkipJob, addCustomer, refetchAll, isLoading, markJobPaid, profile, isMarkingPaid, helpers, helpersLoading, assignJob, assignMultipleUsers, unassignJob, createHelper, removeHelper, teamMemberships } = useSupabaseData();
  const { user } = useAuth();
  const { subscribed, status } = useSubscription();
  const { data: usageCounters } = useUsageCounters();
  const { requirePremium, openPaywall, isInGracePeriod } = useSoftPaywall();
  const { toast, dismiss } = useToast();
  const { showTour, completeTour } = useWelcomeTour();
  const { success } = useHaptics();
  const { timezone } = useTimezone();
  const { showTemplatePicker } = useSMSTemplateContext();
  
  // Check if user has free usage remaining (usage-based trial)
  const jobsCompleted = usageCounters?.jobs_completed_count || 0;
  const jobsRemaining = usageCounters?.jobsRemaining || 0;
  const hasFreeUsage = jobsRemaining > 0;
  const showTrialBanner = !subscribed && status !== 'trialing' && hasFreeUsage;
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
  
  // Enable job reminders for upcoming jobs (includes tomorrow)
  const allUpcomingJobs = [...pendingJobs, ...upcomingJobs];
  useJobReminders(allUpcomingJobs);
  
  // All upcoming jobs (including tomorrow) - no filtering needed
  // Tomorrow jobs are now included in Upcoming section
  
  const [localJobs, setLocalJobs] = useState<JobWithCustomerAndAssignment[]>([]);
  // Track previous job IDs to prevent unnecessary updates
  const previousJobIdsRef = useRef<string>('');
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [notesJob, setNotesJob] = useState<JobWithCustomer | null>(null);
  const [assignmentPickerOpen, setAssignmentPickerOpen] = useState(false);
  const [selectedJobForAssignment, setSelectedJobForAssignment] = useState<JobWithCustomerAndAssignment | null>(null);
  
  // Get user role (Phase 4: Explicit role field)
  const { isOwner, isHelper, isBoth, effectiveRole } = useRole();
  
  // For Helpers: use route sorting
  const { sortedJobs: sortedAssignedJobs } = useRouteSorting(assignedJobs);
  
  // Assignment handlers
  const handleAssignClick = (job: JobWithCustomerAndAssignment) => {
    if (!job) {
      console.error('[Index] handleAssignClick called with null job');
      return;
    }
    // Ensure job has all required assignment properties
    const jobWithAssignments: JobWithCustomerAndAssignment = {
      ...job,
      assignment: 'assignment' in job ? job.assignment : undefined,
      assignments: 'assignments' in job ? job.assignments : undefined
    };
    console.log('[Index] Opening assignment picker for job:', jobWithAssignments.id, 'with assignments:', jobWithAssignments.assignments?.length || 0);
    // Set job first, then open modal synchronously
    setSelectedJobForAssignment(jobWithAssignments);
    setAssignmentPickerOpen(true);
  };
  
  const handleAssign = async (jobId: string, userId: string) => {
    await assignJob(jobId, userId);
  };
  
  const handleAssignMultiple = async (jobId: string, userIds: string[]) => {
    await assignMultipleUsers(jobId, userIds);
  };
  
  const handleUnassign = async (jobId: string, userId?: string) => {
    await unassignJob(jobId, userId);
  };
  // SMS queue moved to UpcomingJobsSection component
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
  const [showBusinessNameModal, setShowBusinessNameModal] = useState(false);
  const [bulkRescheduleMode, setBulkRescheduleMode] = useState(false);
  const [bulkRescheduleModeForUpcoming, setBulkRescheduleModeForUpcoming] = useState(false);
  const [bulkAssignmentMode, setBulkAssignmentMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkRescheduleModalOpen, setBulkRescheduleModalOpen] = useState(false);
  const [bulkAssignmentModalOpen, setBulkAssignmentModalOpen] = useState(false);
  const [bulkCompleteConfirmOpen, setBulkCompleteConfirmOpen] = useState(false);
  const [isBulkCompleting, setIsBulkCompleting] = useState(false);
  const [showSetupChecklist, setShowSetupChecklist] = useState(false);
  
  // Show setup checklist for new users after welcome flow
  useEffect(() => {
    const dismissed = localStorage.getItem('solowipe_setup_checklist_dismissed') === 'true';
    const welcomeDismissed = localStorage.getItem('solowipe_welcome_dismissed') === 'true';
    const hasCustomers = customers.length > 0;
    
    if (!dismissed && welcomeDismissed && !hasCustomers && !showWelcome) {
      setShowSetupChecklist(true);
    }
  }, [customers.length, showWelcome]);
  
  // Check if user needs to provide business name after OAuth sign-up
  useEffect(() => {
    const checkBusinessName = () => {
      if (user && !isLoading && profile) {
        const needsBusinessName = sessionStorage.getItem('needs_business_name') === 'true';
        if (needsBusinessName && profile.business_name === DEFAULT_BUSINESS_NAME) {
          setShowBusinessNameModal(true);
        }
      }
    };

    checkBusinessName();
    
    // Listen for custom event from auth state change
    window.addEventListener('needs-business-name', checkBusinessName);
    
    return () => {
      window.removeEventListener('needs-business-name', checkBusinessName);
    };
  }, [user, isLoading, profile]);
  
  const handleBusinessNameComplete = () => {
    setShowBusinessNameModal(false);
    refetchAll();
  };
  
  const handleDismissTrialBanner = () => {
    setTrialBannerDismissed(true);
    localStorage.setItem('solowipe_trial_banner_dismissed', 'true');
  };

  // SMS queue handlers moved to UpcomingJobsSection component
  // These are now handled within the Upcoming section for bulk reminders


  // SMS queue restoration moved to UpcomingJobsSection component

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

  // Track if order was restored (to show toast only once per day)
  const [orderRestored, setOrderRestored] = useState(() => {
    const restoredKey = `solowipe_order_restored_${format(new Date(), 'yyyy-MM-dd')}`;
    return localStorage.getItem(restoredKey) === 'true';
  });

  // Apply saved order to jobs
  const applyPersistedOrder = useCallback((jobs: JobWithCustomerAndAssignment[]): { jobs: JobWithCustomerAndAssignment[], wasRestored: boolean } => {
    const savedOrder = localStorage.getItem(todayKey);
    if (!savedOrder) return { jobs, wasRestored: false };
    
    try {
      const orderedIds: string[] = JSON.parse(savedOrder);
      const jobMap = new Map(jobs.map(job => [job.id, job]));
      const orderedJobs: JobWithCustomerAndAssignment[] = [];
      
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
  const saveJobOrder = useCallback((jobs: JobWithCustomerAndAssignment[]) => {
    const orderIds = jobs.map(job => job.id);
    localStorage.setItem(todayKey, JSON.stringify(orderIds));
  }, [todayKey]);

  // Handle reorder with persistence and feedback
  const handleReorder = useCallback((newOrder: JobWithCustomerAndAssignment[]) => {
    setLocalJobs(newOrder);
    saveJobOrder(newOrder);
    toast({
      title: 'Order saved',
      description: 'Your job order has been saved',
      duration: 1500,
    });
  }, [saveJobOrder, toast]);

  // Sync local jobs with fetched jobs (pendingJobs for Owners, assignedJobs for Helpers)
  useEffect(() => {
    // Determine source jobs based on role
    const sourceJobs = isHelper && !isOwner 
      ? sortedAssignedJobs  // Helper view: use route-sorted assigned jobs
      : pendingJobs;         // Owner view: use pending jobs
    
    // Create a stable string representation of current jobs
    const newJobIds = sourceJobs.length > 0 
      ? sourceJobs.map(j => j.id).sort().join(',')
      : '';
    
    // If job IDs haven't changed, don't update (prevents infinite loop)
    if (previousJobIdsRef.current === newJobIds) {
      return;
    }
    
    // Update ref with new job IDs
    previousJobIdsRef.current = newJobIds;
    
    // For Helpers: use route-sorted jobs directly (no persisted order needed)
    if (isHelper && !isOwner) {
      setLocalJobs(sourceJobs);
      return;
    }
    
    // For Owners: apply persisted order
    const { jobs: orderedJobs, wasRestored } = applyPersistedOrder(sourceJobs);
    
    // Update local jobs state only if it actually changed
    setLocalJobs(orderedJobs);
    
    // Show toast only once when order is restored
    if (wasRestored && !orderRestored && sourceJobs.length > 0) {
      setOrderRestored(true);
      const restoredKey = `solowipe_order_restored_${format(new Date(), 'yyyy-MM-dd')}`;
      localStorage.setItem(restoredKey, 'true');
      toast({
        title: 'Order restored',
        description: 'Your custom job order has been applied',
        duration: 2000,
      });
    }
  }, [isHelper, isOwner, sortedAssignedJobs, pendingJobs, applyPersistedOrder, orderRestored, toast]);

  // Show welcome flow for new users
  useEffect(() => {
    if (!isLoading && customers.length === 0 && !welcomeDismissed) {
      setShowWelcome(true);
    }
  }, [isLoading, customers.length, welcomeDismissed]);

  // Show helper welcome celebration if matched
  const [showHelperWelcome, setShowHelperWelcome] = useState(false);
  const [helperOwnerName, setHelperOwnerName] = useState<string | undefined>();
  const helperWelcomeProcessedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (helperWelcomeProcessedRef.current) return;
    
    // Check if helper was just matched
    const helperMatched = sessionStorage.getItem('helper_matched') === 'true';
    const ownerId = sessionStorage.getItem('helper_owner_id');
    
    if (helperMatched && ownerId && isHelper && !isOwner && !isLoading) {
      // Mark as processed immediately to prevent re-execution
      helperWelcomeProcessedRef.current = true;
      
      // Get owner name
      const getOwnerName = async () => {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data } = await supabase
            .from('profiles')
            .select('business_name')
            .eq('id', ownerId)
            .maybeSingle();
          
          if (data?.business_name) {
            setHelperOwnerName(data.business_name);
          }
          setShowHelperWelcome(true);
          
          // Clear flags
          sessionStorage.removeItem('helper_matched');
          sessionStorage.removeItem('helper_owner_id');
          sessionStorage.removeItem('helper_owner_name');
        } catch (error) {
          console.error('[Helper Welcome] Error fetching owner name:', error);
          // Still show welcome even if owner name fetch fails
          setShowHelperWelcome(true);
          sessionStorage.removeItem('helper_matched');
          sessionStorage.removeItem('helper_owner_id');
          sessionStorage.removeItem('helper_owner_name');
        }
      };
      
      getOwnerName();
    }
  }, [isHelper, isOwner, isLoading]);

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
    // Check if user has premium access before allowing job completion
    if (!requirePremium('complete')) {
      // Paywall modal will be shown by requirePremium
      return;
    }
    
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

    // Save current state for rollback
    const previousJobs = [...localJobs];

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
      
      // Check for Direct Debit collection errors
      if (result.ddError) {
        const errorInfo = result.ddError;
        let errorTitle = 'Payment Collection Failed';
        let errorDescription = errorInfo.error || 'Failed to collect Direct Debit payment.';
        
        if (errorInfo.requiresReconnect) {
          errorTitle = 'GoCardless Connection Expired';
          errorDescription = 'Please reconnect your GoCardless account in Settings to continue collecting payments.';
        } else if (errorInfo.requiresNewMandate) {
          errorTitle = 'Direct Debit Mandate Not Active';
          errorDescription = 'The customer\'s Direct Debit mandate is not active. Please set up a new mandate or collect payment manually.';
        }
        
        toast({
          title: errorTitle,
          description: errorDescription,
          variant: 'destructive',
          duration: 8000,
        });
        
        // Still show success message for job completion
        const nextCleanMessage = result.nextDate 
          ? `Next clean: ${result.nextDate}`
          : 'One-off job - no reschedule';
        
        toast({
          title: `Job Completed - £${result.collectedAmount}`,
          description: `Job completed successfully. ${nextCleanMessage}. Payment needs to be collected manually.`,
          duration: 5000,
        });
      } else {
        // Normal success flow
        const ddMessage = result.isDirectDebit ? ' (Direct Debit)' : '';
        const nextCleanMessage = result.nextDate 
          ? `Next clean: ${result.nextDate}`
          : 'One-off job - no reschedule';
        
        const { id: toastId } = toast({
          title: `£${result.collectedAmount} Collected!${ddMessage}`,
          description: result.isDirectDebit 
            ? `Payment collecting via DD. ${nextCleanMessage}`
            : nextCleanMessage,
          duration: 5000,
          action: !result.isDirectDebit && result.newJobId ? (
            <ToastAction
              altText="Undo"
              onClick={async () => {
                dismiss(toastId);
                try {
                  await undoCompleteJob(result.jobId, result.newJobId!);
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
      }
    } catch (error) {
      // Rollback on error - refetch to get current state
      await refetchAll();
      
      // Check if error is about job completion limit - show paywall instead of error toast
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('limit reached') || errorMessage.includes('upgrade to continue')) {
        // Show paywall modal instead of error toast
        openPaywall('complete');
      } else {
        // Show user-friendly error message
        const friendlyMessage = getUserFriendlyError(error, { operation: 'Complete job' });
        toast({
          title: 'Failed to complete job',
          description: friendlyMessage,
          variant: 'destructive',
        });
      }
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
        description: `${jobToMarkPaid.customer?.name || 'Customer'} marked as paid via ${method}`,
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

  const handleJobClick = (job: JobWithCustomer) => {
    setSelectedJob(job);
    setRescheduleModalOpen(true);
  };

  const handleReschedule = async (jobId: string, newDate: string) => {
    try {
      await rescheduleJob(jobId, newDate);
      setSelectedJob(null);
    } catch (error) {
      // Error is already handled by the modal component
      // Just keep modal open so user can retry
    }
  };

  const handleBulkReschedule = async (newDate: string, sendSMS: boolean = false) => {
    if (selectedJobIds.size === 0) return;
    
    const jobIdsArray = Array.from(selectedJobIds);
    setBulkRescheduleModalOpen(false);
    
    // Get jobs from both pending and upcoming sources
    const allJobs = [...localJobs, ...upcomingJobs];
    const selectedJobs = allJobs.filter(job => selectedJobIds.has(job.id));
    
    try {
      // Reschedule jobs sequentially to track individual failures
      const rescheduledJobs: string[] = [];
      const failedJobs: { jobId: string; error: string }[] = [];
      
      for (const jobId of jobIdsArray) {
        try {
          await rescheduleJob(jobId, newDate);
          rescheduledJobs.push(jobId);
        } catch (error) {
          const job = selectedJobs.find(j => j.id === jobId);
          const customerName = job?.customer?.name || 'Unknown customer';
          failedJobs.push({
            jobId,
            error: error instanceof Error ? error.message : 'Failed to reschedule'
          });
          console.error(`Failed to reschedule job ${jobId} (${customerName}):`, error);
        }
      }
      
      // Show appropriate toast based on results
      if (failedJobs.length === 0) {
        toast({
          title: 'Jobs rescheduled',
          description: `Rescheduled ${rescheduledJobs.length} job${rescheduledJobs.length !== 1 ? 's' : ''} to ${newDate}`,
        });
      } else if (rescheduledJobs.length > 0) {
        toast({
          title: 'Partial success',
          description: `Rescheduled ${rescheduledJobs.length} job${rescheduledJobs.length !== 1 ? 's' : ''}. ${failedJobs.length} job${failedJobs.length !== 1 ? 's' : ''} failed.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Reschedule failed',
          description: `Failed to reschedule all ${jobIdsArray.length} job${jobIdsArray.length !== 1 ? 's' : ''}. Please try again.`,
          variant: 'destructive',
        });
        // Don't proceed with SMS if all jobs failed
        return;
      }
      
      // Send rain check SMS if requested (only to successfully rescheduled jobs)
      if (sendSMS && rescheduledJobs.length > 0) {
        const jobsWithPhone = selectedJobs.filter(job => 
          rescheduledJobs.includes(job.id) && job.customer?.mobile_phone
        );
        
        if (jobsWithPhone.length > 0) {
          // Use the first job's context for template picker (they'll all get the same template)
          const firstJob = jobsWithPhone[0];
          const context = prepareSMSContext({
            customerName: firstJob.customer?.name || 'Customer',
            customerAddress: firstJob.customer?.address || '',
            scheduledDate: newDate,
            businessName,
            serviceType: 'Window Clean',
          });
          
          showTemplatePicker('rain_check', context, (templateMessage) => {
            // The templateMessage already has variables replaced for the first customer
            // We need to extract customer-specific parts and replace for each customer
            const firstCustomerName = firstJob.customer?.name || 'Customer';
            const firstCustomerFirstName = firstCustomerName.split(' ')[0] || 'there';
            
            // Send SMS to all customers, replacing customer-specific variables
            jobsWithPhone.forEach((job, index) => {
              setTimeout(() => {
                const customerName = job.customer?.name || 'Customer';
                const customerFirstName = customerName.split(' ')[0] || 'there';
                
                // Replace customer-specific variables in the message
                let personalizedMessage = templateMessage;
                
                // Replace first customer's name with current customer's name
                personalizedMessage = personalizedMessage.replace(
                  new RegExp(firstCustomerFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                  customerFirstName
                );
                personalizedMessage = personalizedMessage.replace(
                  new RegExp(firstCustomerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                  customerName
                );
                
                openSMSApp(
                  job.customer?.mobile_phone!,
                  personalizedMessage,
                  user?.id,
                  job.id
                );
              }, index * 500); // Stagger by 500ms to avoid overwhelming the SMS app
            });
            
            toast({
              title: 'SMS queued',
              description: `Sending rain check SMS to ${jobsWithPhone.length} customer${jobsWithPhone.length !== 1 ? 's' : ''}`,
            });
          });
        }
      }
      
      // Clear selection and exit bulk mode
      setSelectedJobIds(new Set());
      setBulkRescheduleMode(false);
      setBulkRescheduleModeForUpcoming(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reschedule some jobs. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const selectAllJobs = () => {
    setSelectedJobIds(new Set(localJobs.map(j => j.id)));
  };

  const selectAllUpcomingJobs = () => {
    setSelectedJobIds(prev => {
      const newSet = new Set(prev);
      upcomingJobs.forEach(job => newSet.add(job.id));
      return newSet;
    });
  };

  const clearBulkSelection = () => {
    setSelectedJobIds(new Set());
    setBulkRescheduleMode(false);
    setBulkRescheduleModeForUpcoming(false);
    setBulkAssignmentMode(false);
  };

  const handleBulkAssign = async (jobIdOrUserId: string, userId?: string) => {
    // Handle both signatures:
    // 1. handleBulkAssign(userId) - from direct call (uses selectedJobIds from state)
    // 2. handleBulkAssign(jobId, userId) - from BulkAssignmentModal (assigns single job)
    let jobIdsArray: string[];
    let actualUserId: string;
    
    if (userId !== undefined) {
      // Called with (jobId, userId) - single job assignment from BulkAssignmentModal
      jobIdsArray = [jobIdOrUserId];
      actualUserId = userId;
    } else {
      // Called with (userId) - bulk assignment using selectedJobIds
      if (selectedJobIds.size === 0) {
        console.warn('[handleBulkAssign] No jobs selected');
        return;
      }
      jobIdsArray = Array.from(selectedJobIds);
      actualUserId = jobIdOrUserId;
    }
    
    console.log('[handleBulkAssign] Starting assignment', { 
      jobCount: jobIdsArray.length, 
      userId: actualUserId,
      jobIds: jobIdsArray 
    });
    
    setBulkAssignmentModalOpen(false);
    
    try {
      // Filter out placeholder helpers before attempting assignment
      // Check if the selected helper is a placeholder
      const selectedHelper = helpers.find(h => h.id === actualUserId);
      if (selectedHelper) {
        const isPlaceholder = selectedHelper.isPlaceholder || selectedHelper.email?.endsWith('@temp.helper');
        if (isPlaceholder) {
          const helperName = selectedHelper.name || 'This helper';
          console.warn('[handleBulkAssign] Attempted to assign to placeholder helper', {
            helperId: actualUserId,
            helperName,
            helperEmail: selectedHelper.email
          });
          toast({
            title: 'Helper needs to sign up first',
            description: `${helperName} needs to create an account before receiving job assignments. They're already added to your team!`,
            variant: 'destructive',
          });
          return;
        }
      }
      
      // Assign each job sequentially (reuse existing assignJobMutation)
      const results = await Promise.allSettled(
        jobIdsArray.map(jobId => {
          console.log('[handleBulkAssign] Assigning job', { jobId, userId: actualUserId });
          return assignJob(jobId, actualUserId);
        })
      );
      
      // Log detailed results
      const errors: Array<{ jobId: string; error: any }> = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log('[handleBulkAssign] Job assigned successfully', { 
            jobId: jobIdsArray[index], 
            userId: actualUserId 
          });
        } else {
          const error = result.reason;
          errors.push({ jobId: jobIdsArray[index], error });
          console.error('[handleBulkAssign] Job assignment failed', { 
            jobId: jobIdsArray[index], 
            userId: actualUserId,
            error: error instanceof Error ? error.message : String(error),
            fullError: error
          });
        }
      });
      
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log('[handleBulkAssign] Assignment summary', { 
        succeeded, 
        failed, 
        total: jobIdsArray.length,
        errors: errors.map(e => ({ jobId: e.jobId, error: e.error instanceof Error ? e.error.message : String(e.error) }))
      });
      
      if (failed === 0) {
        toast({
          title: 'Jobs assigned',
          description: `Assigned ${succeeded} job${succeeded !== 1 ? 's' : ''} successfully.`,
        });
      } else {
        const errorMessages = errors.map(e => e.error instanceof Error ? e.error.message : String(e.error)).join('; ');
        toast({
          title: 'Partial success',
          description: `Assigned ${succeeded} job${succeeded !== 1 ? 's' : ''}. ${failed} failed. ${errorMessages}`,
          variant: 'destructive',
        });
      }
      
      // Force refetch to ensure UI updates
      console.log('[handleBulkAssign] Forcing query refetch after assignment');
      refetchAll();
      
      // Clear selection and exit bulk mode
      setSelectedJobIds(new Set());
      setBulkAssignmentMode(false);
    } catch (error) {
      toast({
        title: 'Assignment failed',
        description: error instanceof Error ? error.message : 'Failed to assign jobs',
        variant: 'destructive',
      });
    }
  };

  const handleBulkComplete = async () => {
    if (selectedJobIds.size === 0) return;
    
    setBulkCompleteConfirmOpen(false);
    setIsBulkCompleting(true);
    
    const jobIdsArray = Array.from(selectedJobIds);
    const jobsToComplete = localJobs.filter(job => selectedJobIds.has(job.id));
    
    try {
      // Complete jobs sequentially to track individual failures
      const completedJobs: string[] = [];
      const failedJobs: { jobId: string; customerName: string; error: string }[] = [];
      
      for (const job of jobsToComplete) {
        try {
          const defaultPrice = job.customer?.price || 0;
          await completeJob(job.id, defaultPrice);
          completedJobs.push(job.id);
        } catch (error) {
          const customerName = job.customer?.name || 'Unknown customer';
          failedJobs.push({
            jobId: job.id,
            customerName,
            error: error instanceof Error ? error.message : 'Failed to complete'
          });
          console.error(`Failed to complete job ${job.id} (${customerName}):`, error);
        }
      }
      
      // Show appropriate toast based on results
      if (failedJobs.length === 0) {
        toast({
          title: 'Jobs completed',
          description: `Completed ${completedJobs.length} job${completedJobs.length !== 1 ? 's' : ''}`,
        });
      } else if (completedJobs.length > 0) {
        const failedNames = failedJobs.map(f => f.customerName).join(', ');
        toast({
          title: 'Partial success',
          description: `Completed ${completedJobs.length} job${completedJobs.length !== 1 ? 's' : ''}. Failed: ${failedNames}`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Completion failed',
          description: `Failed to complete all ${jobIdsArray.length} job${jobIdsArray.length !== 1 ? 's' : ''}. Please try again.`,
          variant: 'destructive',
        });
      }
      
      // Clear selection and exit bulk mode only if at least some jobs succeeded
      if (completedJobs.length > 0) {
        setSelectedJobIds(new Set());
        setBulkRescheduleMode(false);
      } else {
        // Keep selection if all failed so user can retry
        setSelectedJobIds(prev => {
          const newSet = new Set(prev);
          completedJobs.forEach(id => newSet.delete(id));
          return newSet;
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete jobs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkCompleting(false);
    }
  };


  const handleSaveNotes = async (jobId: string, notes: string | null) => {
    try {
      await updateJobNotes(jobId, notes);
    } catch (error) {
      // Error is already handled by the mutation
      // No need to show additional toast here
    }
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
        {/* Helper Welcome Celebration */}
        {showHelperWelcome && (
          <HelperWelcomeCelebration
            ownerName={helperOwnerName}
            onDismiss={() => setShowHelperWelcome(false)}
          />
        )}

        {isLoading ? (
          <LoadingState type="skeleton" skeletonType="job-card" skeletonCount={3} />
        ) : showWelcome ? (
          <WelcomeFlow 
            businessName={businessName}
            onAddFirstCustomer={handleAddFirstCustomer}
            onDismiss={handleDismissWelcome}
          />
        ) : (
          <>
            {/* Trial Welcome Banner */}
            {showTrialBanner && !trialBannerDismissed && (
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
                      You've completed <span className="font-medium text-emerald-600">{jobsCompleted} job{jobsCompleted !== 1 ? 's' : ''}</span>. Complete <span className="font-medium text-emerald-600">{jobsRemaining} more free job{jobsRemaining !== 1 ? 's' : ''}</span> to experience SoloWipe. Add customers, complete jobs, and see how SoloWipe transforms your workflow.
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
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-success/10 dark:bg-success/20 border border-success/30 dark:border-success/40 rounded-lg text-sm hover:bg-success/20 dark:hover:bg-success/30 transition-colors"
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
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-warning/10 dark:bg-warning/20 border border-warning/30 dark:border-warning/40 rounded-lg text-sm hover:bg-warning/20 dark:hover:bg-warning/30 transition-colors"
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
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 pr-10 bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40 rounded-lg text-sm hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
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

            {/* Today's Stats Dashboard - High Contrast Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={cn(
                "relative rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden mb-6",
                "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800",
                "dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
                "border-2 border-slate-600 dark:border-slate-600"
              )}
            >
              {/* Decorative accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-slate-200 dark:text-slate-300 text-sm font-semibold mb-2 uppercase tracking-wide">Today's Run</p>
                    <p className="text-3xl md:text-4xl font-extrabold text-white dark:text-white leading-tight">
                      {new Intl.DateTimeFormat('en-GB', {
                        timeZone: timezone,
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      }).format(new Date())}
                    </p>
                  </div>
                  <div className="w-16 h-16 md:w-18 md:h-18 rounded-full bg-white/20 dark:bg-white/15 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 dark:border-white/30 shadow-lg">
                    <Clock className="w-8 h-8 md:w-9 md:h-9 text-white dark:text-white" strokeWidth={2.5} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 md:gap-6">
                  <StatSummaryCard
                    icon={Clock}
                    value={localJobs.length}
                    label={isHelper && !isOwner ? 'Assigned' : 'Pending'}
                    iconBg="bg-blue-500 dark:bg-blue-500"
                    valueColor="text-white dark:text-white"
                  />
                  <StatSummaryCard
                    icon={CheckCircle}
                    value={completedToday.length}
                    label="Done"
                    iconBg="bg-emerald-500 dark:bg-emerald-500"
                    valueColor="text-white dark:text-white"
                  />
                  <StatSummaryCard
                    icon={PoundSterling}
                    value={`£${todayEarnings}`}
                    label="Earned"
                    iconBg="bg-green-500 dark:bg-green-500"
                    valueColor="text-green-200 dark:text-green-300"
                  />
                </div>
              </div>
            </motion.div>

            {/* On My Way Button - shows only if there's a next job with phone */}
            {nextJob && nextJob.customer?.mobile_phone && (
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

            {/* Quick Add Button */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              className="mb-6 flex justify-end"
            >
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => setQuickAddOpen(true)}
                        disabled={completingJobId !== null}
                        className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md transition-all duration-300 ease-out"
                      >
                        <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden sm:inline">Quick Add</span>
                        <span className="sm:hidden">Add</span>
                      </Button>
              </motion.div>

            {/* Today Section */}
            <TodaySection
              jobs={localJobs}
                        businessName={businessName}
              isOwner={isOwner}
              isHelper={isHelper}
              customers={customers}
              assignedJobs={assignedJobs}
              showWelcome={showWelcome}
                            onComplete={handleCompleteRequest}
              onAssignClick={handleAssignClick}
              onAssign={handleAssign}
              onAssignMultiple={handleAssignMultiple}
              onUnassign={handleUnassign}
              onReschedule={handleJobClick}
              onBulkReschedule={async (jobIds: string[], newDate: Date) => {
                const dateString = format(newDate, 'yyyy-MM-dd');
                // Temporarily set selectedJobIds for the existing handler
                const previousIds = selectedJobIds;
                setSelectedJobIds(new Set(jobIds));
                await handleBulkReschedule(dateString, false);
                setSelectedJobIds(previousIds);
              }}
              onBulkAssign={async (jobIds: string[], userId: string) => {
                // Temporarily set selectedJobIds for the existing handler
                const previousIds = selectedJobIds;
                setSelectedJobIds(new Set(jobIds));
                await handleBulkAssign(userId);
                setSelectedJobIds(previousIds);
              }}
              onReorder={handleReorder}
              onQuickAdd={() => setQuickAddOpen(true)}
              completingJobId={completingJobId}
              helpers={helpers.map(h => ({
                id: h.id,
                email: h.email || '',
                name: h.name,
                initials: h.initials,
                isPlaceholder: h.isPlaceholder,
                hasPendingInvite: h.hasPendingInvite,
                inviteExpiresAt: h.inviteExpiresAt
              }))}
              currentUserId={user?.id}
              isLoadingHelpers={helpersLoading || isLoading}
              onCreateHelper={createHelper}
              onRemoveHelper={removeHelper}
              onInviteSent={refetchAll}
            />

            {/* 
              UPCOMING SECTION: Future Planning Workflow
              
              This section displays all future jobs (including tomorrow).
              It focuses on bulk operations for efficient future planning:
              
              Available Actions:
              - Bulk Assign: Assign multiple jobs to helpers
              - Bulk Reschedule: Reschedule multiple jobs efficiently
              - Bulk Reminder: Send reminder messages to multiple customers
              - Skip: Skip future jobs (advance scheduling)
              - Text: Contact customers about future jobs
              - Individual Reschedule: Click job card to reschedule individually
              
              Actions NOT Available:
              - Complete: Future jobs cannot be completed (only today's jobs can)
              
              Why bulk-focused? Future planning benefits from bulk operations:
              - Reschedule multiple jobs efficiently
              - Plan weeks/months ahead
              - Adjust schedules in batches
            */}
            {/* Upcoming Jobs Section */}
            <div className="mt-8">
              <UpcomingJobsSection 
                jobs={upcomingJobs} 
                businessName={businessName} 
                onJobClick={handleJobClick} 
                bulkMode={bulkRescheduleModeForUpcoming}
                selectedJobIds={selectedJobIds}
                onToggleSelect={toggleSelectJob}
                onSelectAll={selectAllUpcomingJobs}
                onBulkRescheduleToggle={() => {
                  if (bulkRescheduleModeForUpcoming) {
                    // Clear only upcoming jobs from selection
                    setSelectedJobIds(prev => {
                      const newSet = new Set(prev);
                      upcomingJobs.forEach(job => newSet.delete(job.id));
                      return newSet;
                    });
                    setBulkRescheduleModeForUpcoming(false);
                  } else {
                    setBulkRescheduleModeForUpcoming(true);
                  }
                }}
                onBulkReschedule={() => {
                  if (selectedJobIds.size > 0 && Array.from(selectedJobIds).some(id => upcomingJobs.some(j => j.id === id))) {
                    setBulkRescheduleModalOpen(true);
                  }
                }}
                onBulkAssign={async (jobIds: string[], userId: string) => {
                  // Temporarily set selectedJobIds for the existing handler
                  const previousIds = selectedJobIds;
                  setSelectedJobIds(new Set(jobIds));
                  await handleBulkAssign(userId);
                  setSelectedJobIds(previousIds);
                }}
                helpers={helpers.map(h => ({
                  id: h.id,
                  email: h.email || '',
                  name: h.name,
                  initials: h.initials,
                  isPlaceholder: h.isPlaceholder,
                  hasPendingInvite: h.hasPendingInvite,
                  inviteExpiresAt: h.inviteExpiresAt
                }))}
                currentUserId={user?.id}
                isLoadingHelpers={helpersLoading || isLoading}
                onCreateHelper={createHelper}
                onRemoveHelper={removeHelper}
                onInviteSent={refetchAll}
                isOwner={isOwner}
              />
            </div>
          </>
        )}
      </main>

      <RescheduleJobModal
        job={selectedJob}
        open={rescheduleModalOpen}
        onOpenChange={setRescheduleModalOpen}
        onReschedule={handleReschedule}
      />

      <BulkRescheduleModal
        open={bulkRescheduleModalOpen}
        onOpenChange={setBulkRescheduleModalOpen}
        onReschedule={handleBulkReschedule}
        jobCount={selectedJobIds.size}
        jobs={[...localJobs, ...upcomingJobs].filter(job => selectedJobIds.has(job.id))}
        businessName={businessName}
      />

      <BulkAssignmentModal
        isOpen={bulkAssignmentModalOpen}
        onClose={() => setBulkAssignmentModalOpen(false)}
        selectedJobIds={selectedJobIds}
        jobs={[...localJobs, ...upcomingJobs].filter(job => selectedJobIds.has(job.id))}
        onAssign={handleBulkAssign}
        helpers={helpers}
        currentUserId={user?.id}
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

      <AlertDialog open={bulkCompleteConfirmOpen} onOpenChange={setBulkCompleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedJobIds.size} job{selectedJobIds.size !== 1 ? 's' : ''} as completed using their default prices. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkComplete} disabled={isBulkCompleting}>
              {isBulkCompleting ? 'Completing...' : 'Complete Jobs'}
            </AlertDialogAction>
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

      {/* Assignment Picker Modal */}
      <JobAssignmentPicker
        job={selectedJobForAssignment}
        isOpen={assignmentPickerOpen}
        onClose={() => {
          setAssignmentPickerOpen(false);
          setSelectedJobForAssignment(null);
        }}
        onAssign={handleAssign}
        onAssignMultiple={handleAssignMultiple}
        onUnassign={handleUnassign}
        onCreateHelper={createHelper}
        onRemoveHelper={removeHelper}
        onInviteSent={refetchAll}
        helpers={helpers.map(h => ({
          id: h.id,
          email: h.email || '',
          name: h.name,
          initials: h.initials,
          isPlaceholder: h.isPlaceholder,
          hasPendingInvite: h.hasPendingInvite,
          inviteExpiresAt: h.inviteExpiresAt
        }))}
        currentUserId={user?.id}
        isLoadingHelpers={helpersLoading || isLoading}
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

      {/* Welcome Tour for first-time users */}
      {showTour && <WelcomeTour onComplete={completeTour} />}

      {/* Setup Checklist for new users */}
      {showSetupChecklist && (
        <SetupChecklist
          onComplete={() => {
            setShowSetupChecklist(false);
            localStorage.setItem('solowipe_setup_checklist_dismissed', 'true');
          }}
          onDismiss={() => {
            setShowSetupChecklist(false);
            localStorage.setItem('solowipe_setup_checklist_dismissed', 'true');
          }}
        />
      )}

      {/* Business Name Modal for OAuth sign-ups */}
      <BusinessNameModal
        isOpen={showBusinessNameModal}
        onComplete={handleBusinessNameComplete}
      />
    </div>
  );
};

export default Index;
