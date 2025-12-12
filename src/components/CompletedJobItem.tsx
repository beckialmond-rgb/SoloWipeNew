import { motion } from 'framer-motion';
import { Check, Clock, CheckCircle, Circle } from 'lucide-react';
import { JobWithCustomer } from '@/types/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CompletedJobItemProps {
  job: JobWithCustomer;
  index: number;
  onMarkPaid?: (job: JobWithCustomer) => void;
}

export function CompletedJobItem({ job, index, onMarkPaid }: CompletedJobItemProps) {
  const completedTime = job.completed_at 
    ? format(new Date(job.completed_at), 'HH:mm')
    : '';

  const isPaid = job.payment_status === 'paid';

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

      <div className="text-right flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-accent">
            £{job.amount_collected}
          </p>
          {isPaid ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <Circle className="w-4 h-4 text-amber-500 fill-amber-500" />
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {completedTime}
          {isPaid && job.payment_method && (
            <span className="capitalize ml-1">• {job.payment_method}</span>
          )}
        </div>
        {!isPaid && onMarkPaid && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs mt-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
            onClick={() => onMarkPaid(job)}
          >
            Mark Paid
          </Button>
        )}
      </div>
    </motion.div>
  );
}
