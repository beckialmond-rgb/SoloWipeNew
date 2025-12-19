import { Check, MapPin, SkipForward, Navigation, Phone, GripVertical, CreditCard, Clock } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo, Reorder, useDragControls } from 'framer-motion';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { CustomerNotesPreview } from './CustomerNotesPreview';
import { TextCustomerButton } from './TextCustomerButton';
import { Button } from './ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { useSubscription } from '@/hooks/useSubscription';

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
  const { lightTap, success } = useHaptics();
  const { requirePremium } = useSoftPaywall();
  const { subscribed, status } = useSubscription();
  
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

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    // Check if user has premium access (subscribed or trialing)
    const hasPremium = subscribed || status === 'trialing';
    
    if (info.offset.x < -SWIPE_THRESHOLD) {
      // Show paywall modal if not premium, otherwise complete
      if (!hasPremium && !requirePremium('complete')) return;
      triggerHaptic('medium');
      onComplete(job);
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      // Show paywall modal if not premium, otherwise skip
      if (!hasPremium && !requirePremium('skip')) return;
      triggerHaptic('light');
      onSkip(job.id);
    }
  };

  const handleComplete = () => {
    if (!requirePremium('complete')) return;
    onComplete(job);
  };

  const handleSkip = () => {
    if (!requirePremium('skip')) return;
    onSkip(job.id);
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!job.customer?.address) {
      return;
    }
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
    if (job.customer?.mobile_phone) {
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
      onDragStart={() => {
        setIsReordering(true);
        lightTap();
      }}
      onDragEnd={() => {
        setIsReordering(false);
        success();
      }}
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
          "bg-card rounded-xl shadow-sm border overflow-hidden relative swipe-card min-h-[140px]",
          isDragging && "cursor-grabbing",
          isNextUp ? "border-l-4 border-l-primary border-t border-r border-b border-border" : "border-border"
        )}
      >

        <div className="flex items-stretch flex-ios-fix">
          {/* Drag Handle */}
          <div
            className="w-10 flex items-center justify-center cursor-grab active:cursor-grabbing bg-muted/30 hover:bg-muted/50 transition-colors border-r border-border drag-handle"
            onPointerDown={(e) => {
              e.preventDefault();
              dragControls.start(e);
            }}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
            {job.customer ? (
              <>
                <div className="flex items-start gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <h3 className="font-semibold text-foreground text-base leading-tight truncate min-w-0">
                    {job.customer.address || 'No address'}
                  </h3>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xl font-bold text-foreground">
                    £{job.customer.price || 0}
                  </span>
                  <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                    {job.customer.name || 'Unknown Customer'}
                  </span>
                  {/* Mandate Status Indicator */}
                  {job.customer.gocardless_mandate_status === 'pending' ? (
                    <span title="DD Pending"><Clock className="w-4 h-4 text-warning" /></span>
                  ) : job.customer.gocardless_id ? (
                    <span title="DD Active"><CreditCard className="w-4 h-4 text-success" /></span>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Customer data unavailable
              </div>
            )}

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
              
              {job.customer?.mobile_phone && (
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
              
              {job.customer?.notes && (
                <CustomerNotesPreview notes={job.customer.notes} customerName={job.customer.name || 'Customer'} />
              )}
            </div>
          </div>

          {/* Action buttons section - horizontal layout */}
          <div className="flex items-center gap-2 border-l border-border px-2 relative z-10">
            {/* Text Customer Button - LEFT side, only show if phone exists */}
            {job.customer?.mobile_phone && (
              <div className="flex-shrink-0">
                <TextCustomerButton
                  phoneNumber={job.customer.mobile_phone}
                  customerName={job.customer?.name || 'Customer'}
                  iconOnly={true}
                />
              </div>
            )}
            
            {/* Complete/Skip buttons - RIGHT side, horizontal */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Skip Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSkip}
                className={cn(
                  "w-12 h-12 flex items-center justify-center",
                  "bg-muted/50 hover:bg-muted transition-colors rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-muted"
                )}
                aria-label={`Skip ${job.customer?.name || 'job'}`}
              >
                <SkipForward className="w-5 h-5 text-muted-foreground" />
              </motion.button>

              {/* Complete Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleComplete}
                className={cn(
                  "w-12 h-12 flex items-center justify-center",
                  "bg-success hover:bg-success/90 transition-colors rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-success"
                )}
                aria-label={`Mark ${job.customer?.name || 'job'} as complete`}
              >
                <Check className="w-5 h-5 text-success-foreground" strokeWidth={3} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}
