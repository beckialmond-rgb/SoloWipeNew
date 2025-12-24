import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Users, PoundSterling, Calendar, Sparkles, AlertCircle, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SetTargetModal } from './SetTargetModal';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile, JobWithCustomer } from '@/types/database';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface WeekData {
  weekStart: Date;
  weekLabel: string;
  total: number;
  jobCount: number;
}

interface BusinessInsightsProps {
  weeklyEarnings: WeekData[];
  customerCount: number;
  upcomingJobs?: JobWithCustomer[];
  profile?: Profile | null;
  onUpdateProfile?: () => void;
  className?: string;
}

export function BusinessInsights({ 
  weeklyEarnings, 
  customerCount, 
  upcomingJobs = [],
  profile,
  onUpdateProfile,
  className 
}: BusinessInsightsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [weeklyTargetModalOpen, setWeeklyTargetModalOpen] = useState(false);
  const [monthlyGoalModalOpen, setMonthlyGoalModalOpen] = useState(false);
  
  const thisWeek = weeklyEarnings?.[0] || { total: 0, jobCount: 0 };
  const lastWeek = weeklyEarnings?.[1] || { total: 0, jobCount: 0 };
  
  // Calculate trend
  const earningsTrend = lastWeek?.total > 0 && thisWeek?.total !== undefined
    ? ((thisWeek.total - lastWeek.total) / lastWeek.total) * 100 
    : 0;
  
  const jobsTrend = lastWeek?.jobCount > 0 && thisWeek?.jobCount !== undefined
    ? ((thisWeek.jobCount - lastWeek.jobCount) / lastWeek.jobCount) * 100
    : 0;
  
  // Calculate averages
  const avgJobValue = thisWeek?.jobCount > 0 && thisWeek?.total !== undefined
    ? thisWeek.total / thisWeek.jobCount 
    : 0;
  
  // Get user-defined targets or calculate defaults
  const userWeeklyTarget = profile?.weekly_target;
  const userMonthlyGoal = profile?.monthly_goal;
  
  // Calculate default weekly target (based on last 4 weeks average)
  const last4Weeks = weeklyEarnings.slice(0, 4);
  const avgWeeklyEarnings = last4Weeks.length > 0 
    ? last4Weeks.reduce((sum, w) => sum + w.total, 0) / last4Weeks.length 
    : 0;
  const defaultWeeklyTarget = avgWeeklyEarnings > 0 
    ? Math.ceil(avgWeeklyEarnings / 50) * 50 + 50 // Round up to nearest 50 + buffer
    : 500; // Default fallback target
  
  // Use user-defined target or default
  const weeklyTarget = userWeeklyTarget ?? defaultWeeklyTarget;
  const targetProgress = weeklyTarget > 0 ? ((thisWeek?.total || 0) / weeklyTarget) * 100 : 0;

  // Fetch monthly earnings for monthly goal calculation
  const { data: monthlyEarningsData = [] } = useQuery({
    queryKey: ['monthlyEarningsForInsights', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const currentMonthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const sixMonthsAgo = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('jobs')
        .select('completed_at, amount_collected')
        .eq('status', 'completed')
        .gte('completed_at', `${sixMonthsAgo}T00:00:00`)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate current month earnings
  const currentMonthEarnings = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    return monthlyEarningsData
      .filter(job => {
        if (!job.completed_at) return false;
        const completedDate = new Date(job.completed_at);
        return completedDate >= monthStart && completedDate <= now;
      })
      .reduce((sum, job) => sum + (job.amount_collected || 0), 0);
  }, [monthlyEarningsData]);

  // Calculate previous month earnings for trend
  const previousMonthEarnings = useMemo(() => {
    const now = new Date();
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));
    return monthlyEarningsData
      .filter(job => {
        if (!job.completed_at) return false;
        const completedDate = new Date(job.completed_at);
        return completedDate >= prevMonthStart && completedDate <= prevMonthEnd;
      })
      .reduce((sum, job) => sum + (job.amount_collected || 0), 0);
  }, [monthlyEarningsData]);

  // Calculate default monthly goal
  const defaultMonthlyGoal = previousMonthEarnings > 0 
    ? Math.ceil(previousMonthEarnings / 100) * 100 + 100 // Round up + buffer
    : (weeklyTarget * 4); // Fallback to 4x weekly target
  
  const monthlyGoal = userMonthlyGoal ?? defaultMonthlyGoal;
  const monthlyProgress = monthlyGoal > 0 ? (currentMonthEarnings / monthlyGoal) * 100 : 0;

  // Calculate projected month-end revenue
  const projectedMonthEnd = useMemo(() => {
    if (!upcomingJobs || upcomingJobs.length === 0) return currentMonthEarnings;
    
    const now = new Date();
    const monthEnd = endOfMonth(now);
    
    // Get upcoming jobs for the rest of this month
    const remainingJobsThisMonth = upcomingJobs.filter(job => {
      if (!job?.scheduled_date) return false;
      try {
        const jobDate = new Date(job.scheduled_date);
        return jobDate > now && jobDate <= monthEnd;
      } catch {
        return false;
      }
    });
    
    const projected = remainingJobsThisMonth.reduce((sum, job) => {
      const price = job?.customer?.price || avgJobValue || 0;
      return sum + price;
    }, 0);
    
    return currentMonthEarnings + projected;
  }, [upcomingJobs, currentMonthEarnings, avgJobValue]);

  // Calculate customer growth/churn (compare this month vs last month)
  const { data: customerHistory = [] } = useQuery({
    queryKey: ['customerHistory', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const sixMonthsAgo = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('customers')
        .select('created_at')
        .eq('profile_id', user.id)
        .gte('created_at', `${sixMonthsAgo}T00:00:00`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const customerGrowthTrend = useMemo(() => {
    if (!customerHistory || customerHistory.length === 0) return 0;
    
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    
    const thisMonthNew = customerHistory.filter(c => {
      if (!c?.created_at) return false;
      try {
        const createdDate = new Date(c.created_at);
        return createdDate >= thisMonthStart && createdDate <= now;
      } catch {
        return false;
      }
    }).length;
    
    const lastMonthNew = customerHistory.filter(c => {
      if (!c?.created_at) return false;
      try {
        const createdDate = new Date(c.created_at);
        return createdDate >= lastMonthStart && createdDate <= lastMonthEnd;
      } catch {
        return false;
      }
    }).length;
    
    return thisMonthNew - lastMonthNew;
  }, [customerHistory]);

  // Update target mutation
  const updateTargetMutation = useMutation({
    mutationFn: async ({ type, value }: { type: 'weekly' | 'monthly'; value: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      const field = type === 'weekly' ? 'weekly_target' : 'monthly_goal';
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (onUpdateProfile) onUpdateProfile();
    },
  });

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue,
    trend,
    iconColor = "text-primary",
    iconBg = "bg-primary/15 dark:bg-primary/20"
  }: {
    icon: typeof TrendingUp;
    label: string;
    value: string;
    subValue?: string | React.ReactNode;
    trend?: number;
    iconColor?: string;
    iconBg?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border-2 border-border shadow-sm p-3 sm:p-4"
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", iconColor)} strokeWidth={2.5} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shrink-0",
            trend > 0 ? "bg-success/15 dark:bg-success/20 text-success dark:text-success" : "bg-destructive/15 dark:bg-destructive/20 text-destructive dark:text-destructive"
          )}>
            {trend > 0 ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
            {Math.abs(trend).toFixed(0)}%
          </div>
        )}
      </div>
      <p className="text-xl sm:text-2xl font-extrabold text-foreground dark:text-foreground mb-1 break-words">{value}</p>
      <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      {subValue && (
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 font-medium leading-tight break-words">{subValue}</p>
      )}
    </motion.div>
  );

  const handleSaveTarget = async (type: 'weekly' | 'monthly', value: number) => {
    await updateTargetMutation.mutateAsync({ type, value });
  };

  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      {/* Weekly Target Hero Card - Interactive */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setWeeklyTargetModalOpen(true)}
        whileHover={userWeeklyTarget ? { scale: 1.01 } : {}}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative rounded-2xl p-4 sm:p-5 shadow-xl overflow-hidden border-2 transition-all cursor-pointer",
          targetProgress >= 100
            ? "bg-gradient-to-br from-success via-green-500 to-emerald-500 border-success dark:from-success dark:via-green-600 dark:to-emerald-600"
            : !userWeeklyTarget
              ? "bg-card border-2 border-primary/40 dark:border-primary/50 ring-2 ring-primary/20 dark:ring-primary/30 shadow-primary/10"
              : "bg-card border-border hover:border-primary/30 dark:hover:border-primary/40"
        )}
      >
        <AnimatePresence>
          {targetProgress >= 100 && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
              }}
              transition={{ 
                duration: 0.6, 
                type: "spring",
                stiffness: 200,
                damping: 15
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4"
            >
              <motion.div
                animate={{ 
                  scale: 1.15,
                }}
                transition={{ 
                  duration: 0.6,
                  repeat: Infinity,
                  repeatType: "reverse",
                  repeatDelay: 1.5,
                  ease: "easeInOut"
                }}
              >
                <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10">
          <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 shrink-0",
                targetProgress >= 100
                  ? "bg-white/20 backdrop-blur-sm border-white/30"
                  : "bg-primary/15 dark:bg-primary/20 border-primary/30 dark:border-primary/40"
              )}>
                <Target className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6",
                  targetProgress >= 100 ? "text-white" : "text-primary"
                )} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                  <p className={cn(
                    "text-xs sm:text-sm font-semibold uppercase tracking-wide",
                    targetProgress >= 100 ? "text-white/90" : "text-muted-foreground"
                  )}>
                    Weekly Target
                  </p>
                  {/* Prominent "Set Target" badge when no target is set */}
                  {!userWeeklyTarget && (
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary text-[10px] sm:text-xs font-bold border border-primary/30 dark:border-primary/40 shrink-0">
                      <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Set Target
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-2 sm:gap-3 group touch-sm rounded-lg px-1 sm:px-2 -mx-1 sm:-mx-2 py-1 transition-all",
                    !userWeeklyTarget && "ring-2 ring-primary/30 dark:ring-primary/40 ring-offset-2 ring-offset-card"
                  )}
                >
                  <span className={cn(
                    "text-lg sm:text-xl md:text-2xl font-extrabold break-words",
                    targetProgress >= 100 ? "text-white" : "text-foreground"
                  )}>
                    £{thisWeek?.total.toFixed(0)} / £{weeklyTarget}
                  </span>
                  <Edit2 className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5 transition-all shrink-0",
                    targetProgress >= 100 
                      ? "text-white/80" 
                      : userWeeklyTarget
                        ? "text-primary opacity-60"
                        : "text-primary opacity-100"
                  )} />
                </div>
                {/* Clear call-to-action text */}
                {!userWeeklyTarget && (
                  <p className="text-xs sm:text-sm font-medium text-primary dark:text-primary mt-1 sm:mt-1.5 flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>Tap above to set your weekly target</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={cn(
            "h-3 sm:h-4 rounded-full overflow-hidden mb-2 sm:mb-3 shadow-inner",
            targetProgress >= 100 ? "bg-white/25" : "bg-muted"
          )}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(targetProgress, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full shadow-md",
                targetProgress >= 100
                  ? "bg-white"
                  : "bg-gradient-to-r from-primary via-blue-500 to-primary dark:from-primary dark:via-blue-600 dark:to-primary"
              )}
            />
          </div>

          {targetProgress >= 100 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" fill="currentColor" />
              <p className="text-sm sm:text-base text-white font-bold">Target Achieved! 🎉</p>
            </motion.div>
          ) : (
            <>
              <p className={cn(
                "text-xs sm:text-sm font-semibold mb-2 sm:mb-3 break-words",
                targetProgress >= 90 ? "text-primary dark:text-primary" : "text-muted-foreground"
              )}>
                £{(weeklyTarget - (thisWeek?.total || 0)).toFixed(0)} to go • {targetProgress.toFixed(0)}% complete
              </p>
              {/* Prominent CTA Button - Always show if no target set */}
              {!userWeeklyTarget && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mt-2 sm:mt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    onClick={() => setWeeklyTargetModalOpen(true)}
                    className={cn(
                      "w-full h-12 sm:h-14 bg-primary hover:bg-primary/90 active:bg-primary/95",
                      "text-primary-foreground font-bold text-sm sm:text-base shadow-xl",
                      "touch-sm border-2 border-primary/20",
                      "ring-2 ring-primary/20 ring-offset-2"
                    )}
                    size="lg"
                  >
                    <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
                    <span className="truncate">Set Weekly Target</span>
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Monthly Goal Card - Interactive */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border-2 border-border shadow-sm p-3 sm:p-4"
      >
        <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" strokeWidth={2.5} />
            <span className="text-xs sm:text-sm font-semibold text-foreground uppercase tracking-wide">Monthly Goal</span>
          </div>
          <button
            onClick={() => setMonthlyGoalModalOpen(true)}
            className="flex items-center gap-1 sm:gap-1.5 group touch-sm rounded-lg px-1.5 sm:px-2 -mx-1.5 sm:-mx-2 py-1 transition-colors hover:bg-muted/50 shrink-0"
          >
            <span className="text-xs sm:text-sm font-extrabold text-foreground whitespace-nowrap">
              £{currentMonthEarnings.toFixed(0)} / £{monthlyGoal}
            </span>
            <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        </div>
        <div className="h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden mb-2 shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(monthlyProgress, 100)}%` }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full shadow-sm",
              monthlyProgress >= 100
                ? "bg-gradient-to-r from-success to-green-500"
                : "bg-gradient-to-r from-primary to-blue-500"
            )}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
            {monthlyProgress.toFixed(0)}% complete
          </p>
          {monthlyProgress >= 100 && (
            <span className="text-[10px] sm:text-xs font-bold text-success flex items-center gap-1 shrink-0">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Goal reached!
            </span>
          )}
        </div>
      </motion.div>

      {/* Projected Revenue Insight */}
      {projectedMonthEnd > currentMonthEarnings && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 dark:bg-blue-950/30 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-3 sm:p-4"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" strokeWidth={2.5} />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-200 mb-1">Projected Month-End</p>
              <p className="text-base sm:text-lg font-extrabold text-blue-700 dark:text-blue-300 break-words">
                £{projectedMonthEnd.toFixed(0)}
              </p>
              <p className="text-[10px] sm:text-xs text-blue-800 dark:text-blue-400 mt-1 leading-tight break-words">
                Based on {upcomingJobs?.filter(j => {
                  if (!j?.scheduled_date) return false;
                  try {
                    const jobDate = new Date(j.scheduled_date);
                    const monthEnd = endOfMonth(new Date());
                    return jobDate <= monthEnd;
                  } catch {
                    return false;
                  }
                }).length || 0} scheduled jobs remaining
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid - Enhanced Fintech Style */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard
          icon={PoundSterling}
          label="This week"
          value={`£${thisWeek?.total.toFixed(0) || '0'}`}
          trend={earningsTrend}
          iconColor="text-success dark:text-success"
          iconBg="bg-success/15 dark:bg-success/20"
        />
        <StatCard
          icon={Calendar}
          label="Jobs completed"
          value={String(thisWeek?.jobCount || 0)}
          trend={jobsTrend}
          iconColor="text-primary dark:text-primary"
          iconBg="bg-primary/15 dark:bg-primary/20"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg job value"
          value={`£${avgJobValue.toFixed(0)}`}
          iconColor="text-primary dark:text-primary"
          iconBg="bg-primary/15 dark:bg-primary/20"
          subValue={avgJobValue > 0 ? `${((avgJobValue / weeklyTarget) * 100).toFixed(0)}% of target/job` : undefined}
        />
        <StatCard
          icon={Users}
          label="Active customers"
          value={String(customerCount)}
          iconColor="text-primary dark:text-primary"
          iconBg="bg-primary/15 dark:bg-primary/20"
          subValue={customerGrowthTrend !== 0 ? (
            <span className={cn(
              "font-semibold",
              customerGrowthTrend > 0 ? "text-success" : "text-destructive"
            )}>
              {customerGrowthTrend > 0 ? '+' : ''}{customerGrowthTrend} this month
            </span>
          ) : undefined}
        />
      </div>

      {/* Set Target Modals */}
      <SetTargetModal
        isOpen={weeklyTargetModalOpen}
        onClose={() => setWeeklyTargetModalOpen(false)}
        onSave={(value) => handleSaveTarget('weekly', value)}
        currentTarget={userWeeklyTarget ?? defaultWeeklyTarget}
        targetType="weekly"
        avgJobValue={avgJobValue}
        activeCustomers={customerCount}
        currentEarnings={thisWeek?.total || 0}
      />

      <SetTargetModal
        isOpen={monthlyGoalModalOpen}
        onClose={() => setMonthlyGoalModalOpen(false)}
        onSave={(value) => handleSaveTarget('monthly', value)}
        currentTarget={userMonthlyGoal ?? defaultMonthlyGoal}
        targetType="monthly"
        avgJobValue={avgJobValue}
        activeCustomers={customerCount}
        currentEarnings={currentMonthEarnings}
      />
    </div>
  );
}
