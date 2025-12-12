import { Check, MapPin, SkipForward } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface JobCardProps {
  job: JobWithCustomer;
  onComplete: (jobId: string) => void;
  onSkip: (jobId: string) => void;
  index: number;
}

const SWIPE_THRESHOLD = 100;

export function JobCard({ job, onComplete, onSkip, index }: JobCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  
  // Background colors based on swipe direction
  const backgroundColor = useTransform(
    x,
    [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    ['hsl(var(--accent))', 'hsl(var(--card))', 'hsl(var(--muted))']
  );

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x < -SWIPE_THRESHOLD) {
      onComplete(job.id);
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      onSkip(job.id);
    }
  };

  const handleComplete = () => {
    onComplete(job.id);
  };

  const handleSkip = () => {
    onSkip(job.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="relative rounded-2xl overflow-hidden fat-card"
    >
      {/* Swipe action backgrounds */}
      <motion.div 
        className="absolute inset-0 rounded-2xl"
        style={{ backgroundColor }}
      />
      
      {/* Skip indicator (right swipe) */}
      <motion.div 
        className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground"
        style={{ opacity: useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]) }}
      >
        <SkipForward className="w-6 h-6" />
        <span className="font-medium text-sm">Skip</span>
      </motion.div>
      
      {/* Complete indicator (left swipe) */}
      <motion.div 
        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-accent-foreground"
        style={{ opacity: useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]) }}
      >
        <span className="font-medium text-sm">Done</span>
        <Check className="w-6 h-6" strokeWidth={3} />
      </motion.div>

      {/* Draggable card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "bg-card rounded-2xl shadow-sm border border-border",
          "border-l-4 border-l-primary",
          "flex items-stretch overflow-hidden relative",
          isDragging && "cursor-grabbing"
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

        {/* Skip Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSkip}
          className={cn(
            "w-16 flex items-center justify-center",
            "bg-muted hover:bg-muted/80 transition-colors border-r border-border",
            "focus:outline-none focus:ring-2 focus:ring-muted focus:ring-offset-2"
          )}
          aria-label={`Skip ${job.customer.name}`}
        >
          <SkipForward className="w-6 h-6 text-muted-foreground" />
        </motion.button>

        {/* Complete Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleComplete}
          className={cn(
            "w-20 flex items-center justify-center",
            "bg-accent hover:bg-accent/90 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          )}
          aria-label={`Mark ${job.customer.name} as complete`}
        >
          <Check className="w-8 h-8 text-accent-foreground" strokeWidth={3} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
