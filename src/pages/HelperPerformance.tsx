import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, PoundSterling, TrendingUp, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { TeamMember } from '@/types/database';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface HelperMetrics {
  helper_id: string;
  helper_name: string | null;
  helper_email: string;
  jobsCompleted30Days: number;
  completionRate: number;
  totalEarnings: number;
  avgCompletionTimeHours: number | null;
  jobsCompletedLate: number;
}

interface MetricCardProps {
  icon: typeof CheckCircle;
  label: string;
  value: string | number;
  className?: string;
  iconColor?: string;
  iconBg?: string;
}

function MetricCard({ icon: Icon, label, value, className, iconColor = "text-primary", iconBg = "bg-primary/15 dark:bg-primary/20" }: MetricCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <CardContent className="p-0">
        <div className="flex items-start justify-between mb-2">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("w-4 h-4", iconColor)} strokeWidth={2.5} />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      </CardContent>
    </Card>
  );
}

const HelperPerformance = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOwner, isHelper, effectiveRole, isLoading: roleLoading } = useRole();

  // Redirect helpers (unless they're also owners)
  useEffect(() => {
    if (!roleLoading && isHelper && !isOwner) {
      navigate('/dashboard', { replace: true });
    }
  }, [isOwner, isHelper, roleLoading, navigate]);

  // Fetch helpers from team_members
  const { data: helpers = [], isLoading: helpersLoading } = useQuery({
    queryKey: ['teamMembers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('team_members')
        .select('helper_id, helper_name, helper_email')
        .eq('owner_id', user.id);
      
      if (error) {
        console.error('[Helper Performance] Error fetching helpers:', error);
        throw error;
      }
      
      return (data || []) as TeamMember[];
    },
    enabled: !!user && (isOwner || effectiveRole === 'owner'),
  });

  // Calculate 30 days ago date
  const thirtyDaysAgo = useMemo(() => {
    return format(subDays(new Date(), 30), 'yyyy-MM-dd');
  }, []);

  // Fetch metrics for each helper
  const { data: helperMetrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['helperPerformanceMetrics', user?.id, helpers.length],
    queryFn: async () => {
      if (!user || helpers.length === 0) return [];

      const metricsPromises = helpers.map(async (helper): Promise<HelperMetrics> => {
        const helperId = helper.helper_id;

        // Fetch all jobs assigned to this helper
        const { data: assignedJobs, error: assignedError } = await supabase
          .from('job_assignments')
          .select(`
            job_id,
            assigned_at,
            jobs(
              id,
              status,
              completed_at,
              helper_payment_amount,
              scheduled_date,
              customer_id,
              customers(profile_id)
            )
          `)
          .eq('assigned_to_user_id', helperId);

        if (assignedError) {
          console.error(`[Helper Performance] Error fetching assignments for helper ${helperId}:`, assignedError);
          return {
            helper_id: helperId,
            helper_name: helper.helper_name,
            helper_email: helper.helper_email,
            jobsCompleted30Days: 0,
            completionRate: 0,
            totalEarnings: 0,
            avgCompletionTimeHours: null,
            jobsCompletedLate: 0,
          };
        }

        // Filter jobs to only include those for the owner's customers
        const jobs = (assignedJobs || [])
          .map((a: any) => a.jobs)
          .filter((job: any) => job && job.customers && job.customers.profile_id === user.id);
        const totalAssigned = jobs.length;
        const completedJobs = jobs.filter((j: any) => j.status === 'completed');
        const completed30Days = completedJobs.filter((j: any) => 
          j.completed_at && j.completed_at >= `${thirtyDaysAgo}T00:00:00`
        );

        // Calculate completion rate
        const completionRate = totalAssigned > 0 
          ? Math.round((completedJobs.length / totalAssigned) * 100 * 10) / 10
          : 0;

        // Calculate total earnings
        const totalEarnings = completedJobs.reduce((sum: number, j: any) => 
          sum + (j.helper_payment_amount || 0), 0
        );

        // Calculate average completion time (only for owner's jobs)
        let avgCompletionTimeHours: number | null = null;
        const completionTimes = assignedJobs
          ?.filter((a: any) => {
            const job = a.jobs;
            return job && 
                   job.customers && 
                   job.customers.profile_id === user.id &&
                   job.status === 'completed' && 
                   job.completed_at && 
                   a.assigned_at;
          })
          .map((a: any) => {
            const job = a.jobs;
            const assignedAt = new Date(a.assigned_at);
            const completedAt = new Date(job.completed_at);
            return (completedAt.getTime() - assignedAt.getTime()) / (1000 * 60 * 60); // hours
          }) || [];

        if (completionTimes.length > 0) {
          const sum = completionTimes.reduce((a, b) => a + b, 0);
          avgCompletionTimeHours = Math.round((sum / completionTimes.length) * 10) / 10;
        }

        // Calculate jobs completed late
        const jobsCompletedLate = completedJobs.filter((j: any) => {
          if (!j.completed_at || !j.scheduled_date) return false;
          const completedDate = new Date(j.completed_at).toISOString().split('T')[0];
          return completedDate > j.scheduled_date;
        }).length;

        return {
          helper_id: helperId,
          helper_name: helper.helper_name,
          helper_email: helper.helper_email,
          jobsCompleted30Days: completed30Days.length,
          completionRate,
          totalEarnings,
          avgCompletionTimeHours,
          jobsCompletedLate,
        };
      });

      return Promise.all(metricsPromises);
    },
    enabled: !!user && helpers.length > 0 && (isOwner || effectiveRole === 'owner'),
  });

  const isLoading = roleLoading || helpersLoading || metricsLoading;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingState message="Loading helper performance..." />
        <BottomNav />
      </div>
    );
  }

  // Block access if not owner
  if (!isOwner && effectiveRole !== 'owner') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-20 px-4 pt-4">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Helper Performance</h1>
          <p className="text-muted-foreground">
            View performance metrics for your helpers
          </p>
        </motion.div>

        {/* Empty State */}
        {helperMetrics.length === 0 && !isLoading && (
          <EmptyState message="No helpers added yet. Add helpers in Settings to see their performance metrics." />
        )}

        {/* Helper List */}
        {helperMetrics.map((helper, index) => (
          <motion.div
            key={helper.helper_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="mb-8"
          >
            {/* Helper Name */}
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              {helper.helper_name || helper.helper_email}
            </h2>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Jobs Completed (30 days) */}
              <MetricCard
                icon={CheckCircle}
                label="Jobs Completed (30d)"
                value={helper.jobsCompleted30Days}
                iconColor="text-green-600 dark:text-green-500"
                iconBg="bg-green-100 dark:bg-green-900/30"
              />

              {/* Completion Rate */}
              <MetricCard
                icon={TrendingUp}
                label="Completion Rate"
                value={`${helper.completionRate}%`}
                iconColor="text-blue-600 dark:text-blue-500"
                iconBg="bg-blue-100 dark:bg-blue-900/30"
              />

              {/* Total Earnings */}
              <MetricCard
                icon={PoundSterling}
                label="Total Earnings"
                value={`£${helper.totalEarnings.toFixed(2)}`}
                iconColor="text-emerald-600 dark:text-emerald-500"
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
              />

              {/* Average Completion Time */}
              {helper.avgCompletionTimeHours !== null ? (
                <MetricCard
                  icon={Clock}
                  label="Avg Completion Time"
                  value={`${helper.avgCompletionTimeHours}h`}
                  iconColor="text-purple-600 dark:text-purple-500"
                  iconBg="bg-purple-100 dark:bg-purple-900/30"
                />
              ) : (
                <MetricCard
                  icon={Clock}
                  label="Avg Completion Time"
                  value="N/A"
                  iconColor="text-muted-foreground"
                  iconBg="bg-muted"
                />
              )}

              {/* Jobs Completed Late */}
              <MetricCard
                icon={AlertCircle}
                label="Jobs Completed Late"
                value={helper.jobsCompletedLate}
                iconColor="text-orange-600 dark:text-orange-500"
                iconBg="bg-orange-100 dark:bg-orange-900/30"
              />
            </div>
          </motion.div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
};

export default HelperPerformance;

