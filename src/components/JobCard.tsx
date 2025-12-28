import { Check, MapPin, SkipForward, Navigation, Phone, GripVertical, CreditCard, Clock } from 'lucide-react';
import { motion, useMotionValue, useTransform, PanInfo, Reorder, useDragControls } from 'framer-motion';
import { JobWithCustomer, JobWithCustomerAndAssignment } from '@/types/database';
import { cn } from '@/lib/utils';
import { useState, forwardRef } from 'react';
import { CustomerNotesPreview } from './CustomerNotesPreview';
import { TextCustomerButton } from './TextCustomerButton';
import { Button } from './ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { useSubscription } from '@/hooks/useSubscription';
import { JobAssignmentAvatar } from './JobAssignmentAvatar';

interface JobCardProps {
  job: JobWithCustomer | JobWithCustomerAndAssignment;
  onComplete: (job: JobWithCustomer) => void;
  onSkip: (jobId: string) => void;
  index: number;
  isNextUp?: boolean;
  businessName?: string;
  onAssignClick?: (job: JobWithCustomerAndAssignment) => void;
  showAssignment?: boolean;
}

const SWIPE_THRESHOLD = 100;

export const JobCard = forwardRef<HTMLLIElement, JobCardProps>(({ job, onComplete, onSkip, index, isNextUp = false, businessName = 'SoloWipe', onAssignClick, showAssignment = false }, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const x = useMotionValue(0);
  const dragControls = useDragControls();
  const { lightTap, success } = useHaptics();
  const { requirePremium, canPerformAction, isLocked, isInGracePeriod } = useSoftPaywall();
  const { subscribed, status } = useSubscription();
  
  // Check if actions should be disabled (soft lock)
  const actionsDisabled = !canPerformAction('complete');
  
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
      ref={ref}
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
        drag={actionsDisabled ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "bg-card rounded-2xl shadow-award border-2 border-border overflow-hidden relative swipe-card min-h-[140px] sm:min-h-[120px] card-award transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isDragging && "cursor-grabbing scale-105 shadow-award ring-4 ring-primary/30",
          isNextUp ? "border-l-4 border-l-primary border-t-2 border-r-2 border-b-2 ring-4 ring-primary/30 glow-award" : "",
          actionsDisabled && "cursor-default opacity-75",
          !isDragging && "hover:shadow-award hover:scale-[1.02] hover:-translate-y-1"
        )}
      >

        <div className="flex items-stretch flex-ios-fix">
          {/* Drag Handle */}
          <div
            className="w-8 sm:w-10 flex items-center justify-center cursor-grab active:cursor-grabbing bg-muted/30 hover:bg-muted/50 transition-colors border-r border-border drag-handle flex-shrink-0"
            onPointerDown={(e) => {
              e.preventDefault();
              dragControls.start(e);
            }}
          >
            <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
            {job.customer ? (
              <>
                {/* Customer info - prioritized layout */}
                <div className="mb-3 space-y-2.5">
                  {/* Customer name - larger, prominent, wraps if needed */}
                  <div className="flex items-start gap-2">
                    <h3 className="font-bold text-foreground text-xl leading-tight flex-1 min-w-0 pr-1">
                      {job.customer.name || 'Unknown Customer'}
                    </h3>
                    {/* Status indicators and assignment */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {showAssignment && onAssignClick && (
                        <JobAssignmentAvatar
                          job={job as JobWithCustomerAndAssignment}
                          onClick={() => onAssignClick(job as JobWithCustomerAndAssignment)}
                          size="sm"
                        />
                      )}
                      {job.customer.gocardless_mandate_status === 'pending' ? (
                        <span title="DD Pending"><Clock className="w-4 h-4 text-warning" /></span>
                      ) : job.customer.gocardless_id ? (
                        <span title="DD Active"><CreditCard className="w-4 h-4 text-success" /></span>
                      ) : null}
                    </div>
                  </div>
                  
                  {/* Address - larger, more visible */}
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground leading-snug flex-1 min-w-0 break-words">
                      {job.customer.address?.split(/[,\n]/)[0].trim() || 'No address'}
                    </p>
                  </div>
                  
                  {/* Price - smaller, secondary position */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="text-sm font-medium text-muted-foreground">Price:</span>
                    <span className="text-lg font-bold text-foreground">
                      £{job.customer.price || 0}
                    </span>
                  </div>
                </div>

                {/* Quick action buttons - optimized for one-thumb use */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleNavigate}
                    className="flex-1 min-w-[140px] touch-sm min-h-[44px] gap-2"
                  >
                    <Navigation className="w-4 h-4 shrink-0" />
                    <span className="text-sm">Navigate</span>
                  </Button>
                  
                  {job.customer?.mobile_phone && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleCall}
                      className="flex-1 min-w-[120px] touch-sm min-h-[44px] gap-2"
                      aria-label="Call customer"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                      <span className="text-sm">Call</span>
                    </Button>
                  )}
                  
                  {job.customer?.notes && (
                    <div className="flex-shrink-0">
                      <CustomerNotesPreview notes={job.customer.notes} customerName={job.customer.name || 'Customer'} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                Customer data unavailable
              </div>
            )}
          </div>

          {/* Action buttons section - vertical layout for better spacing */}
          <div className="flex flex-col items-center gap-1.5 border-l border-border px-2 py-2 relative z-10 flex-shrink-0">
            {/* Text Customer Button - only renders if phone exists */}
            {job.customer?.mobile_phone && (
              <div className="flex-shrink-0">
                <TextCustomerButton
                  phoneNumber={job.customer?.mobile_phone}
                  customerName={job.customer?.name || 'Customer'}
                  customerAddress={job.customer?.address}
                  jobPrice={job.customer?.price}
                  scheduledDate={job.scheduled_date}
                  businessName={businessName}
                  iconOnly={true}
                />
              </div>
            )}
            
            {/* Complete/Skip buttons - vertical stack */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {/* Skip Button */}
              <motion.button
                whileTap={actionsDisabled ? {} : { scale: 0.95 }}
                onClick={handleSkip}
                disabled={actionsDisabled}
                className={cn(
                  "w-11 h-11 flex items-center justify-center flex-shrink-0 touch-sm min-h-[44px]",
                  "bg-muted/50 hover:bg-muted transition-colors rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-muted",
                  actionsDisabled && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`Skip ${job.customer?.name || 'job'}`}
                title={actionsDisabled ? (isInGracePeriod ? "Upgrade to continue" : "Subscribe to continue") : undefined}
              >
                <SkipForward className="w-5 h-5 text-muted-foreground" />
              </motion.button>

              {/* Complete Button */}
              <motion.button
                whileTap={actionsDisabled ? {} : { scale: 0.95 }}
                onClick={handleComplete}
                disabled={actionsDisabled}
                className={cn(
                  "w-11 h-11 flex items-center justify-center flex-shrink-0 touch-sm min-h-[44px]",
                  "bg-success hover:bg-success/90 transition-colors rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-success",
                  actionsDisabled && "opacity-50 cursor-not-allowed"
                )}
                aria-label={`Mark ${job.customer?.name || 'job'} as complete`}
                title={actionsDisabled ? (isInGracePeriod ? "Upgrade to continue" : "Subscribe to continue") : undefined}
              >
                <Check className="w-5 h-5 text-success-foreground" strokeWidth={3} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
});

JobCard.displayName = 'JobCard';
