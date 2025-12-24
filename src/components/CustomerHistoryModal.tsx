import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, TrendingUp, CheckCircle, Clock, PoundSterling, StickyNote } from 'lucide-react';
import { Customer, JobWithCustomer } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CustomerHistoryModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

interface CustomerStats {
  totalEarnings: number;
  jobsCompleted: number;
  jobsPending: number;
  avgJobValue: number;
  lastCompletedDate: string | null;
}

export function CustomerHistoryModal({ customer, isOpen, onClose }: CustomerHistoryModalProps) {
  const [jobs, setJobs] = useState<JobWithCustomer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customer || !isOpen) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`*, customer:customers(*)`)
          .eq('customer_id', customer.id)
          .order('scheduled_date', { ascending: false })
          .limit(50);

        if (error) throw error;

        const jobData = (data || []).map(job => ({
          ...job,
          customer: job.customer as Customer,
        })) as JobWithCustomer[];

        setJobs(jobData);

        // Calculate stats
        const completedJobs = jobData.filter(j => j.status === 'completed');
        const pendingJobs = jobData.filter(j => j.status === 'pending');
        const totalEarnings = completedJobs.reduce((sum, j) => sum + (j.amount_collected || 0), 0);
        const lastCompleted = completedJobs.length > 0 
          ? completedJobs.sort((a, b) => 
              new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
            )[0]?.completed_at 
          : null;

        setStats({
          totalEarnings,
          jobsCompleted: completedJobs.length,
          jobsPending: pendingJobs.length,
          avgJobValue: completedJobs.length > 0 ? totalEarnings / completedJobs.length : customer.price,
          lastCompletedDate: lastCompleted,
        });
      } catch (err) {
        console.error('Failed to fetch customer history:', err);
        setError('Failed to load history. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto safe-bottom"
          style={{ 
            bottom: '80px',
            maxHeight: 'calc(90vh - 80px)'
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="px-6 pb-8 pt-2">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">
                {customer.name} History
              </h2>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="py-12 text-center text-destructive">
                <p>{error}</p>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                {stats && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-accent/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-accent" />
                        <span className="text-sm text-muted-foreground">Total Earned</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        £{stats.totalEarnings.toFixed(0)}
                      </p>
                    </div>

                    <div className="bg-primary/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Jobs Done</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {stats.jobsCompleted}
                      </p>
                    </div>

                    <div className="bg-muted rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Pending</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {stats.jobsPending}
                      </p>
                    </div>

                    <div className="bg-muted rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <PoundSterling className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Avg Value</span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        £{stats.avgJobValue.toFixed(0)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Job History List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Job History</h3>
                  
                  {jobs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">No jobs found</p>
                  ) : (
                    jobs.map((job) => (
                      <div
                        key={job.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl",
                          job.status === 'completed' ? "bg-muted/50" : "bg-primary/5 border border-primary/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {job.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5 text-accent" />
                          ) : (
                            <Clock className="w-5 h-5 text-primary" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground">
                                {format(new Date(job.scheduled_date), 'd MMM yyyy')}
                              </p>
                              {job.notes && (
                                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {job.status === 'completed' 
                                ? `Completed${job.completed_at ? ` • ${format(new Date(job.completed_at), 'd MMM')}` : ''}`
                                : 'Scheduled'
                              }
                            </p>
                            {job.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                                {job.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            £{job.amount_collected ?? job.customer?.price ?? 0}
                          </p>
                          {job.status === 'completed' && job.payment_status && (
                            <p className={cn(
                              "text-xs",
                              job.payment_status === 'paid' ? "text-accent" : 
                              job.payment_status === 'processing' ? "text-yellow-600 dark:text-yellow-400" : 
                              "text-amber-500"
                            )}>
                              {job.payment_status === 'paid' ? 'Paid' : 
                               job.payment_status === 'processing' ? 'Processing' : 
                               'Unpaid'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}