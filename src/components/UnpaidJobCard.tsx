import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, MessageSquare, PoundSterling, CreditCard, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { openSMSApp, prepareSMSContext } from '@/utils/openSMS';

interface UnpaidJobCardProps {
  job: JobWithCustomer;
  index: number;
  businessName?: string;
  onMarkPaid: () => void;
  onCollectNow?: (job: JobWithCustomer) => void;
  onSyncPayment?: (job: JobWithCustomer) => void;
  isProcessing?: boolean;
  isCollecting?: boolean;
  isOverdue?: boolean;
  daysSince?: number;
  showSuccessAnimation?: boolean;
}

export function UnpaidJobCard({ 
  job, 
  index, 
  businessName = 'Your window cleaner', 
  onMarkPaid,
  onCollectNow,
  onSyncPayment,
  isProcessing = false,
  isCollecting = false,
  isOverdue = false,
  daysSince = 0,
  showSuccessAnimation = false
}: UnpaidJobCardProps) {
  const firstName = job.customer.name.split(' ')[0];
  const completedDate = job.completed_at ? format(new Date(job.completed_at), 'd MMM') : 'recently';
  const amount = (job.amount_collected || 0).toFixed(2);
  
  const { showTemplatePicker } = useSMSTemplateContext();

  const handleSendReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Use actual job amount_collected, fallback to customer price - ensure it's a valid number
    const jobAmount = (job.amount_collected && job.amount_collected > 0) 
      ? job.amount_collected 
      : ((job.customer?.price && job.customer.price > 0) ? job.customer.price : undefined);
    const isGoCardlessActive = job.customer?.gocardless_mandate_status === 'active' && !!job.customer?.gocardless_id;
    
    const context = prepareSMSContext({
      customerName: job.customer?.name,
      customerFirstName: firstName,
      customerAddress: job.customer?.address,
      completedDate: completedDate,
      amount: jobAmount,
      jobTotal: jobAmount,
      businessName: businessName,
      isGoCardlessActive,
    });
    
    const phone = job.customer.mobile_phone || '';
    showTemplatePicker('unpaid_reminder', context, (message) => {
      openSMSApp(phone, message);
    });
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = job.customer.mobile_phone?.replace(/\s/g, '') || '';
    window.open(`tel:${phone}`, '_self');
  };

  // Extract address line 1 for compact display
  const addressLine1 = job.customer.address.split(/[,\n]/)[0].trim();
  
  // Check if customer has Active DD mandate
  const hasActiveDD = job.customer?.gocardless_mandate_status === 'active' && job.customer?.gocardless_id;
  
  // Check if payment is processing (GoCardless payment in progress)
  const isPaymentProcessing = job.payment_status === 'processing' && job.payment_method === 'gocardless';
  
  // Get mandate status badge info
  const getMandateStatusBadge = () => {
    if (hasActiveDD) {
      return {
        label: 'Active DD',
        className: 'bg-success/15 dark:bg-success/25 text-success dark:text-success border-success/30 dark:border-success/40',
        icon: CreditCard,
      };
    } else if (job.customer?.gocardless_mandate_status === 'pending') {
      return {
        label: 'Pending',
        className: 'bg-warning/15 dark:bg-warning/25 text-warning dark:text-warning border-warning/30 dark:border-warning/40',
        icon: Clock,
      };
    } else if (job.customer?.gocardless_id) {
      return {
        label: 'Invite Sent',
        className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
        icon: Clock,
      };
    }
    return null;
  };
  
  const mandateBadge = getMandateStatusBadge();

  return (
    <AnimatePresence mode="wait">
      {!showSuccessAnimation ? (
        <motion.div
          key={job.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ delay: index * 0.03 }}
          className={cn(
            "relative bg-card rounded-xl border overflow-hidden transition-all",
            isOverdue 
              ? "border-destructive/50 bg-destructive/5 shadow-lg shadow-destructive/10" 
              : "border-border shadow-sm"
          )}
        >
          {/* Overdue indicator bar */}
          {isOverdue && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive to-red-500" />
          )}

          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <p className={cn(
                    "font-semibold text-foreground truncate",
                    isOverdue ? "text-base" : "text-lg"
                  )}>
                    {job.customer.name}
                  </p>
                  {/* Status indicators */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isOverdue && (
                      <span 
                        className="px-2 py-0.5 bg-destructive/15 dark:bg-destructive/25 text-destructive dark:text-destructive rounded-full text-xs font-bold flex items-center gap-1 border border-destructive/30 dark:border-destructive/40"
                        title={`${daysSince} days overdue`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {daysSince}d
                      </span>
                    )}
                    {mandateBadge && (
                      <span 
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                          mandateBadge.className
                        )}
                        title={mandateBadge.label}
                      >
                        {mandateBadge.icon && <mandateBadge.icon className="w-3 h-3" />}
                        {mandateBadge.label}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Compact info grid */}
                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="truncate">{addressLine1}</span>
                  
                  <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {completedDate}
                    {daysSince > 0 && (
                      <span className={cn(
                        "ml-1.5 font-medium",
                        isOverdue ? "text-destructive" : "text-muted-foreground"
                      )}>
                        • {daysSince} day{daysSince !== 1 ? 's' : ''} ago
                      </span>
                    )}
                  </span>
                </div>
              </div>
              
              {/* Amount - prominent */}
              <div className="text-right shrink-0">
                <div className={cn(
                  "flex items-center gap-1 justify-end",
                  isOverdue ? "text-destructive" : "text-warning"
                )}>
                  <PoundSterling className={cn(
                    "shrink-0",
                    isOverdue ? "w-5 h-5" : "w-6 h-6"
                  )} />
                  <span className={cn(
                    "font-bold",
                    isOverdue ? "text-2xl" : "text-3xl"
                  )}>
                    {amount}
                  </span>
                </div>
              </div>
            </div>

            {/* Processing messaging for GoCardless payments */}
            {isPaymentProcessing && (
              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 flex-1">
                    ⏳ Payment processing via GoCardless. Funds typically arrive in 3-5 working days.
                    {job.gocardless_payment_status && (
                      <span className="block mt-1 font-medium">
                        Status: {job.gocardless_payment_status}
                      </span>
                    )}
                  </p>
                  {onSyncPayment && job.gocardless_payment_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      onClick={() => onSyncPayment(job)}
                      disabled={isCollecting}
                      title="Sync payment status from GoCardless"
                    >
                      <Clock className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Quick action buttons - optimized for one-thumb use */}
            <div className="flex flex-col gap-2">
              {/* Collect Now button for Active DD customers - prioritized */}
              {hasActiveDD && onCollectNow && !isPaymentProcessing && (
                <Button
                  variant="default"
                  size="lg"
                  className={cn(
                    "w-full touch-sm min-h-[56px] gap-2 shadow-lg",
                    "bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success",
                    "text-white font-semibold text-base"
                  )}
                  onClick={() => onCollectNow(job)}
                  disabled={isCollecting || isPaymentProcessing}
                >
                  {isCollecting ? (
                    <>
                      <Clock className="w-5 h-5 shrink-0 animate-spin" />
                      <span>Collecting Payment...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 shrink-0" />
                      <span>Collect Now via Direct Debit</span>
                    </>
                  )}
                </Button>
              )}
              
              {/* Standard action buttons */}
              <div className="flex gap-2">
                {job.customer.mobile_phone && (
                  <>
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 touch-sm min-h-[44px] gap-2"
                      onClick={handleSendReminder}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="text-sm">Remind</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-14 touch-sm min-h-[44px]"
                      onClick={handleCall}
                      aria-label="Call customer"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {!hasActiveDD && (
                  <Button
                    variant="success"
                    size="lg"
                    className={cn(
                      "touch-sm min-h-[44px] gap-2",
                      job.customer.mobile_phone ? "flex-1" : "flex-1"
                    )}
                    onClick={onMarkPaid}
                    disabled={isProcessing || isCollecting || isPaymentProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Clock className="w-4 h-4 shrink-0 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">Mark Paid</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={`success-${job.id}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="relative bg-success/10 dark:bg-success/20 border-2 border-success dark:border-success rounded-xl p-4 overflow-hidden"
        >
          <div className="flex items-center justify-center gap-3 py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-12 h-12 rounded-full bg-success flex items-center justify-center"
            >
              <CheckCircle className="w-7 h-7 text-white" />
            </motion.div>
            <div className="text-center">
              <p className="text-success dark:text-success font-bold text-lg">Payment Recorded!</p>
              <p className="text-success/80 dark:text-success/90 text-sm">£{amount} from {job.customer.name}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
