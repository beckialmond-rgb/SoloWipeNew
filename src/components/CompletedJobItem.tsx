import { motion } from 'framer-motion';
import { Check, Clock, CheckCircle, Circle, StickyNote, Image, MessageSquare, MapPin, ChevronDown, ChevronUp, Wallet, AlertCircle } from 'lucide-react';
import { JobWithCustomer } from '@/types/database';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useSMSTemplateContext } from '@/contexts/SMSTemplateContext';
import { openSMSApp, prepareSMSContext } from '@/utils/openSMS';
import { useAuth } from '@/hooks/useAuth';

interface CompletedJobItemProps {
  job: JobWithCustomer;
  index: number;
  businessName?: string;
  onMarkPaid?: (job: JobWithCustomer) => void;
  onAddNote?: (job: JobWithCustomer) => void;
  isProcessing?: boolean;
  receiptSent?: boolean;
  isCurrentInQueue?: boolean;
  onReceiptSent?: (jobId: string) => void;
}

export function CompletedJobItem({ job, index, businessName = 'SoloWipe', onMarkPaid, onAddNote, isProcessing = false, receiptSent = false, isCurrentInQueue = false, onReceiptSent }: CompletedJobItemProps) {
  const { showTemplatePicker } = useSMSTemplateContext();
  const { user } = useAuth();
  const [showPhoto, setShowPhoto] = useState(false);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);
  const completedTime = job.completed_at 
    ? format(new Date(job.completed_at), 'HH:mm')
    : '';

  const isPaid = job.payment_status === 'paid';
  const isGoCardless = job.payment_method === 'gocardless';
  
  // Calculate fees for display (use stored values or calculate)
  const grossAmount = job.amount_collected || 0;
  const platformFee = job.platform_fee ?? (isGoCardless ? (grossAmount * 0.0075) + 0.30 : 0);
  const gocardlessFee = job.gocardless_fee ?? (isGoCardless ? Math.min((grossAmount * 0.01) + 0.20, 4.00) : 0);
  const netAmount = job.net_amount ?? (isGoCardless ? grossAmount - platformFee - gocardlessFee : grossAmount);
  
  // Payment status journey labels
  const paymentStatusLabels: Record<string, string> = {
    'pending_submission': 'Pending Submission',
    'submitted': 'Submitted',
    'confirmed': 'Confirmed',
    'paid_out': 'Paid Out',
    'failed': 'Failed',
    'cancelled': 'Cancelled',
    'charged_back': 'Charged Back',
  };

  // Payment type color coding (matches Money page) - with proper dark mode support
  const getPaymentTypeStyles = () => {
    if (!isPaid || !job.payment_method) return {};
    const method = job.payment_method.toLowerCase();
    if (method === 'cash') {
      return {
        bg: 'bg-green-50 dark:bg-green-950/30',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800/50',
        badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50'
      };
    } else if (method === 'transfer' || method === 'bank transfer' || method === 'bank') {
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800/50',
        badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50'
      };
    } else if (method.includes('direct debit') || method.includes('dd') || method.includes('gocardless')) {
      return {
        bg: 'bg-primary/10 dark:bg-primary/20',
        text: 'text-primary dark:text-primary',
        border: 'border-primary/20 dark:border-primary/30',
        badge: 'bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary font-semibold border border-primary/30 dark:border-primary/40'
      };
    }
    return {};
  };

  const paymentStyles = getPaymentTypeStyles();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "relative bg-card rounded-xl border overflow-hidden transition-all",
        isCurrentInQueue && "ring-2 ring-primary",
        isPaid && job.payment_method && paymentStyles.border ? `border ${paymentStyles.border}` : "border-border",
        isPaid && job.payment_method && paymentStyles.bg ? paymentStyles.bg : "",
        !isPaid && "border-border shadow-sm"
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-foreground text-lg truncate">
                {job.customer?.name || 'Unknown Customer'}
              </p>
              {/* Payment status indicator */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isPaid ? (
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-warning fill-warning flex-shrink-0" />
                )}
              </div>
            </div>
            
            {/* Compact info grid */}
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="truncate">{job.customer?.address?.split(/[,\n]/)[0].trim() || 'No address'}</span>
              
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{completedTime}</span>
            </div>
          </div>
          
          {/* Amount - prominent */}
          <div className="text-right shrink-0">
            <div className={cn(
              "flex items-center gap-1 justify-end mb-1",
              isPaid ? "text-success" : "text-warning"
            )}>
              <span className="text-3xl font-bold">
                £{job.amount_collected || 0}
              </span>
            </div>
            {/* Payment method badge */}
            {isPaid && job.payment_method && paymentStyles.badge && (
              <div className="flex flex-col items-end gap-1">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  paymentStyles.badge
                )}>
                  {job.payment_method === 'direct_debit' ? 'DD' : job.payment_method}
                </span>
                {/* Payment status journey for GoCardless */}
                {isGoCardless && job.gocardless_payment_status && paymentStatusLabels[job.gocardless_payment_status] && (
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                    job.gocardless_payment_status === 'paid_out' ? 'bg-success/20 text-success border border-success/30' :
                    job.gocardless_payment_status === 'confirmed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50' :
                    job.gocardless_payment_status === 'submitted' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50' :
                    job.gocardless_payment_status === 'failed' || job.gocardless_payment_status === 'cancelled' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                    'bg-muted text-muted-foreground border border-border'
                  )}>
                    {paymentStatusLabels[job.gocardless_payment_status]}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Processing time messaging for GoCardless payments - Full width banner */}
        {isGoCardless && job.payment_status === 'processing' && (
          <div className="mt-3 mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-700 dark:text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400 flex-1">
              Payment processing via GoCardless. Funds typically arrive in 3-5 working days.
            </p>
          </div>
        )}

        {/* Fee Breakdown for GoCardless Payments */}
        {isPaid && isGoCardless && (
          <div className="mt-3 pt-3 border-t border-border">
            <button
              onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
              className="w-full flex items-center justify-between text-sm hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">Fee Breakdown</span>
                {netAmount !== grossAmount && (
                  <span className="text-xs text-success">Net: £{netAmount.toFixed(2)}</span>
                )}
              </div>
              {showFeeBreakdown ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {showFeeBreakdown && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-2 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Gross Amount</span>
                  <span className="font-medium text-foreground">£{grossAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Platform Fee (0.75% + 30p)</span>
                  <span className="font-medium text-destructive">-£{platformFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">GoCardless Fee</span>
                  <span className="font-medium text-destructive">-£{gocardlessFee.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Net Payout</span>
                    <span className="text-lg font-bold text-success">£{netAmount.toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

      {/* Photo evidence thumbnail */}
      {job.photo_url && (
        <div className="mt-3 space-y-2">
          {showPhoto ? (
            <div className="relative">
              <img 
                src={job.photo_url} 
                alt="Job evidence" 
                className="w-full h-48 object-cover rounded-lg cursor-pointer"
                onClick={() => setShowPhoto(false)}
              />
              <p className="text-xs text-muted-foreground text-center mt-1">Tap to minimize</p>
            </div>
          ) : (
            <button
              onClick={() => setShowPhoto(true)}
              className="flex items-center gap-3 w-full"
            >
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img 
                  src={job.photo_url} 
                  alt="Job evidence thumbnail" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <Image className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-sm text-primary">Photo evidence captured</span>
            </button>
          )}
        </div>
      )}

      {/* Send Service Receipt via SMS button - shown for all completed jobs with phone */}
      {job.customer?.mobile_phone && (
        <div className={job.photo_url ? "mt-2" : "mt-3"}>
          <div className="flex items-center gap-2">
            {receiptSent && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-success font-medium">Sent</span>
              </div>
            )}
          <Button
            size="lg"
            variant="outline"
            className={cn(
              "flex-1 gap-2 touch-sm min-h-[44px]",
              receiptSent 
                ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600"
                : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
            )}
            disabled={receiptSent}
              onClick={async (e) => {
              e.stopPropagation();
              
              // Get customer data for receipt SMS (matching template variables)
              const customerName = job.customer?.name || 'Customer';
              const fullAddress = job.customer?.address || '';
              
              // Use actual job amount_collected, fallback to customer price - ensure it's a valid number
              // This matches the receipt template variable {{job_total}}
              const jobAmount = (job.amount_collected && job.amount_collected > 0) 
                ? job.amount_collected 
                : ((job.customer?.price && job.customer.price > 0) ? job.customer.price : undefined);
              
              // Format completed date for receipt (matches template usage)
              const completedDateFormatted = job.completed_at 
                ? format(new Date(job.completed_at), 'd MMM yyyy')
                : '';
              
              // Handle photo URL shortening if needed (for {{photo_url}} template variable)
              let photoUrl = job.photo_url;
              if (photoUrl) {
                try {
                  const encodedUrl = encodeURIComponent(photoUrl);
                  const tinyUrlResponse = await fetch(`https://tinyurl.com/api-create.php?url=${encodedUrl}`, {
                    method: 'GET',
                    headers: { 'Accept': 'text/plain' }
                  });
                  
                  if (tinyUrlResponse.ok) {
                    const shortUrl = await tinyUrlResponse.text();
                    if (shortUrl && !shortUrl.toLowerCase().includes('error') && shortUrl.startsWith('http')) {
                      photoUrl = shortUrl.trim();
                    }
                  }
                } catch (error) {
                  console.warn('[Receipt SMS] Failed to shorten photo URL, using original:', error);
                }
              }
              
              // Format payment method for receipt
              const formatPaymentMethod = (method: string | null): string => {
                if (!method) return 'Not specified';
                if (method === 'gocardless') return 'Direct Debit';
                if (method === 'cash') return 'Cash';
                if (method === 'transfer') return 'Bank Transfer';
                return method.charAt(0).toUpperCase() + method.slice(1);
              };
              
              // Prepare context matching exactly what receipt templates expect:
              // - customer_firstName (from customerName)
              // - customer_addressLine1 (extracted from fullAddress in prepareSMSContext)
              // - job_total (the actual amount collected for this job)
              // - payment_method (formatted payment method)
              // - photo_url (shortened photo URL if available)
              // - business_name (from businessName prop)
              const context = prepareSMSContext({
                customerName,
                customerAddress: fullAddress,
                price: jobAmount, // Also set price for backward compatibility
                jobTotal: jobAmount, // This becomes {{job_total}} in templates
                completedDate: completedDateFormatted,
                photoUrl: photoUrl, // This becomes {{photo_url}} in templates
                businessName, // This becomes {{business_name}} in templates
                paymentMethod: formatPaymentMethod(job.payment_method), // Payment method for receipt
              });
              
              const phone = job.customer.mobile_phone || '';
              if (phone) {
                showTemplatePicker('receipt_sms', context, (message) => {
                  // Mark as sent if callback provided
                  if (onReceiptSent) {
                    onReceiptSent(job.id);
                  }
                  openSMSApp(phone, message, user?.id);
                });
              }
            }}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              {receiptSent 
                ? 'Receipt Sent'
                : job.photo_url 
                  ? 'Send Service Receipt + Photo' 
                  : 'Send Service Receipt'}
            </span>
          </Button>
          </div>
        </div>
      )}

      {/* Notes section */}
      {job.notes && (
        <div 
          className="mt-4 p-3 bg-warning/10 dark:bg-warning/20 rounded-lg border border-warning/30 dark:border-warning/40 cursor-pointer"
          onClick={() => onAddNote?.(job)}
        >
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 text-warning dark:text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground font-medium">{job.notes}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(!job.notes || !isPaid) && (onAddNote || onMarkPaid) && (
        <div className="flex gap-2 mt-4">
          {!job.notes && onAddNote && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => onAddNote(job)}
              className="flex-1 touch-sm min-h-[44px] gap-2"
            >
              <StickyNote className="w-4 h-4 shrink-0" />
              <span className="text-sm">Add Note</span>
            </Button>
          )}
          {!isPaid && onMarkPaid && (
            <Button
              size="lg"
              variant="success"
              onClick={() => onMarkPaid(job)}
              disabled={isProcessing}
              className={cn(
                "touch-sm min-h-[44px] gap-2",
                !job.notes ? "flex-1" : "flex-1"
              )}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">{isProcessing ? 'Processing...' : 'Mark Paid'}</span>
            </Button>
          )}
        </div>
      )}
      </div>
    </motion.div>
  );
}
