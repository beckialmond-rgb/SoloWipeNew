import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Users, PoundSterling, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeekData {
  weekStart: Date;
  weekLabel: string;
  total: number;
  jobCount: number;
}

interface BusinessInsightsProps {
  weeklyEarnings: WeekData[];
  customerCount: number;
  className?: string;
}

export function BusinessInsights({ weeklyEarnings, customerCount, className }: BusinessInsightsProps) {
  const thisWeek = weeklyEarnings[0];
  const lastWeek = weeklyEarnings[1];
  
  // Calculate trend
  const earningsTrend = lastWeek?.total > 0 
    ? ((thisWeek?.total - lastWeek?.total) / lastWeek?.total) * 100 
    : 0;
  
  const jobsTrend = lastWeek?.jobCount > 0
    ? ((thisWeek?.jobCount - lastWeek?.jobCount) / lastWeek?.jobCount) * 100
    : 0;
  
  // Calculate averages
  const avgJobValue = thisWeek?.jobCount > 0 
    ? thisWeek.total / thisWeek.jobCount 
    : 0;
  
  // Weekly target (based on last 4 weeks average)
  const last4Weeks = weeklyEarnings.slice(0, 4);
  const avgWeeklyEarnings = last4Weeks.reduce((sum, w) => sum + w.total, 0) / 4;
  const weeklyTarget = Math.ceil(avgWeeklyEarnings / 50) * 50 + 50; // Round up to nearest 50 + buffer
  const targetProgress = weeklyTarget > 0 ? (thisWeek?.total / weeklyTarget) * 100 : 0;

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue,
    trend,
    iconColor = "text-primary"
  }: {
    icon: typeof TrendingUp;
    label: string;
    value: string;
    subValue?: string;
    trend?: number;
    iconColor?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-4"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", 
          iconColor === "text-primary" ? "bg-primary/10" : 
          iconColor === "text-accent" ? "bg-accent/10" : "bg-muted"
        )}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            trend > 0 ? "text-accent" : "text-destructive"
          )}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(0)}%
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground/70 mt-1">{subValue}</p>
      )}
    </motion.div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-sm font-medium text-muted-foreground">This Week's Insights</h3>
      
      {/* Progress to target */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Weekly Target</span>
          </div>
          <span className="text-sm font-bold text-foreground">
            £{thisWeek?.total.toFixed(0)} / £{weeklyTarget}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(targetProgress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              targetProgress >= 100 ? "bg-accent" : "bg-primary"
            )}
          />
        </div>
        {targetProgress >= 100 ? (
          <p className="text-xs text-accent mt-2 font-medium">🎉 Target reached!</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-2">
            £{(weeklyTarget - (thisWeek?.total || 0)).toFixed(0)} to go
          </p>
        )}
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={PoundSterling}
          label="This week"
          value={`£${thisWeek?.total.toFixed(0) || '0'}`}
          trend={earningsTrend}
          iconColor="text-accent"
        />
        <StatCard
          icon={Calendar}
          label="Jobs completed"
          value={String(thisWeek?.jobCount || 0)}
          trend={jobsTrend}
          iconColor="text-primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg job value"
          value={`£${avgJobValue.toFixed(0)}`}
          iconColor="text-primary"
        />
        <StatCard
          icon={Users}
          label="Active customers"
          value={String(customerCount)}
          iconColor="text-primary"
        />
      </div>
    </div>
  );
}
