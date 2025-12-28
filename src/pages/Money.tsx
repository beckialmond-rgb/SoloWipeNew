import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CheckCircle, Clock, CheckSquare, Square, CreditCard, MessageSquare, TrendingUp, AlertCircle, Target, Banknote, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UnpaidJobCard } from '@/components/UnpaidJobCard';
import { MarkPaidModal } from '@/components/MarkPaidModal';
import { BatchPaymentModal } from '@/components/BatchPaymentModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';
import { JobWithCustomer } from '@/types/database';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { format, differenceInDays, startOfWeek, isSameDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { prepareSMSContext, openSMSApp } from '@/utils/openSMS';

const Money = () => {
  const { unpaidJobs, paidThisWeek, totalOutstanding, markJobPaid, batchMarkPaid, undoMarkPaid, isLoading, profile, isMarkingPaid, isBatchMarkingPaid, weeklyEarnings, businessName } = useSupabaseData();
  const { toast, dismiss } = useToast();
  const { requirePremium } = useSoftPaywall();
  const { showTemplatePicker } = useSMSTemplateContext();
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);

  // Calculate estimated payout date for GoCardless payments (3-5 working days)
  const calculateEstimatedPayoutDate = (paymentDate: string | null): string | null => {
    if (!paymentDate) return null;
    const date = new Date(paymentDate);
    // Add 4 working days (average of 3-5 range, excluding weekends)
    let daysAdded = 0;
    let workingDays = 0;
    while (workingDays < 4) {
      date.setDate(date.getDate() + 1);
      daysAdded++;
      if (date.getDay() !== 0 && date.getDay() !== 6) { // Not weekend
        workingDays++;
      }
    }
    return format(date, 'd MMM yyyy');
  };
  const [selectMode, setSelectMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'gocardless' | 'cash' | 'transfer'>('all');
  const [successAnimationId, setSuccessAnimationId] = useState<string | null>(null);
  const [collectingJobId, setCollectingJobId] = useState<string | null>(null);

  // Calculate overdue jobs and sort: Active DD first, then overdue, then current
  const { sortedUnpaidJobs, overdueCount, overdueAmount } = useMemo(() => {
    const now = new Date();
    const activeDD: JobWithCustomer[] = [];
    const overdue: JobWithCustomer[] = [];
    const current: JobWithCustomer[] = [];

    unpaidJobs.forEach(job => {
      // Prioritize jobs with Active DD mandate
      const hasActiveDD = job.customer?.gocardless_mandate_status === 'active' && job.customer?.gocardless_id;
      
      if (hasActiveDD) {
        activeDD.push(job);
      } else if (job.completed_at) {
        const daysSince = differenceInDays(now, new Date(job.completed_at));
        if (daysSince > 7) {
          overdue.push(job);
        } else {
          current.push(job);
        }
      } else {
        current.push(job);
      }
    });

    // Sort Active DD by date (newest first)
    activeDD.sort((a, b) => {
      if (!a.completed_at || !b.completed_at) return 0;
      return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
    });

    // Sort overdue by days (oldest first)
    overdue.sort((a, b) => {
      if (!a.completed_at || !b.completed_at) return 0;
      return new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime();
    });

    // Sort current by date (newest first)
    current.sort((a, b) => {
      if (!a.completed_at || !b.completed_at) return 0;
      return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
    });

    // Priority order: Active DD → Overdue → Current
    const sorted = [...activeDD, ...overdue, ...current];
    const overdueTotal = overdue.reduce((sum, job) => sum + (job.amount_collected || 0), 0);

    return {
      sortedUnpaidJobs: sorted,
      overdueCount: overdue.length,
      overdueAmount: overdueTotal,
    };
  }, [unpaidJobs]);

  // Calculate DD earnings summary with fee breakdown
  const ddEarnings = useMemo(() => {
    const ddJobs = paidThisWeek.filter(job => job.payment_method === 'gocardless');
    const grossTotal = ddJobs.reduce((sum, job) => sum + (job.amount_collected || 0), 0);
    const platformFeeTotal = ddJobs.reduce((sum, job) => sum + (job.platform_fee || 0), 0);
    const gocardlessFeeTotal = ddJobs.reduce((sum, job) => sum + (job.gocardless_fee || 0), 0);
    const netTotal = ddJobs.reduce((sum, job) => {
      // Use stored net_amount if available, otherwise calculate
      if (job.net_amount !== null) {
        return sum + job.net_amount;
      }
      // Fallback calculation
      const gross = job.amount_collected || 0;
      const platformFee = job.platform_fee ?? ((gross * 0.0075) + 0.30);
      const gocardlessFee = job.gocardless_fee ?? Math.min((gross * 0.01) + 0.20, 4.00);
      return sum + (gross - platformFee - gocardlessFee);
    }, 0);
    
    // Calculate fees if not stored
    const calcPlatformFee = platformFeeTotal > 0 ? platformFeeTotal : 
      ddJobs.reduce((sum, job) => {
        const gross = job.amount_collected || 0;
        return sum + (job.platform_fee ?? ((gross * 0.0075) + 0.30));
      }, 0);
    
    const calcGoCardlessFee = gocardlessFeeTotal > 0 ? gocardlessFeeTotal :
      ddJobs.reduce((sum, job) => {
        const gross = job.amount_collected || 0;
        return sum + (job.gocardless_fee ?? Math.min((gross * 0.01) + 0.20, 4.00));
      }, 0);
    
    return { 
      count: ddJobs.length, 
      grossTotal,
      platformFeeTotal: calcPlatformFee,
      gocardlessFeeTotal: calcGoCardlessFee,
      netTotal: netTotal > 0 ? netTotal : (grossTotal - calcPlatformFee - calcGoCardlessFee),
    };
  }, [paidThisWeek]);

  // Calculate weekly earnings goal progress using profile target (consistent with BusinessInsights)
  const weeklyGoalProgress = useMemo(() => {
    const thisWeek = weeklyEarnings[0];
    const current = thisWeek?.total || 0;
    
    // Use user-defined weekly target from profile, or calculate default
    const userWeeklyTarget = profile?.weekly_target;
    
    let weeklyTarget: number;
    if (userWeeklyTarget) {
      // User has set a target - use it
      weeklyTarget = userWeeklyTarget;
    } else {
      // Calculate default based on last 4 weeks average (same logic as BusinessInsights)
      const last4Weeks = weeklyEarnings.slice(0, 4);
      const avgWeeklyEarnings = last4Weeks.length > 0 
        ? last4Weeks.reduce((sum, w) => sum + w.total, 0) / last4Weeks.length 
        : 0;
      
      weeklyTarget = avgWeeklyEarnings > 0 
        ? Math.ceil(avgWeeklyEarnings / 50) * 50 + 50 // Round up to nearest 50 + buffer
        : 500; // Default fallback target
    }
    
    const progress = weeklyTarget > 0 ? Math.min((current / weeklyTarget) * 100, 100) : 0;

    return { current, target: weeklyTarget, progress };
  }, [weeklyEarnings, profile?.weekly_target]);

  // Smart batch grouping: group by street/date
  const smartBatchGroups = useMemo(() => {
    const groups: { label: string; jobs: JobWithCustomer[] }[] = [];
    const streetMap = new Map<string, JobWithCustomer[]>();
    const dateMap = new Map<string, JobWithCustomer[]>();

    sortedUnpaidJobs.forEach(job => {
      // Group by street (first line of address)
      const street = job.customer.address.split(/[,\n]/)[0].trim();
      if (!streetMap.has(street)) streetMap.set(street, []);
      streetMap.get(street)!.push(job);

      // Group by completion date
      if (job.completed_at) {
        const dateKey = format(new Date(job.completed_at), 'yyyy-MM-dd');
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
        dateMap.get(dateKey)!.push(job);
      }
    });

    // Create groups (only if 2+ jobs)
    streetMap.forEach((jobs, street) => {
      if (jobs.length >= 2) {
        groups.push({ label: `${jobs.length} jobs on ${street}`, jobs });
      }
    });

    dateMap.forEach((jobs, dateKey) => {
      if (jobs.length >= 2 && !groups.find(g => g.jobs.every(j => jobs.includes(j)))) {
        const date = format(new Date(dateKey), 'd MMM');
        groups.push({ label: `${jobs.length} jobs from ${date}`, jobs });
      }
    });

    return groups;
  }, [sortedUnpaidJobs]);

  // Filter paid jobs by payment method
  const filteredPaidJobs = useMemo(() => {
    if (paymentFilter === 'all') return paidThisWeek;
    return paidThisWeek.filter(job => job.payment_method === paymentFilter);
  }, [paidThisWeek, paymentFilter]);

  // Get counts for each payment method
  const paymentCounts = useMemo(() => ({
    all: paidThisWeek.length,
    gocardless: paidThisWeek.filter(j => j.payment_method === 'gocardless').length,
    cash: paidThisWeek.filter(j => j.payment_method === 'cash').length,
    transfer: paidThisWeek.filter(j => j.payment_method === 'transfer').length,
  }), [paidThisWeek]);

  const handleMarkPaid = (job: JobWithCustomer) => {
    if (!requirePremium('mark-paid')) return;
    setSelectedJob(job);
    setIsMarkPaidOpen(true);
  };

  const handleCollectNow = async (job: JobWithCustomer) => {
    if (!requirePremium('mark-paid')) return;
    
    setCollectingJobId(job.id);
    const jobId = job.id;
    const customerName = job.customer.name;
    const amount = job.amount_collected || job.customer.price;

    try {
      const { data, error } = await supabase.functions.invoke('gocardless-collect-payment', {
        body: {
          jobId,
          customerId: job.customer_id,
          amount,
          description: `Window cleaning - ${customerName}`,
        },
      });

      // Check for error in response data (non-2xx responses from Supabase functions)
      if (data?.error && !error) {
        const errorMessage = typeof data.error === 'string' ? data.error : 'Failed to collect payment';
        if (data.requiresReconnect) {
          toast({
            title: 'Connection expired',
            description: 'Please reconnect GoCardless in Settings.',
            variant: 'destructive',
            duration: 8000,
          });
        } else if (data.requiresNewMandate) {
          toast({
            title: 'Mandate not active',
            description: 'The customer\'s Direct Debit mandate is not active. Please set up a new mandate or collect payment manually.',
            variant: 'destructive',
            duration: 8000,
          });
        } else {
          toast({
            title: 'Collection failed',
            description: errorMessage,
            variant: 'destructive',
            duration: 8000,
          });
        }
        return;
      }

      if (error) {
        const errorBody = error as { context?: { body?: { requiresReconnect?: boolean; requiresNewMandate?: boolean; error?: string } } };
        if (errorBody?.context?.body?.requiresReconnect) {
          toast({
            title: 'Connection expired',
            description: 'Please reconnect GoCardless in Settings.',
            variant: 'destructive',
            duration: 8000,
          });
        } else if (errorBody?.context?.body?.requiresNewMandate) {
          toast({
            title: 'Mandate not active',
            description: 'The customer\'s Direct Debit mandate is not active. Please set up a new mandate or collect payment manually.',
            variant: 'destructive',
            duration: 8000,
          });
        } else {
          const errorMessage = errorBody?.context?.body?.error || (error instanceof Error ? error.message : 'Failed to collect payment');
          toast({
            title: 'Collection failed',
            description: errorMessage,
            variant: 'destructive',
            duration: 8000,
          });
        }
        return;
      }
      
      // Verify success response
      if (!data?.success && !data?.paymentId) {
        toast({
          title: 'Collection failed',
          description: 'Payment collection failed. Please try again.',
          variant: 'destructive',
          duration: 8000,
        });
        return;
      }

      // Success animation
      setSuccessAnimationId(jobId);
      setTimeout(() => setSuccessAnimationId(null), 2000);

      toast({
        title: 'Payment collected!',
        description: `£${amount.toFixed(2)} from ${customerName} via Direct Debit. Processing...`,
        duration: 5000,
      });

      // Refresh data - useSupabaseData will refetch automatically via React Query
    } catch (error) {
      console.error('Failed to collect payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to collect payment. Please try again.';
      toast({
        title: 'Collection failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setCollectingJobId(null);
    }
  };

  const handleSyncPayment = async (job: JobWithCustomer) => {
    if (!requirePremium('mark-paid')) return;
    
    setCollectingJobId(job.id);
    const jobId = job.id;
    const paymentId = job.gocardless_payment_id;

    if (!paymentId) {
      toast({
        title: 'No payment ID',
        description: 'This job does not have a GoCardless payment ID to sync.',
        variant: 'destructive',
      });
      setCollectingJobId(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('gocardless-sync-payment', {
        body: {
          jobId,
          paymentId,
        },
      });

      if (error || data?.error) {
        const errorMessage = data?.error || (error instanceof Error ? error.message : 'Failed to sync payment status');
        toast({
          title: 'Sync failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (data?.updated) {
        toast({
          title: 'Payment status updated',
          description: `Status: ${data.paymentStatus || 'unknown'}`,
          duration: 5000,
        });
      } else {
        toast({
          title: 'Status already up to date',
          description: 'Payment status matches GoCardless.',
          duration: 3000,
        });
      }

      // Refresh data
      await refetchAll();
    } catch (error) {
      console.error('Failed to sync payment:', error);
      toast({
        title: 'Sync failed',
        description: 'Unable to sync payment status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCollectingJobId(null);
    }
  };

  const handleConfirmPaid = async (method: 'cash' | 'transfer') => {
    if (!selectedJob) return;
    const jobId = selectedJob.id;
    const customerName = selectedJob.customer.name;
    const amount = selectedJob.amount_collected || selectedJob.customer.price;
    
    try {
      await markJobPaid(jobId, method);
      setIsMarkPaidOpen(false);
      setSelectedJob(null);
      
      // Success animation
      setSuccessAnimationId(jobId);
      setTimeout(() => setSuccessAnimationId(null), 2000);

      const { id: toastId } = toast({
        title: 'Payment recorded!',
        description: `£${amount.toFixed(2)} from ${customerName} (${method})`,
        duration: 5000,
        action: (
          <ToastAction
            altText="Undo"
            onClick={async () => {
              dismiss(toastId);
              try {
                await undoMarkPaid(jobId);
              } catch {
                toast({
                  title: 'Error',
                  description: 'Failed to undo payment',
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
      console.error('Failed to mark job paid:', error);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedJobIds(new Set());
  };

  const toggleJobSelection = (jobId: string) => {
    const newSet = new Set(selectedJobIds);
    if (newSet.has(jobId)) {
      newSet.delete(jobId);
    } else {
      newSet.add(jobId);
    }
    setSelectedJobIds(newSet);
  };

  const selectAllJobs = () => {
    setSelectedJobIds(new Set(sortedUnpaidJobs.map(j => j.id)));
  };

  const selectGroup = (jobs: JobWithCustomer[]) => {
    const newSet = new Set(selectedJobIds);
    jobs.forEach(job => newSet.add(job.id));
    setSelectedJobIds(newSet);
  };

  const handleBatchConfirm = async (jobIds: string[], method: 'cash' | 'transfer') => {
    try {
      await batchMarkPaid(jobIds, method);
      setSelectMode(false);
      setSelectedJobIds(new Set());
      
      // Success animation
      jobIds.forEach(id => {
        setSuccessAnimationId(id);
      });
      setTimeout(() => setSuccessAnimationId(null), 2000);
    } catch (error) {
      console.error('Failed to batch mark paid:', error);
    }
  };

  const selectedJobsForBatch = sortedUnpaidJobs.filter(j => selectedJobIds.has(j.id));

  // Get jobs with phone numbers for bulk reminder
  const jobsWithPhones = sortedUnpaidJobs.filter(j => j.customer.mobile_phone);

  const handleBulkReminder = () => {
    if (jobsWithPhones.length === 0) return;
    
    let openedCount = 0;
    
    // Use the first job to get template context, then process all jobs with the same template
    const firstJob = jobsWithPhones[0];
    const firstName = firstJob.customer.name.split(' ')[0];
    const completedDate = firstJob.completed_at ? format(new Date(firstJob.completed_at), 'd MMM yyyy') : '';
    // Use actual job amount_collected, fallback to customer price - ensure it's a valid number
    const amount = (firstJob.amount_collected && firstJob.amount_collected > 0) 
      ? firstJob.amount_collected 
      : ((firstJob.customer.price && firstJob.customer.price > 0) ? firstJob.customer.price : undefined);
    const isGoCardlessActive = firstJob.customer?.gocardless_mandate_status === 'active' && !!firstJob.customer?.gocardless_id;

    const context = prepareSMSContext({
      customerName: firstJob.customer.name,
      customerFirstName: firstName,
      customerAddress: firstJob.customer.address,
      price: amount,
      jobTotal: amount,
      completedDate: completedDate,
      isGoCardlessActive: isGoCardlessActive,
      businessName,
    });

    // Show template picker - once selected, send to all customers with the same message
    showTemplatePicker('unpaid_reminder', context, (message) => {
      // Send the same template message to all customers
      jobsWithPhones.forEach((job, index) => {
        const phone = job.customer.mobile_phone;
        if (phone) {
          setTimeout(() => {
            openSMSApp(phone, message);
          }, index * 300);
          openedCount++;
        }
      });

      toast({
        title: `Opening ${openedCount} SMS reminder${openedCount !== 1 ? 's' : ''}`,
        description: 'Individual messages prepared for each customer',
        duration: 4000,
      });
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header showLogo />
        <main className="px-4 py-6 max-w-lg mx-auto">
          <LoadingState message="Loading payments..." />
        </main>
        <BottomNav />
      </div>
    );
  }

  const paidTotal = paidThisWeek.reduce((sum, job) => sum + (job.amount_collected || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo />

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Modern Revenue Dashboard - High Contrast Fintech */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "relative rounded-2xl p-6 shadow-2xl overflow-hidden",
            "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800",
            "dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900",
            "border-2 border-slate-600 dark:border-slate-600"
          )}
        >
          {/* Decorative accent */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/15 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-slate-200 dark:text-slate-300 text-sm font-semibold mb-1 uppercase tracking-wide">Revenue Dashboard</p>
                <p className="text-3xl font-extrabold text-white dark:text-white">This Week</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-white/20 dark:bg-white/15 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 dark:border-white/30">
                <TrendingUp className="w-7 h-7 text-white dark:text-white" strokeWidth={2.5} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 border-white/30 dark:border-white/20 shadow-lg">
                <p className="text-slate-200 dark:text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wide">Outstanding</p>
                <p className="text-3xl font-extrabold text-white dark:text-white leading-tight">£{totalOutstanding.toFixed(0)}</p>
                {overdueCount > 0 && (
                  <p className="text-red-300 dark:text-red-400 text-xs mt-2 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" strokeWidth={2.5} />
                    {overdueCount} overdue
                  </p>
                )}
              </div>
              <div className="bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 border-white/30 dark:border-white/20 shadow-lg">
                <p className="text-slate-200 dark:text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wide">Collected</p>
                <p className="text-3xl font-extrabold text-green-200 dark:text-green-300 leading-tight">£{paidTotal.toFixed(0)}</p>
                <p className="text-slate-200 dark:text-slate-300 text-xs mt-2 font-medium">{paidThisWeek.length} payments</p>
              </div>
            </div>

            {/* Weekly Goal Progress - Enhanced */}
            <div className="bg-white/20 dark:bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 border-white/30 dark:border-white/20 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-white dark:text-white" strokeWidth={2.5} />
                  <span className="text-sm font-bold text-white dark:text-white uppercase tracking-wide">Weekly Goal</span>
                </div>
                <span className="text-base font-extrabold text-white dark:text-white">
                  £{weeklyGoalProgress.current.toFixed(0)} / £{weeklyGoalProgress.target}
                </span>
              </div>
              <div className="h-4 bg-white/30 dark:bg-white/20 rounded-full overflow-hidden mb-3 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${weeklyGoalProgress.progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full shadow-md",
                    weeklyGoalProgress.progress >= 100 
                      ? "bg-gradient-to-r from-green-300 via-green-400 to-green-500 dark:from-green-400 dark:via-green-500 dark:to-green-600" 
                      : "bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 dark:from-blue-500 dark:via-blue-600 dark:to-primary"
                  )}
                />
              </div>
              {weeklyGoalProgress.progress >= 100 ? (
                <p className="text-sm text-green-200 dark:text-green-300 font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" strokeWidth={2.5} />
                  Target reached!
                </p>
              ) : (
                <p className="text-xs text-slate-200 dark:text-slate-300 font-semibold">
                  £{(weeklyGoalProgress.target - weeklyGoalProgress.current).toFixed(0)} to go
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* DD Earnings Summary with Fee Breakdown */}
        {ddEarnings.count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Direct Debit This Week</p>
                  <p className="text-xs text-muted-foreground">{ddEarnings.count} payment{ddEarnings.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gross Amount</span>
                <span className="font-medium text-foreground">£{ddEarnings.grossTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="font-medium text-destructive">-£{ddEarnings.platformFeeTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GoCardless Fee</span>
                <span className="font-medium text-destructive">-£{ddEarnings.gocardlessFeeTotal.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-foreground">Net Payout</span>
                  <span className="text-xl font-bold text-success">£{ddEarnings.netTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="unpaid" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12">
            <TabsTrigger value="unpaid" className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Unpaid ({sortedUnpaidJobs.length})
              {overdueCount > 0 && (
                <span className="px-2 py-0.5 bg-destructive/15 dark:bg-destructive/25 text-destructive dark:text-destructive rounded-full text-xs font-bold border border-destructive/30 dark:border-destructive/40">
                  {overdueCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" />
              Paid This Week
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unpaid" className="mt-6 space-y-4">
            {sortedUnpaidJobs.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="w-12 h-12 text-success" />}
                title="All Caught Up!"
                description="No unpaid jobs to chase."
              />
            ) : (
              <>
                {/* Batch selection controls */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectMode}
                    className="gap-2"
                  >
                    {selectMode ? (
                      <>
                        <Square className="w-4 h-4" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-4 h-4" />
                        Select
                      </>
                    )}
                  </Button>
                  {!selectMode && jobsWithPhones.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkReminder}
                      className="gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Remind All ({jobsWithPhones.length})
                    </Button>
                  )}
                  {selectMode && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllJobs}
                      >
                        All
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => setBatchModalOpen(true)}
                        disabled={selectedJobIds.size === 0}
                        className="gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark {selectedJobIds.size} Paid
                      </Button>
                    </div>
                  )}
                </div>

                {/* Smart Batch Groups */}
                {selectMode && smartBatchGroups.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Quick Select:</p>
                    <div className="flex flex-wrap gap-2">
                      {smartBatchGroups.map((group, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => selectGroup(group.jobs)}
                          className="text-xs gap-1"
                        >
                          <Square className="w-3 h-3" />
                          {group.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {sortedUnpaidJobs.map((job, index) => {
                      const daysSince = job.completed_at ? differenceInDays(new Date(), new Date(job.completed_at)) : 0;
                      const isOverdue = daysSince > 7;
                      const isSuccessAnimating = successAnimationId === job.id;

                      return (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ 
                            opacity: isSuccessAnimating ? 0 : 1, 
                            y: 0,
                            scale: isSuccessAnimating ? 0.95 : 1,
                          }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.03 }}
                          className={cn(
                            "relative",
                            isSuccessAnimating && "pointer-events-none"
                          )}
                        >
                          {selectMode && (
                            <button
                              onClick={() => toggleJobSelection(job.id)}
                              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 p-2 touch-sm"
                            >
                              {selectedJobIds.has(job.id) ? (
                                <CheckSquare className="w-6 h-6 text-primary" />
                              ) : (
                                <Square className="w-6 h-6 text-muted-foreground" />
                              )}
                            </button>
                          )}
                          <div className={selectMode ? 'ml-10' : ''}>
                            <UnpaidJobCard
                              job={job}
                              index={index}
                              businessName={businessName}
                              onMarkPaid={() => !selectMode && !isMarkingPaid && handleMarkPaid(job)}
                              onCollectNow={(job) => !selectMode && handleCollectNow(job)}
                              onSyncPayment={(job) => !selectMode && handleSyncPayment(job)}
                              isProcessing={isMarkingPaid}
                              isCollecting={collectingJobId === job.id}
                              isOverdue={isOverdue}
                              daysSince={daysSince}
                              showSuccessAnimation={isSuccessAnimating}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="paid" className="mt-6 space-y-4">
            {paidThisWeek.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-12 h-12 text-muted-foreground" />}
                title="No Payments This Week"
                description="Completed payments will appear here."
              />
            ) : (
              <>
                {/* Payment method filter */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <Button
                    variant={paymentFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentFilter('all')}
                    className="shrink-0"
                  >
                    All ({paymentCounts.all})
                  </Button>
                  {paymentCounts.gocardless > 0 && (
                    <Button
                      variant={paymentFilter === 'gocardless' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentFilter('gocardless')}
                      className="shrink-0 gap-1"
                    >
                      <CreditCard className="w-3 h-3" />
                      DD ({paymentCounts.gocardless})
                    </Button>
                  )}
                  {paymentCounts.cash > 0 && (
                    <Button
                      variant={paymentFilter === 'cash' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentFilter('cash')}
                      className="shrink-0 gap-1"
                    >
                      <Banknote className="w-3 h-3" />
                      Cash ({paymentCounts.cash})
                    </Button>
                  )}
                  {paymentCounts.transfer > 0 && (
                    <Button
                      variant={paymentFilter === 'transfer' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentFilter('transfer')}
                      className="shrink-0"
                    >
                      Transfer ({paymentCounts.transfer})
                    </Button>
                  )}
                </div>

                {filteredPaidJobs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payments match this filter.</p>
                ) : (
                  filteredPaidJobs.map((job, index) => {
                    const paymentColor = job.payment_method === 'cash' 
                      ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800/50' 
                      : job.payment_method === 'transfer'
                      ? 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800/50'
                      : 'text-primary dark:text-primary bg-primary/20 dark:bg-primary/30 border-primary/30 dark:border-primary/40';

                    return (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card rounded-xl border border-border p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground truncate text-base">
                                {job.customer.name}
                              </p>
                              <span className={cn(
                                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium shrink-0 border",
                                paymentColor
                              )}>
                                {job.payment_method === 'gocardless' && <CreditCard className="w-3 h-3" />}
                                {job.payment_method === 'cash' && <Banknote className="w-3 h-3" />}
                                {job.payment_method === 'transfer' && <ArrowRight className="w-3 h-3" />}
                                {job.payment_method === 'gocardless' ? 'DD' : job.payment_method?.toUpperCase() || ''}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {job.customer.address}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-muted-foreground">
                                {job.payment_date ? format(new Date(job.payment_date), 'd MMM yyyy') : ''}
                              </p>
                              {job.completed_at && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <p className="text-xs text-muted-foreground">
                                    Completed {format(new Date(job.completed_at), 'd MMM')}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xl font-bold text-success">
                              £{(job.amount_collected || 0).toFixed(2)}
                            </p>
                            <CheckCircle className="w-5 h-5 text-success ml-auto mt-2" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MarkPaidModal
        isOpen={isMarkPaidOpen}
        job={selectedJob}
        onClose={() => setIsMarkPaidOpen(false)}
        onConfirm={handleConfirmPaid}
      />

      <BatchPaymentModal
        isOpen={batchModalOpen}
        selectedJobs={selectedJobsForBatch}
        onClose={() => !isBatchMarkingPaid && setBatchModalOpen(false)}
        onConfirm={handleBatchConfirm}
      />
    </div>
  );
};

export default Money;
