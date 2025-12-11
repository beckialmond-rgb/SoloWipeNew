import { motion } from 'framer-motion';
import { Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeekData {
  weekStart: Date;
  weekLabel: string;
  total: number;
  jobCount: number;
}

interface WeeklyEarningsSummaryProps {
  weeks: WeekData[];
}

export function WeeklyEarningsSummary({ weeks }: WeeklyEarningsSummaryProps) {
  // Calculate the max for scaling the bars
  const maxTotal = Math.max(...weeks.map(w => w.total), 1);
  
  // Calculate total for all weeks
  const grandTotal = weeks.reduce((sum, w) => sum + w.total, 0);
  const totalJobs = weeks.reduce((sum, w) => sum + w.jobCount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Weekly Summary</h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{totalJobs} jobs</p>
          <p className="text-lg font-bold text-foreground">£{grandTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Weekly Bars */}
      <div className="space-y-3">
        {weeks.slice(0, 6).map((week, index) => (
          <motion.div
            key={week.weekLabel}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "p-3 rounded-xl bg-muted/50 border border-border/50"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {week.weekLabel}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {week.jobCount} {week.jobCount === 1 ? 'job' : 'jobs'}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  £{week.total.toFixed(2)}
                </span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(week.total / maxTotal) * 100}%` }}
                transition={{ delay: index * 0.05 + 0.2, duration: 0.4 }}
                className={cn(
                  "h-full rounded-full",
                  index === 0 ? "bg-accent" : "bg-primary/60"
                )}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Trend indicator */}
      {weeks[0]?.total > 0 && weeks[1]?.total > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent/10 border border-accent/20">
          <TrendingUp className={cn(
            "w-4 h-4",
            weeks[0].total >= weeks[1].total ? "text-accent" : "text-muted-foreground"
          )} />
          <span className="text-sm text-foreground">
            {weeks[0].total >= weeks[1].total ? (
              <>This week is <strong className="text-accent">up</strong> from last week</>
            ) : (
              <>This week is <strong>down</strong> from last week</>
            )}
          </span>
        </div>
      )}
    </motion.div>
  );
}
