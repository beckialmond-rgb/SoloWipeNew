import { Check, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: JobWithCustomer;
  onComplete: (jobId: string) => void;
  index: number;
}

export function JobCard({ job, onComplete, index }: JobCardProps) {
  const handleComplete = () => {
    onComplete(job.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={cn(
        "bg-card rounded-2xl shadow-sm border border-border",
        "border-l-4 border-l-primary",
        "flex items-stretch overflow-hidden",
        "fat-card"
      )}
    >
      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-center">
        <div className="flex items-start gap-2 mb-1">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <h3 className="font-semibold text-foreground text-base leading-tight">
            {job.customer.address}
          </h3>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-lg font-bold text-foreground">
            £{job.customer.price}
          </span>
          <span className="text-sm text-muted-foreground">
            {job.customer.name}
          </span>
        </div>
      </div>

      {/* Complete Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleComplete}
        className={cn(
          "w-24 flex items-center justify-center",
          "bg-accent hover:bg-accent/90 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        )}
        aria-label={`Mark ${job.customer.name} as complete`}
      >
        <Check className="w-8 h-8 text-accent-foreground" strokeWidth={3} />
      </motion.button>
    </motion.div>
  );
}
