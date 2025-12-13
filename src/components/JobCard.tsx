import { Check, MapPin, SkipForward, Navigation, Phone, GripVertical } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo, Reorder, useDragControls } from 'framer-motion';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { CustomerNotesPreview } from './CustomerNotesPreview';
import { Button } from './ui/button';

interface JobCardProps {
  job: JobWithCustomer;
  onComplete: (job: JobWithCustomer) => void;
  onSkip: (jobId: string) => void;
  index: number;
  isNextUp?: boolean;
}

const SWIPE_THRESHOLD = 100;

export function JobCard({ job, onComplete, onSkip, index, isNextUp = false }: JobCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const x = useMotionValue(0);
  const dragControls = useDragControls();
  
  // Background colors based on swipe direction
  const backgroundColor = useTransform(
    x,
    [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    ['hsl(var(--success))', 'hsl(var(--card))', 'hsl(var(--muted))']
  );

  const triggerHaptic = (type: 'light' | 'medium') => {
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'light' ? 10 : 25);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x < -SWIPE_THRESHOLD) {
      triggerHaptic('medium');
      onComplete(job);
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      triggerHaptic('light');
      onSkip(job.id);
    }
  };

  const handleComplete = () => {
    onComplete(job);
  };

  const handleSkip = () => {
    onSkip(job.id);
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const encodedAddress = encodeURIComponent(job.customer.address);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      window.open(`maps://maps.apple.com/?daddr=${encodedAddress}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.customer.mobile_phone) {
      window.open(`tel:${job.customer.mobile_phone.replace(/\s/g, '')}`, '_self');
    }
  };

  return (
    <Reorder.Item
      value={job}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0, scale: isReordering ? 1.02 : 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn("relative", isReordering && "z-50")}
      whileDrag={{ scale: 1.03, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
      onDragStart={() => setIsReordering(true)}
      onDragEnd={() => setIsReordering(false)}
    >
      {/* Swipe action backgrounds */}
      <motion.div 
        className="absolute inset-0 rounded-xl"
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
        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-success-foreground"
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
          "bg-card rounded-xl shadow-sm border border-border overflow-hidden relative",
          isDragging && "cursor-grabbing",
          isNextUp && "border-2 border-primary shadow-md"
        )}
      >
        {/* Next Up Badge - Inside the card */}
        {isNextUp && (
          <div className="bg-primary/10 px-4 py-1.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Next Up</span>
          </div>
        )}

        <div className="flex items-stretch">
          {/* Drag Handle */}
          <div
            className="w-10 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-muted/30 hover:bg-muted/50 transition-colors border-r border-border"
            onPointerDown={(e) => {
              e.preventDefault();
              dragControls.start(e);
            }}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          
          {/* Content */}
          <div className="flex-1 p-4 flex flex-col justify-center">
            <div className="flex items-start gap-2 mb-1">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <h3 className="font-semibold text-foreground text-base leading-tight">
                {job.customer.address}
              </h3>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xl font-bold text-foreground">
                £{job.customer.price}
              </span>
              <span className="text-sm text-muted-foreground">
                {job.customer.name}
              </span>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigate}
                className="gap-1.5 text-primary border-primary/20 hover:bg-primary/10 h-9"
              >
                <Navigation className="w-4 h-4" />
                Navigate
              </Button>
              
              {job.customer.mobile_phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCall}
                  className="gap-1.5 text-success border-success/20 hover:bg-success/10 h-9"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </Button>
              )}
              
              {job.customer.notes && (
                <CustomerNotesPreview notes={job.customer.notes} customerName={job.customer.name} />
              )}
            </div>
          </div>

          {/* Action buttons column */}
          <div className="flex flex-col border-l border-border">
            {/* Skip Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSkip}
              className={cn(
                "w-16 flex-1 flex items-center justify-center min-h-[52px]",
                "bg-muted/50 hover:bg-muted transition-colors border-b border-border",
                "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-muted"
              )}
              aria-label={`Skip ${job.customer.name}`}
            >
              <SkipForward className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            {/* Complete Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleComplete}
              className={cn(
                "w-16 flex-1 flex items-center justify-center min-h-[52px]",
                "bg-success hover:bg-success/90 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-success"
              )}
              aria-label={`Mark ${job.customer.name} as complete`}
            >
              <Check className="w-6 h-6 text-success-foreground" strokeWidth={3} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}
