import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, CheckCircle, Clock, CheckSquare, Square, CreditCard, MessageSquare } from 'lucide-react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { UnpaidJobCard } from '@/components/UnpaidJobCard';
import { MarkPaidModal } from '@/components/MarkPaidModal';
import { BatchPaymentModal } from '@/components/BatchPaymentModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ToastAction } from '@/components/ui/toast';
import { JobWithCustomer } from '@/types/database';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { format } from 'date-fns';

const Money = () => {
  const { unpaidJobs, paidThisWeek, totalOutstanding, markJobPaid, batchMarkPaid, undoMarkPaid, isLoading, profile, isMarkingPaid, isBatchMarkingPaid } = useSupabaseData();
  const { toast, dismiss } = useToast();
  const { requirePremium } = useSoftPaywall();
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'gocardless' | 'cash' | 'transfer'>('all');

  // Calculate DD earnings summary
  const ddEarnings = useMemo(() => {
    const ddJobs = paidThisWeek.filter(job => job.payment_method === 'gocardless');
    const total = ddJobs.reduce((sum, job) => sum + (job.amount_collected || 0), 0);
    return { count: ddJobs.length, total };
  }, [paidThisWeek]);

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

  const handleConfirmPaid = async (method: 'cash' | 'transfer') => {
    if (!selectedJob) return;
    const jobId = selectedJob.id;
    const customerName = selectedJob.customer.name;
    const amount = selectedJob.amount_collected || selectedJob.customer.price;
    
    try {
      await markJobPaid(jobId, method);
      setIsMarkPaidOpen(false);
      setSelectedJob(null);
      
      const { id: toastId } = toast({
        title: 'Payment recorded!',
        description: `£${amount} from ${customerName} (${method})`,
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
      // Error is already handled by mutation but keep modal open
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
    setSelectedJobIds(new Set(unpaidJobs.map(j => j.id)));
  };

  const handleBatchConfirm = async (jobIds: string[], method: 'cash' | 'transfer') => {
    try {
      await batchMarkPaid(jobIds, method);
      setSelectMode(false);
      setSelectedJobIds(new Set());
    } catch (error) {
      // Error is already handled by mutation
      console.error('Failed to batch mark paid:', error);
    }
  };

  const selectedJobsForBatch = unpaidJobs.filter(j => selectedJobIds.has(j.id));
  const businessName = profile?.business_name || 'Your window cleaner';

  // Get jobs with phone numbers for bulk reminder
  const jobsWithPhones = unpaidJobs.filter(j => j.customer.mobile_phone);

  const handleBulkReminder = () => {
    if (jobsWithPhones.length === 0) return;
    
    // Build SMS message with all customers
    const customerMessages = jobsWithPhones.map(job => {
      const firstName = job.customer.name.split(' ')[0];
      const completedDate = job.completed_at ? format(new Date(job.completed_at), 'd MMM') : 'recently';
      const amount = (job.amount_collected || 0).toFixed(2);
      return `${firstName}: £${amount} (${completedDate})`;
    }).join('\n');
    
    const message = encodeURIComponent(
      `Hi, ${businessName} here 👋\n\nFriendly reminder about outstanding payments:\n\n${customerMessages}\n\nThanks so much!`
    );
    
    // Open SMS with first customer's number (bulk SMS not universally supported)
    const phone = jobsWithPhones[0].customer.mobile_phone?.replace(/\s/g, '') || '';
    window.open(`sms:${phone}?body=${message}`, '_self');
    
    toast({
      title: 'Reminder ready',
      description: `Message prepared for ${jobsWithPhones.length} customer${jobsWithPhones.length !== 1 ? 's' : ''}`,
    });
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showLogo />

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Outstanding Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-warning to-warning/80 rounded-xl p-6 text-warning-foreground"
        >
          <div className="flex items-center gap-3 mb-3">
            <Wallet className="w-6 h-6" />
            <span className="text-warning-foreground/80 font-medium">Outstanding Balance</span>
          </div>
          <p className="text-4xl font-bold">
            £{totalOutstanding.toFixed(2)}
          </p>
          <p className="text-warning-foreground/70 text-sm mt-2">
            {unpaidJobs.length} unpaid {unpaidJobs.length === 1 ? 'job' : 'jobs'}
          </p>
        </motion.div>

        {/* DD Earnings Summary - only show if there are DD payments */}
        {ddEarnings.count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Direct Debit this week</p>
                  <p className="text-lg font-bold text-foreground">£{ddEarnings.total.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                  {ddEarnings.count} payment{ddEarnings.count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-2">
              Standard platform & processing fees apply to payout.
            </p>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="unpaid" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12">
            <TabsTrigger value="unpaid" className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              Unpaid ({unpaidJobs.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4" />
              Paid This Week
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unpaid" className="mt-6 space-y-4">
            {unpaidJobs.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="w-12 h-12 text-success" />}
                title="All Caught Up!"
                description="No unpaid jobs to chase."
              />
            ) : (
              <>
                {/* Batch selection controls */}
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="default"
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
                        Select Multiple
                      </>
                    )}
                  </Button>
                  {!selectMode && jobsWithPhones.length > 1 && (
                    <Button
                      variant="outline"
                      size="default"
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
                        size="default"
                        onClick={selectAllJobs}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="success"
                        size="default"
                        onClick={() => setBatchModalOpen(true)}
                        disabled={selectedJobIds.size === 0}
                      >
                        Mark {selectedJobIds.size} Paid
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {unpaidJobs.map((job, index) => (
                    <div key={job.id} className="relative">
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
                          isProcessing={isMarkingPaid}
                        />
                      </div>
                    </div>
                  ))}
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
                      className="shrink-0"
                    >
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
                  filteredPaidJobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-xl border border-border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground truncate text-base">
                              {job.customer.name}
                            </p>
                            {job.payment_method === 'gocardless' && (
                              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
                                <CreditCard className="w-3 h-3" />
                                DD
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {job.customer.address}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 capitalize">
                            {job.payment_method === 'gocardless' ? 'Direct Debit' : job.payment_method} • {job.payment_date ? new Date(job.payment_date).toLocaleDateString() : ''}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xl font-bold text-success">
                            £{(job.amount_collected || 0).toFixed(2)}
                          </p>
                          <CheckCircle className="w-5 h-5 text-success ml-auto mt-2" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />

      <MarkPaidModal
        isOpen={isMarkPaidOpen}
        job={selectedJob}
        onClose={() => !isMarkingPaid && setIsMarkPaidOpen(false)}
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
