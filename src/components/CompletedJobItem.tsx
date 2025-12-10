import { motion } from 'framer-motion';
import { Check, Clock } from 'lucide-react';
import { JobWithCustomer } from '@/types/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CompletedJobItemProps {
  job: JobWithCustomer;
  index: number;
}

export function CompletedJobItem({ job, index }: CompletedJobItemProps) {
  const completedTime = job.completed_at 
    ? format(new Date(job.completed_at), 'HH:mm')
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
      )}
    >
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
        <Check className="w-5 h-5 text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {job.customer.name}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {job.customer.address}
        </p>
      </div>

      <div className="text-right">
        <p className="font-bold text-accent">
          £{job.amount_collected}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {completedTime}
        </div>
      </div>
    </motion.div>
  );
}
