import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, CheckCircle, Clock, CheckSquare, Square } from 'lucide-react';
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

const Money = () => {
  const { unpaidJobs, paidThisWeek, totalOutstanding, markJobPaid, batchMarkPaid, undoMarkPaid, isLoading } = useSupabaseData();
  const { toast, dismiss } = useToast();
  const [selectedJob, setSelectedJob] = useState<JobWithCustomer | null>(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  const handleMarkPaid = (job: JobWithCustomer) => {
    setSelectedJob(job);
    setIsMarkPaidOpen(true);
  };

  const handleConfirmPaid = async (method: 'cash' | 'transfer') => {
    if (!selectedJob) return;
    const jobId = selectedJob.id;
    const customerName = selectedJob.customer.name;
    const amount = selectedJob.amount_collected || selectedJob.customer.price;
    
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
    await batchMarkPaid(jobIds, method);
    setSelectMode(false);
    setSelectedJobIds(new Set());
  };

  const selectedJobsForBatch = unpaidJobs.filter(j => selectedJobIds.has(j.id));

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
          className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white"
        >
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-6 h-6" />
            <span className="text-white/80 text-sm font-medium">Outstanding Balance</span>
          </div>
          <p className="text-4xl font-bold">
            £{totalOutstanding.toFixed(2)}
          </p>
          <p className="text-white/70 text-sm mt-1">
            {unpaidJobs.length} unpaid {unpaidJobs.length === 1 ? 'job' : 'jobs'}
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="unpaid" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="unpaid" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Unpaid ({unpaidJobs.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Paid This Week
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unpaid" className="mt-4 space-y-3">
            {unpaidJobs.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="w-12 h-12 text-green-500" />}
                title="All Caught Up!"
                description="No unpaid jobs to chase."
              />
            ) : (
              <>
                {/* Batch selection controls */}
                <div className="flex items-center justify-between mb-2">
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
                        Select Multiple
                      </>
                    )}
                  </Button>
                  {selectMode && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllJobs}
                      >
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setBatchModalOpen(true)}
                        disabled={selectedJobIds.size === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Mark {selectedJobIds.size} Paid
                      </Button>
                    </div>
                  )}
                </div>

                {unpaidJobs.map((job, index) => (
                  <div key={job.id} className="relative">
                    {selectMode && (
                      <button
                        onClick={() => toggleJobSelection(job.id)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 p-2"
                      >
                        {selectedJobIds.has(job.id) ? (
                          <CheckSquare className="w-6 h-6 text-primary" />
                        ) : (
                          <Square className="w-6 h-6 text-muted-foreground" />
                        )}
                      </button>
                    )}
                    <div className={selectMode ? 'ml-8' : ''}>
                      <UnpaidJobCard
                        job={job}
                        index={index}
                        onMarkPaid={() => !selectMode && handleMarkPaid(job)}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="paid" className="mt-4 space-y-3">
            {paidThisWeek.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-12 h-12 text-muted-foreground" />}
                title="No Payments This Week"
                description="Completed payments will appear here."
              />
            ) : (
              paidThisWeek.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl border border-border p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {job.customer.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {job.customer.address}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">
                        {job.payment_method} • {job.payment_date ? new Date(job.payment_date).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        £{(job.amount_collected || 0).toFixed(2)}
                      </p>
                      <CheckCircle className="w-5 h-5 text-green-500 ml-auto mt-1" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />

      <MarkPaidModal
        isOpen={isMarkPaidOpen}
        job={selectedJob}
        onClose={() => setIsMarkPaidOpen(false)}
        onConfirm={handleConfirmPaid}
      />

      <BatchPaymentModal
        isOpen={batchModalOpen}
        selectedJobs={selectedJobsForBatch}
        onClose={() => setBatchModalOpen(false)}
        onConfirm={handleBatchConfirm}
      />
    </div>
  );
};

export default Money;
