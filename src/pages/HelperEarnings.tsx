import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Wallet, Calendar, MapPin, PoundSterling } from 'lucide-react';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { EarningsCard } from '@/components/EarningsCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { JobWithCustomer, Customer } from '@/types/database';
import { formatCurrencyDecimal } from '@/utils/currencyUtils';
import { cn } from '@/lib/utils';

const HelperEarnings = () => {
  const { user } = useAuth();

  // Query completed jobs with helper payments
  // CRITICAL: Filter by assignment to ensure helpers only see jobs they were assigned to
  const { data: completedJobs = [], isLoading } = useQuery({
    queryKey: ['helperEarnings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First, get all job assignments for this helper
      const { data: assignments, error: assignmentsError } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('assigned_to_user_id', user.id);
      
      if (assignmentsError) {
        console.error('[Helper Earnings] Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }
      
      // If no assignments, return empty array
      if (!assignments || assignments.length === 0) {
        return [];
      }
      
      const assignedJobIds = assignments.map(a => a.job_id);
      
      // Query jobs that:
      // 1. Are completed
      // 2. Have helper_payment_amount set
      // 3. Are in the list of assigned job IDs
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          completed_at,
          amount_collected,
          helper_payment_amount,
          customer:customers(
            id,
            name,
            address
          )
        `)
        .eq('status', 'completed')
        .not('helper_payment_amount', 'is', null)
        .in('id', assignedJobIds)
        .order('completed_at', { ascending: false });
      
      if (error) {
        console.error('[Helper Earnings Query Error]', error);
        throw error;
      }
      
      return (data || []).map(job => ({
        ...job,
        customer: job.customer as Customer,
      })) as JobWithCustomer[];
    },
    enabled: !!user,
  });

  // Calculate total earnings
  const totalEarnings = useMemo(() => {
    return completedJobs.reduce((sum, job) => {
      return sum + (job.helper_payment_amount || 0);
    }, 0);
  }, [completedJobs]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState message="Loading your earnings..." />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 px-4 pt-4">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Earnings</h1>
          <p className="text-muted-foreground">View your completed jobs and earnings</p>
        </motion.div>

        {/* Total Earnings Summary */}
        {completedJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <EarningsCard 
              amount={totalEarnings} 
              label={`Total Earnings (${completedJobs.length} job${completedJobs.length !== 1 ? 's' : ''})`}
            />
          </motion.div>
        )}

        {/* Completed Jobs List */}
        {completedJobs.length === 0 ? (
          <EmptyState
            title="No earnings yet"
            description="You haven't completed any jobs with earnings. Once you complete assigned jobs, your earnings will appear here."
            icon={<Wallet className="w-12 h-12 text-primary" />}
          />
        ) : (
          <div className="space-y-4">
            {completedJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
              >
                <div className="p-4">
                  {/* Customer Name and Date */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="font-semibold text-foreground text-lg mb-2 truncate">
                        {job.customer?.name || 'Unknown Customer'}
                      </h3>
                      
                      {/* Job Date - UK format (dd/MM/yyyy) */}
                      {job.completed_at && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <Calendar className="w-4 h-4 shrink-0" />
                          <span>{format(new Date(job.completed_at), 'dd/MM/yyyy')}</span>
                        </div>
                      )}
                      
                      {/* Address */}
                      {job.customer?.address && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="truncate">{job.customer.address.split(/[,\n]/)[0].trim()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Earnings Breakdown */}
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Job Amount</span>
                      <span className="text-base font-semibold text-foreground">
                        {formatCurrencyDecimal(job.amount_collected)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <PoundSterling className="w-4 h-4 text-primary" />
                        <span className="text-base font-semibold text-foreground">Your Payment</span>
                      </div>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrencyDecimal(job.helper_payment_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default HelperEarnings;

