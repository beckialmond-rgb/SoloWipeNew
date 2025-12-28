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
import { CompletedJobItem } from '@/components/CompletedJobItem';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UpcomingJobsSection } from '@/components/UpcomingJobsSection';
import { TextCustomerButton } from '@/components/TextCustomerButton';
import { TomorrowSMSButton } from '@/components/TomorrowSMSButton';
import { RescheduleJobModal } from '@/components/RescheduleJobModal';
import { BulkRescheduleModal } from '@/components/BulkRescheduleModal';
import { JobNotesModal } from '@/components/JobNotesModal';
import { OnMyWayButton } from '@/components/OnMyWayButton';
import { QuickAddCustomerModal } from '@/components/QuickAddCustomerModal';
import { WelcomeFlow } from '@/components/WelcomeFlow';
import { WelcomeTour, useWelcomeTour } from '@/components/WelcomeTour';
import { SetupChecklist } from '@/components/SetupChecklist';
import { HelperWelcomeCelebration } from '@/components/HelperWelcomeCelebration';
import { AskForReviewButton } from '@/components/AskForReviewButton';
import { PriceAdjustModal } from '@/components/PriceAdjustModal';
import { PhotoCaptureModal } from '@/components/PhotoCaptureModal';
import { OptimizeRouteButton } from '@/components/OptimizeRouteButton';
import { MarkPaidModal } from '@/components/MarkPaidModal';
import { BusinessNameModal } from '@/components/BusinessNameModal';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
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
  
  // Enable job reminders for upcoming jobs
  const allUpcomingJobs = [...pendingJobs, ...upcomingJobs];
  useJobReminders(allUpcomingJobs);
  
  // Filter jobs for tomorrow
  const tomorrowDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const tomorrowJobs = useMemo(() => {
    return [...pendingJobs, ...upcomingJobs].filter(job => 
      job.scheduled_date === tomorrowDate
    );
  }, [pendingJobs, upcomingJobs, tomorrowDate]);
  
  const [localJobs, setLocalJobs] = useState<JobWithCustomerAndAssignment[]>([]);
  // Track previous job IDs to prevent unnecessary updates
  const previousJobIdsRef = useRef<string>('');
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [jobToSkip, setJobToSkip] = useState<JobWithCustomer | null>(null);
  const [notesJob, setNotesJob] = useState<JobWithCustomer | null>(null);
  const [assignmentPickerOpen, setAssignmentPickerOpen] = useState(false);
  const [selectedJobForAssignment, setSelectedJobForAssignment] = useState<JobWithCustomerAndAssignment | null>(null);
  
  // Determine if user is Owner or Helper
  // Owner: has customers
  // Helper: has assigned jobs OR is in team_members (even if no current assignments)
  // This prevents helper status from being lost when all jobs are completed
  const isOwner = customers.length > 0;
  const isHelper = assignedJobs.length > 0 || (teamMemberships?.length ?? 0) > 0;
  
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
  const [completedOpen, setCompletedOpen] = useState(true);
  const [smsQueue, setSmsQueue] = useState<{ index: number; jobIds: string[] } | null>(null);
  const [showNextSMS, setShowNextSMS] = useState(false);
  const [receiptQueue, setReceiptQueue] = useState<{ index: number; jobIds: string[] } | null>(null);
  const [showNextReceipt, setShowNextReceipt] = useState(false);
  const [sentReceipts, setSentReceipts] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('solowipe_sent_receipts');
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [tomorrowJobsHidden, setTomorrowJobsHidden] = useState(() => {
    return localStorage.getItem('solowipe_tomorrow_jobs_hidden') === 'true';
  });
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
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkRescheduleModalOpen, setBulkRescheduleModalOpen] = useState(false);
  const [bulkCompleteConfirmOpen, setBulkCompleteConfirmOpen] = useState(false);
  const [isBulkCompleting, setIsBulkCompleting] = useState(false);
  const [jobFilter, setJobFilter] = useState<'all' | 'today' | 'overdue' | 'unpaid'>('all');
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

  // Handle sequential SMS sending - detect when user returns from SMS app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && smsQueue) {
        // User returned to app - show "Next" button or auto-continue
        setShowNextSMS(true);
      }
    };

    const handleFocus = () => {
      if (smsQueue) {
        setShowNextSMS(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [smsQueue]);

  // Handle "Send All" SMS workflow
  const handleSendAllSMS = () => {
    const jobsWithPhone = tomorrowJobs.filter(job => job.customer?.mobile_phone);
    if (jobsWithPhone.length === 0) return;

    // Store queue in state and localStorage
    const jobIds = jobsWithPhone.map(job => job.id);
    const queue = { index: 0, jobIds };
    setSmsQueue(queue);
    localStorage.setItem('solowipe_sms_queue', JSON.stringify(queue));

    // Open first SMS
    openSMSForJob(jobsWithPhone[0], 0, jobIds);
  };

  const openSMSForJob = (job: JobWithCustomer, index: number, jobIds: string[]) => {
    if (!job.customer?.mobile_phone) return;

    const customerName = job.customer.name || 'Customer';
    const customerAddress = job.customer.address || 'No address';
    // Use actual job price from customer, ensure it's a valid number
    const jobPrice = (job.customer.price && job.customer.price > 0) ? job.customer.price : undefined;
    const isGoCardlessActive = job.customer?.gocardless_mandate_status === 'active' && !!job.customer?.gocardless_id;

    const context = prepareSMSContext({
      customerName,
      customerAddress,
      price: jobPrice,
      jobTotal: jobPrice, // Also set jobTotal for consistency
      scheduledDate: job.scheduled_date,
      isGoCardlessActive,
      businessName,
      serviceType: 'Window Clean',
    });

    showTemplatePicker('tomorrow_sms_button', context, (message) => {
      // Mark as sent in queue (but don't mark individual receipts)
      setShowNextSMS(false);
      openSMSApp(job.customer.mobile_phone!, message, user?.id, job.id);
    });
  };

  const handleNextSMS = () => {
    if (!smsQueue) return;

    const nextIndex = smsQueue.index + 1;
    const nextJobId = smsQueue.jobIds[nextIndex];

    if (nextIndex >= smsQueue.jobIds.length) {
      // All done
      setSmsQueue(null);
      setShowNextSMS(false);
      localStorage.removeItem('solowipe_sms_queue');
      toast({
        title: 'All reminders sent!',
        description: `Sent ${smsQueue.jobIds.length} reminder${smsQueue.jobIds.length > 1 ? 's' : ''}.`,
      });
      return;
    }

    // Find next job
    const nextJob = tomorrowJobs.find(job => job.id === nextJobId);
    if (nextJob) {
      const updatedQueue = { ...smsQueue, index: nextIndex };
      setSmsQueue(updatedQueue);
      localStorage.setItem('solowipe_sms_queue', JSON.stringify(updatedQueue));
      openSMSForJob(nextJob, nextIndex, smsQueue.jobIds);
    }
  };

  const handleCancelSMSQueue = () => {
    setSmsQueue(null);
    setShowNextSMS(false);
    localStorage.removeItem('solowipe_sms_queue');
  };

  // Handle sequential receipt sending - detect when user returns from SMS app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && receiptQueue) {
        setShowNextReceipt(true);
      }
    };

    const handleFocus = () => {
      if (receiptQueue) {
        setShowNextReceipt(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [receiptQueue]);

  // Handle "Send All Service Receipts" workflow
  const handleSendAllReceipts = () => {
    const jobsWithPhone = completedToday.filter(job => job.customer?.mobile_phone && !sentReceipts.has(job.id));
    if (jobsWithPhone.length === 0) return;

    // Store queue in state and localStorage
    const jobIds = jobsWithPhone.map(job => job.id);
    const queue = { index: 0, jobIds };
    setReceiptQueue(queue);
    localStorage.setItem('solowipe_receipt_queue', JSON.stringify(queue));

    // Open first receipt SMS
    openReceiptSMS(jobsWithPhone[0], 0, jobIds);
  };

  const openReceiptSMS = async (job: JobWithCustomer, index: number, jobIds: string[]) => {
    if (!job.customer?.mobile_phone) return;

    const customerName = job.customer.name || 'Customer';
    const customerAddress = job.customer.address || 'No address';
    // Use actual job amount_collected, fallback to customer price - ensure it's a valid number
    const jobAmount = (job.amount_collected && job.amount_collected > 0) 
      ? job.amount_collected 
      : ((job.customer.price && job.customer.price > 0) ? job.customer.price : undefined);
    const completedDateFormatted = job.completed_at 
      ? format(new Date(job.completed_at), 'd MMM yyyy')
      : '';

    // Handle photo URL shortening if needed (template system will handle inclusion)
    let photoUrl = job.photo_url;
    if (photoUrl) {
      try {
        const encodedUrl = encodeURIComponent(photoUrl);
        const tinyUrlResponse = await fetch(`https://tinyurl.com/api-create.php?url=${encodedUrl}`, {
          method: 'GET',
          headers: { 'Accept': 'text/plain' }
        });
        
        if (tinyUrlResponse.ok) {
          const shortUrl = await tinyUrlResponse.text();
          if (shortUrl && !shortUrl.toLowerCase().includes('error') && shortUrl.startsWith('http')) {
            photoUrl = shortUrl.trim();
          }
        }
      } catch (error) {
        console.warn('[Receipt SMS] Failed to shorten URL, using original:', error);
      }
    }

    // Format payment method for receipt - use actual, fallback to preferred
    const formatPaymentMethod = (method: string | null, preferredMethod: string | null): string => {
      // Actual payment method set - use it
      if (method) {
        if (method === 'gocardless') return 'Direct Debit';
        if (method === 'cash') return 'Cash';
        if (method === 'transfer') return 'Bank Transfer';
        return method.charAt(0).toUpperCase() + method.slice(1);
      }
      
      // No actual method - try preferred as fallback
      if (preferredMethod === 'gocardless') return 'Direct Debit (Expected)';
      if (preferredMethod === 'cash') return 'Cash (Expected)';
      if (preferredMethod === 'transfer') return 'Bank Transfer (Expected)';
      
      return 'Not specified';
    };

    const context = prepareSMSContext({
      customerName,
      customerAddress,
      price: jobAmount,
      jobTotal: jobAmount,
      completedDate: completedDateFormatted,
      photoUrl: photoUrl,
      businessName,
      paymentMethod: formatPaymentMethod(job.payment_method, job.customer?.preferred_payment_method || null),
    });

    showTemplatePicker('receipt_sms', context, (message) => {
      // Mark as sent
      const newSentReceipts = new Set(sentReceipts);
      newSentReceipts.add(job.id);
      setSentReceipts(newSentReceipts);
      localStorage.setItem('solowipe_sent_receipts', JSON.stringify([...newSentReceipts]));

      setShowNextReceipt(false);
              openSMSApp(job.customer.mobile_phone!, message, user?.id, job.id);
    });
  };

  const handleNextReceipt = async () => {
    if (!receiptQueue) return;

    const nextIndex = receiptQueue.index + 1;
    const nextJobId = receiptQueue.jobIds[nextIndex];

    if (nextIndex >= receiptQueue.jobIds.length) {
      // All done
      setReceiptQueue(null);
      setShowNextReceipt(false);
      localStorage.removeItem('solowipe_receipt_queue');
      toast({
        title: 'All receipts sent!',
        description: `Sent ${receiptQueue.jobIds.length} service receipt${receiptQueue.jobIds.length > 1 ? 's' : ''}.`,
      });
      return;
    }

    // Find next job
    const nextJob = completedToday.find(job => job.id === nextJobId);
    if (nextJob) {
      const updatedQueue = { ...receiptQueue, index: nextIndex };
      setReceiptQueue(updatedQueue);
      localStorage.setItem('solowipe_receipt_queue', JSON.stringify(updatedQueue));
      await openReceiptSMS(nextJob, nextIndex, receiptQueue.jobIds);
    }
  };

  const handleCancelReceiptQueue = () => {
    setReceiptQueue(null);
    setShowNextReceipt(false);
    localStorage.removeItem('solowipe_receipt_queue');
  };

  // Restore SMS queue on mount
  useEffect(() => {
    const stored = localStorage.getItem('solowipe_sms_queue');
    if (stored) {
      try {
        const queue = JSON.parse(stored);
        setSmsQueue(queue);
        setShowNextSMS(true);
      } catch (e) {
        localStorage.removeItem('solowipe_sms_queue');
      }
    }

    // Restore receipt queue on mount
    const receiptStored = localStorage.getItem('solowipe_receipt_queue');
    if (receiptStored) {
      try {
        const queue = JSON.parse(receiptStored);
        setReceiptQueue(queue);
        setShowNextReceipt(true);
      } catch (e) {
        localStorage.removeItem('solowipe_receipt_queue');
      }
    }
  }, []);

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

  const handleSkipRequest = (job: JobWithCustomer) => {
    setJobToSkip(job);
    setSkipConfirmOpen(true);
  };

  const handleSkipRequestById = (jobId: string) => {
    const job = localJobs.find(j => j.id === jobId);
    if (job) {
      handleSkipRequest(job);
    } else {
      // Job not found - might have been completed or removed
      toast({
        title: 'Job not found',
        description: 'This job may have already been completed or removed.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmSkip = async () => {
    if (!jobToSkip) return;
    
    const jobId = jobToSkip.id;
    const customerName = jobToSkip.customer?.name || 'Customer';
    setSkipConfirmOpen(false);
    
    // Save current state for rollback
    const previousJobs = [...localJobs];
    
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
      // Rollback on error - refetch to get current state
      await refetchAll();
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to skip job. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setJobToSkip(null);
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

  // Filter jobs based on selected filter
  const today = format(new Date(), 'yyyy-MM-dd');
  const filteredLocalJobs = useMemo(() => {
    if (jobFilter === 'all') {
      return localJobs;
    } else if (jobFilter === 'today') {
      return localJobs.filter(job => job.scheduled_date === today);
    } else if (jobFilter === 'overdue') {
      return localJobs.filter(job => job.scheduled_date < today);
    } else if (jobFilter === 'unpaid') {
      // For unpaid, we need to check completedToday since localJobs are pending
      return completedToday.filter(job => job.payment_status === 'unpaid');
    }
    return localJobs;
  }, [localJobs, jobFilter, today, completedToday]);

  // Use filtered jobs for display, but keep localJobs for operations in bulk mode
  const jobsToShow = bulkRescheduleMode ? localJobs : filteredLocalJobs;
  
  // Bulk mode can only be used when not viewing unpaid (completed) jobs
  const canUseBulkMode = jobFilter !== 'unpaid';

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
                  <div className="bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl p-4 md:p-5 border-2 border-white/30 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 ease-out">
                    <div className="w-12 h-12 md:w-14 md:h-14 mx-auto rounded-full bg-blue-500 dark:bg-blue-500 flex items-center justify-center mb-3 shadow-md">
                      <Clock className="w-6 h-6 md:w-7 md:h-7 text-white dark:text-white" />
                    </div>
                    <p className="text-3xl md:text-4xl font-extrabold text-white dark:text-white text-center leading-tight">{localJobs.length}</p>
                    <p className="text-slate-200 dark:text-slate-200 text-xs md:text-sm font-semibold text-center mt-2 uppercase tracking-wide">{isHelper && !isOwner ? 'Assigned' : 'Pending'}</p>
                  </div>
                  <div className="bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl p-4 md:p-5 border-2 border-white/30 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 ease-out">
                    <div className="w-12 h-12 md:w-14 md:h-14 mx-auto rounded-full bg-emerald-500 dark:bg-emerald-500 flex items-center justify-center mb-3 shadow-md">
                      <CheckCircle className="w-6 h-6 md:w-7 md:h-7 text-white dark:text-white" />
                    </div>
                    <p className="text-3xl md:text-4xl font-extrabold text-white dark:text-white text-center leading-tight">{completedToday.length}</p>
                    <p className="text-slate-200 dark:text-slate-200 text-xs md:text-sm font-semibold text-center mt-2 uppercase tracking-wide">Done</p>
                  </div>
                  <div className="bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl p-4 md:p-5 border-2 border-white/30 dark:border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 ease-out">
                    <div className="w-12 h-12 md:w-14 md:h-14 mx-auto rounded-full bg-green-500 dark:bg-green-500 flex items-center justify-center mb-3 shadow-md">
                      <PoundSterling className="w-6 h-6 md:w-7 md:h-7 text-white dark:text-white" />
                    </div>
                    <p className="text-3xl md:text-4xl font-extrabold text-green-200 dark:text-green-300 text-center leading-tight">£{todayEarnings}</p>
                    <p className="text-slate-200 dark:text-slate-200 text-xs md:text-sm font-semibold text-center mt-2 uppercase tracking-wide">Earned</p>
                  </div>
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

            {/* Jobs count badge and action buttons */}
            {localJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="mb-6 flex items-center justify-between gap-4"
              >
                <div className="inline-flex items-center gap-3 px-4 md:px-5 py-2.5 md:py-3 bg-primary/15 dark:bg-primary/20 text-primary dark:text-primary rounded-xl border-2 border-primary/40 dark:border-primary/40 shadow-md hover:shadow-lg transition-all duration-300 ease-out">
                  <span className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base md:text-lg font-extrabold shadow-sm">
                    {localJobs.length}
                  </span>
                  <span className="font-semibold text-base md:text-lg text-foreground dark:text-foreground">
                    {localJobs.length === 1 ? 'job' : 'jobs'} today
                  </span>
                </div>
                
                <div className="flex items-center gap-3 md:gap-4">
                  {!bulkRescheduleMode ? (
                    <>
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
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => setBulkRescheduleMode(true)}
                        disabled={completingJobId !== null || bulkRescheduleModeForUpcoming}
                        className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md transition-all duration-300 ease-out"
                      >
                        <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                        <span className="hidden sm:inline">Bulk Reschedule</span>
                        <span className="sm:hidden">Reschedule</span>
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="default"
                        onClick={selectAllJobs}
                        className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={clearBulkSelection}
                        className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                      <Button
                        size="default"
                        onClick={() => setBulkCompleteConfirmOpen(true)}
                        disabled={selectedJobIds.size === 0 || isBulkCompleting}
                        className="gap-2 bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-sm hover:shadow-md"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete ({selectedJobIds.size})
                      </Button>
                      <Button
                        size="default"
                        onClick={() => setBulkRescheduleModalOpen(true)}
                        disabled={selectedJobIds.size === 0}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md"
                      >
                        <Calendar className="w-4 h-4" />
                        Reschedule ({selectedJobIds.size})
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Quick Filters */}
            {(localJobs.length > 0 || (jobFilter === 'unpaid' && completedToday.length > 0)) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex flex-col sm:flex-row gap-2"
              >
                <button
                  onClick={() => setJobFilter('all')}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 touch-sm min-h-[44px]",
                    jobFilter === 'all'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                  )}
                >
                  All
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                    jobFilter === 'all' ? "bg-primary-foreground/20" : "bg-background"
                  )}>
                    {localJobs.length}
                  </span>
                </button>
                <button
                  onClick={() => setJobFilter('today')}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 touch-sm min-h-[44px]",
                    jobFilter === 'today'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                  )}
                >
                  Today
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                    jobFilter === 'today' ? "bg-primary-foreground/20" : "bg-background"
                  )}>
                    {localJobs.filter(j => j.scheduled_date === today).length}
                  </span>
                </button>
                <button
                  onClick={() => setJobFilter('overdue')}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 touch-sm min-h-[44px]",
                    jobFilter === 'overdue'
                      ? "bg-destructive text-destructive-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                  )}
                >
                  Overdue
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                    jobFilter === 'overdue' ? "bg-destructive-foreground/20" : "bg-background"
                  )}>
                    {localJobs.filter(j => j.scheduled_date < today).length}
                  </span>
                </button>
                {completedToday.filter(j => j.payment_status === 'unpaid').length > 0 && (
                  <button
                    onClick={() => {
                      // Exit bulk mode when switching to unpaid filter (incompatible)
                      if (bulkRescheduleMode) {
                        setBulkRescheduleMode(false);
                        setSelectedJobIds(new Set());
                      }
                      setJobFilter('unpaid');
                    }}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 touch-sm min-h-[44px]",
                      jobFilter === 'unpaid'
                        ? "bg-warning text-warning-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                    )}
                  >
                    Unpaid
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center",
                      jobFilter === 'unpaid' ? "bg-warning-foreground/20" : "bg-background"
                    )}>
                      {completedToday.filter(j => j.payment_status === 'unpaid').length}
                    </span>
                  </button>
                )}
              </motion.div>
            )}

            {/* Route optimization */}
            {localJobs.length >= 2 && jobFilter === 'all' && (
              <div className="mb-4">
                <OptimizeRouteButton jobs={localJobs} onReorder={handleReorder} />
              </div>
            )}

            {/* Bulk reschedule mode header */}
            {(bulkRescheduleMode && canUseBulkMode && selectedJobIds.size > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-primary/10 rounded-xl border border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {selectedJobIds.size} of {localJobs.length} job{localJobs.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
              </motion.div>
            )}
            
            {/* Warning when unpaid filter is active - bulk mode disabled */}
            {jobFilter === 'unpaid' && bulkRescheduleMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-warning/10 rounded-xl border border-warning/20"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm text-foreground">
                    Bulk operations are not available for completed jobs. Switch to "All" or "Today" filter to use bulk actions.
                  </span>
                </div>
              </motion.div>
            )}

            {/* Jobs list - Drag to reorder (disabled in bulk mode) */}
            {/* Bulk mode is disabled for unpaid filter (completed jobs) */}
            {jobFilter === 'unpaid' ? (
              // Show unpaid jobs from completedToday
              <div className="space-y-4 md:space-y-6">
                <AnimatePresence mode="popLayout">
                  {filteredLocalJobs.map((job, index) => (
                    <div key={job.id}>
                      <CompletedJobItem
                        job={job}
                        index={index}
                        businessName={businessName}
                        onAddNote={(job) => setNotesJob(job)}
                        onMarkPaid={(job) => !isMarkingPaid && handleMarkPaidRequest(job)}
                        isProcessing={isMarkingPaid}
                        receiptSent={sentReceipts.has(job.id)}
                        isCurrentInQueue={receiptQueue && receiptQueue.jobIds[receiptQueue.index] === job.id}
                        onReceiptSent={(jobId) => {
                          const newSentReceipts = new Set(sentReceipts);
                          newSentReceipts.add(jobId);
                          setSentReceipts(newSentReceipts);
                          localStorage.setItem('solowipe_sent_receipts', JSON.stringify([...newSentReceipts]));
                        }}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <Reorder.Group 
                axis="y" 
                values={(bulkRescheduleMode && canUseBulkMode) ? [] : jobsToShow} 
                onReorder={(bulkRescheduleMode && canUseBulkMode) ? () => {} : handleReorder} 
                className="space-y-4 md:space-y-6"
              >
                <AnimatePresence mode="popLayout">
                  {jobsToShow.map((job, index) => {
                    const isSelected = selectedJobIds.has(job.id);
                    // Ensure job has assignment properties for assignment feature
                    const jobWithAssignment: JobWithCustomerAndAssignment = {
                      ...job,
                      assignment: 'assignment' in job ? job.assignment : undefined,
                      assignments: 'assignments' in job ? job.assignments : undefined
                    };
                    return (
                      <div key={job.id} className="flex items-center gap-3">
                        {(bulkRescheduleMode && canUseBulkMode) && (
                          <button
                            onClick={() => toggleSelectJob(job.id)}
                            className="flex-shrink-0 transition-colors mt-2"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-6 h-6 text-primary" />
                            ) : (
                              <Square className="w-6 h-6 text-muted-foreground" />
                            )}
                          </button>
                        )}
                        <div className="flex-1">
                          <JobCard
                            job={jobWithAssignment}
                            businessName={businessName}
                            onComplete={handleCompleteRequest}
                            onSkip={handleSkipRequestById}
                            index={index}
                            isNextUp={index === 0}
                            onAssignClick={isOwner ? handleAssignClick : undefined}
                            showAssignment={isOwner}
                          />
                        </div>
                      </div>
                    );
                  })}
                </AnimatePresence>
              </Reorder.Group>
            )}

            {/* Empty state for filtered results */}
            {jobsToShow.length === 0 && localJobs.length > 0 && (
              <EmptyState
                title={`No ${jobFilter === 'today' ? 'today\'s' : jobFilter === 'overdue' ? 'overdue' : jobFilter === 'unpaid' ? 'unpaid' : ''} jobs`}
                description={jobFilter === 'today' ? 'No jobs scheduled for today' : jobFilter === 'overdue' ? 'No overdue jobs' : jobFilter === 'unpaid' ? 'All jobs are paid' : 'No jobs found'}
                icon={<Clock className="w-8 h-8 text-primary" />}
              />
            )}

            {/* Empty state for today */}
            {localJobs.length === 0 && completedToday.length === 0 && 
             (isOwner ? customers.length > 0 : assignedJobs.length === 0) && (
              <EmptyState
                title="All done for today!"
                description="Great work! You've completed all your scheduled jobs."
                icon={<Sparkles className="w-8 h-8 text-accent" />}
              />
            )}

            {/* Contextual empty state for helpers */}
            {isHelper && !isOwner && assignedJobs.length === 0 && localJobs.length === 0 && (
              <EmptyState
                title="Waiting for job assignments"
                description="Your owner will assign jobs to you here. You'll see them automatically when they're assigned, and you'll get notifications too."
                icon={<UserCheck className="w-8 h-8 text-primary" />}
              />
            )}

            {/* Empty state for new owners without welcome */}
            {localJobs.length === 0 && customers.length === 0 && !showWelcome && isOwner && (
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

            {/* Tomorrow's Jobs Section */}
            {tomorrowJobs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                className="mt-10 md:mt-12"
              >
                <button
                  onClick={() => {
                    if (tomorrowJobsHidden) {
                      setTomorrowJobsHidden(false);
                      localStorage.removeItem('solowipe_tomorrow_jobs_hidden');
                    } else {
                      setTomorrowJobsHidden(true);
                      localStorage.setItem('solowipe_tomorrow_jobs_hidden', 'true');
                    }
                  }}
                  className="flex items-center justify-between w-full py-2 mb-4"
                  aria-label={tomorrowJobsHidden ? "Show tomorrow's jobs" : "Hide tomorrow's jobs"}
                >
                  <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
                    Tomorrow's Jobs ({tomorrowJobs.length})
                  </h2>
                  {tomorrowJobsHidden ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
                
                {!tomorrowJobsHidden && (
                  <>
                    {/* Send All Button */}
                    {tomorrowJobs.filter(job => job.customer?.mobile_phone).length > 1 && (
                      <div className="mb-4">
                        <Button
                          onClick={handleSendAllSMS}
                          className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                          disabled={!!smsQueue}
                        >
                          <MessageSquare className="w-4 h-4" />
                          {smsQueue ? `Sending ${smsQueue.index + 1}/${smsQueue.jobIds.length}...` : 'Send All Reminders'}
                        </Button>
                      </div>
                    )}

                    {/* Next SMS Button (shown when queue is active) */}
                    {showNextSMS && smsQueue && (
                      <div className="mb-4 p-3 bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40 rounded-lg">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {smsQueue.index + 1} of {smsQueue.jobIds.length} sent
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Ready for next reminder?
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={handleNextSMS}
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                              Next
                            </Button>
                            <Button
                              onClick={handleCancelSMSQueue}
                              size="sm"
                              variant="ghost"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 md:space-y-4">
                      {tomorrowJobs.map((job, index) => {
                        const customerName = job.customer?.name || 'Customer';
                        const isInQueue = smsQueue?.jobIds.includes(job.id);
                        const isCurrentInQueue = smsQueue && smsQueue.jobIds[smsQueue.index] === job.id;
                        
                        return (
                          <motion.div
                            key={job.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              "bg-card rounded-xl border-2 border-border/60 dark:border-border/80 p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 ease-out",
                              isCurrentInQueue && "ring-2 ring-primary shadow-md"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-1">
                                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                  <h3 className="font-semibold text-foreground text-base leading-tight truncate min-w-0">
                                    {job.customer?.address || 'No address'}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xl font-bold text-foreground">
                                    £{job.customer?.price || 0}
                                  </span>
                                  <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                                    {customerName}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Assignment and SMS buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                {/* Assignment Avatar - only show for owners */}
                                {isOwner && (
                                  <JobAssignmentAvatar
                                    job={job as JobWithCustomerAndAssignment}
                                    onClick={() => handleAssignClick(job as JobWithCustomerAndAssignment)}
                                    size="sm"
                                  />
                                )}
                                
                                {/* SMS Button with tomorrow reminder template */}
                                <TomorrowSMSButton
                                  phoneNumber={job.customer?.mobile_phone}
                                  customerName={customerName}
                                  customerAddress={job.customer?.address || 'your address'}
                                  jobPrice={job.customer?.price || 0}
                                  scheduledDate={job.scheduled_date}
                                  isGoCardlessActive={job.customer?.gocardless_mandate_status === 'active' && !!job.customer?.gocardless_id}
                                  businessName={businessName}
                                  iconOnly={true}
                                  jobId={job.id}
                                />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Completed Today Section */}
            {completedToday.length > 0 && (
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen} className="mt-10 md:mt-12">
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:opacity-80 transition-opacity duration-300">
                  <h2 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
                    Completed Today ({completedToday.length})
                  </h2>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${completedOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 md:space-y-4 mt-4 pb-24">
                  {/* Send All Service Receipts Button */}
                  {completedToday.filter(job => job.customer?.mobile_phone && !sentReceipts.has(job.id)).length > 1 && (
                    <div className="mb-4">
                      <Button
                        onClick={handleSendAllReceipts}
                        className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={!!receiptQueue}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {receiptQueue ? `Sending ${receiptQueue.index + 1}/${receiptQueue.jobIds.length}...` : 'Send All Service Receipts'}
                      </Button>
                    </div>
                  )}

                  {/* Next Receipt Button (shown when queue is active) */}
                  {showNextReceipt && receiptQueue && (
                    <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {receiptQueue.index + 1} of {receiptQueue.jobIds.length} sent
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Ready for next receipt?
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handleNextReceipt}
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Next
                          </Button>
                          <Button
                            onClick={handleCancelReceiptQueue}
                            size="sm"
                            variant="ghost"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {completedToday.map((job, index) => (
                    <div key={job.id}>
                      <CompletedJobItem
                        job={job}
                        index={index}
                        businessName={businessName}
                        onAddNote={(job) => setNotesJob(job)}
                        onMarkPaid={(job) => !isMarkingPaid && handleMarkPaidRequest(job)}
                        isProcessing={isMarkingPaid}
                        receiptSent={sentReceipts.has(job.id)}
                        isCurrentInQueue={receiptQueue && receiptQueue.jobIds[receiptQueue.index] === job.id}
                        onReceiptSent={(jobId) => {
                          const newSentReceipts = new Set(sentReceipts);
                          newSentReceipts.add(jobId);
                          setSentReceipts(newSentReceipts);
                          localStorage.setItem('solowipe_sent_receipts', JSON.stringify([...newSentReceipts]));
                        }}
                      />
                      {/* Ask for Review button after completion - only if google review link is configured */}
                      {job.customer?.mobile_phone && profile?.google_review_link && (
                        <div className="mt-3 mb-6 flex justify-end">
                          <AskForReviewButton
                            customerName={job.customer.name || 'Customer'}
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
            <div className="mt-8">
              {/* Bulk Reschedule Toggle for Upcoming Jobs */}
              {upcomingJobs.length > 0 && (
                <div className="mb-4 flex items-center justify-end">
                  {!bulkRescheduleModeForUpcoming ? (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => setBulkRescheduleModeForUpcoming(true)}
                      disabled={bulkRescheduleMode}
                      className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md transition-all duration-300 ease-out"
                    >
                      <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="hidden sm:inline">Bulk Reschedule</span>
                      <span className="sm:hidden">Reschedule</span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="default"
                        onClick={selectAllUpcomingJobs}
                        className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          // Only clear upcoming jobs from selection, keep pending if any
                          setSelectedJobIds(prev => {
                            const newSet = new Set(prev);
                            upcomingJobs.forEach(job => newSet.delete(job.id));
                            return newSet;
                          });
                          setBulkRescheduleModeForUpcoming(false);
                        }}
                        className="gap-2 border-2 font-semibold shadow-sm hover:shadow-md"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                      <Button
                        size="default"
                        onClick={() => setBulkRescheduleModalOpen(true)}
                        disabled={selectedJobIds.size === 0 || !Array.from(selectedJobIds).some(id => upcomingJobs.some(j => j.id === id))}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md"
                      >
                        <Calendar className="w-4 h-4" />
                        Reschedule ({Array.from(selectedJobIds).filter(id => upcomingJobs.some(j => j.id === id)).length})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Bulk mode header for upcoming jobs */}
              {(bulkRescheduleModeForUpcoming && selectedJobIds.size > 0 && Array.from(selectedJobIds).some(id => upcomingJobs.some(j => j.id === id))) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 bg-primary/10 rounded-xl border border-primary/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {Array.from(selectedJobIds).filter(id => upcomingJobs.some(j => j.id === id)).length} of {upcomingJobs.length} upcoming job{upcomingJobs.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                </motion.div>
              )}

              <UpcomingJobsSection 
                jobs={upcomingJobs} 
                businessName={businessName} 
                onJobClick={handleJobClick} 
                onSkip={handleSkipRequest}
                bulkMode={bulkRescheduleModeForUpcoming}
                selectedJobIds={selectedJobIds}
                onToggleSelect={toggleSelectJob}
                onSelectAll={selectAllUpcomingJobs}
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
                  This will reschedule <strong>{jobToSkip.customer?.name || 'Customer'}</strong> at{' '}
                  <strong>{jobToSkip.customer?.address || 'this address'}</strong> to the next scheduled interval 
                  ({jobToSkip.customer?.frequency_weeks || 0} weeks from today).
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
        helpers={helpers.map(h => ({
          id: h.id,
          email: h.email || '',
          name: h.name,
          initials: h.initials,
          isPlaceholder: h.isPlaceholder
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
