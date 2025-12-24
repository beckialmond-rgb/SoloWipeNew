import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JobWithCustomer } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, parseCurrency, validateCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PriceAdjustModalProps {
  isOpen: boolean;
  job: JobWithCustomer | null;
  onClose: () => void;
  onConfirm: (amount: number, photoUrl?: string) => Promise<void> | void;
  onCapturePhoto?: () => void;
  capturedPhotoUrl?: string | null;
}

const MIN_AMOUNT = 0;
const MAX_AMOUNT = 10000;

export const PriceAdjustModal = ({ 
  isOpen, 
  job, 
  onClose, 
  onConfirm, 
  onCapturePhoto,
  capturedPhotoUrl 
}: PriceAdjustModalProps) => {
  const [amount, setAmount] = useState(0);
  const [displayValue, setDisplayValue] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAdjustment, setLastAdjustment] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (job && isOpen) {
      const initialAmount = job.customer.price || 0;
      setAmount(initialAmount);
      setDisplayValue(formatCurrency(initialAmount, false));
      setAmountError(null);
      // Focus input when modal opens for better accessibility
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [job, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount(0);
      setDisplayValue('');
      setAmountError(null);
      setIsSubmitting(false);
      setLastAdjustment(null);
    }
  }, [isOpen]);

  const updateAmount = (newAmount: number) => {
    const parsed = parseCurrency(newAmount, MIN_AMOUNT, MAX_AMOUNT);
    if (parsed === null) {
      setAmountError('Please enter a valid amount');
      return;
    }
    
    const validation = validateCurrency(parsed, MIN_AMOUNT, MAX_AMOUNT);
    if (!validation.isValid) {
      setAmountError(validation.error || 'Invalid amount');
      setAmount(parsed); // Still set the clamped value
      setDisplayValue(formatCurrency(parsed, false));
      return;
    }
    
    setAmount(parsed);
    setDisplayValue(formatCurrency(parsed, false));
    setAmountError(null);
  };

  const quickAdjust = (adjustment: number) => {
    const newAmount = amount + adjustment;
    setLastAdjustment(adjustment);
    updateAmount(newAmount);
    // Clear adjustment indicator after animation
    setTimeout(() => setLastAdjustment(null), 300);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty string temporarily while typing
    if (value === '') {
      setDisplayValue('');
      setAmountError(null);
      return;
    }
    
    // Remove currency symbols and spaces
    const cleaned = value.replace(/[£,\s]/g, '');
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed)) {
      setAmountError('Please enter a valid number');
      return;
    }
    
    updateAmount(parsed);
  };

  const handleInputBlur = () => {
    // Ensure display value matches the actual amount
    setDisplayValue(formatCurrency(amount, false));
    setAmountError(null);
  };

  const handleConfirm = async () => {
    // Validate amount before submission
    const validation = validateCurrency(amount, MIN_AMOUNT, MAX_AMOUNT);
    if (!validation.isValid) {
      setAmountError(validation.error || 'Invalid amount');
      toast({
        title: 'Invalid Amount',
        description: validation.error || 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(amount, capturedPhotoUrl || undefined);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete job. Please try again.',
        variant: 'destructive',
      });
      // Don't close modal on error so user can retry
      setIsSubmitting(false);
      return;
    }
    // Note: Modal closing is handled by parent component on success
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting && amountError === null) {
      handleConfirm();
    } else if (e.key === 'Escape' && !isSubmitting) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && job && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[60] flex items-end justify-center"
        onClick={isSubmitting ? undefined : onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute left-0 right-0 bg-card w-full max-w-lg mx-auto rounded-t-3xl flex flex-col overflow-hidden"
          style={{ 
            bottom: '80px',
            maxHeight: 'calc(90vh - 80px)'
          }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-job-title"
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0 border-b border-border">
            <h2 id="complete-job-title" className="text-xl font-bold text-foreground">Complete Job</h2>
            <button 
              onClick={onClose} 
              disabled={isSubmitting}
              className="p-2 hover:bg-muted rounded-full disabled:opacity-50 disabled:cursor-not-allowed touch-target"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-1">Customer</p>
              <p className="font-semibold text-foreground">{job.customer.name}</p>
              <p className="text-sm text-muted-foreground">{job.customer.address}</p>
            </div>

          {/* Amount adjustment */}
          <div className="mb-6">
            <label htmlFor="amount-input" className="text-sm font-medium text-foreground mb-3 block">
              Amount to collect
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-xl shrink-0 touch-target"
                onClick={() => quickAdjust(-5)}
                disabled={isSubmitting || amount <= MIN_AMOUNT}
                aria-label="Decrease amount by £5"
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="flex-1 relative">
                <span 
                  className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold pointer-events-none transition-colors",
                    amountError ? "text-destructive" : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  £
                </span>
                <Input
                  id="amount-input"
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={displayValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "h-14 text-center text-2xl font-bold pl-8 pr-4",
                    amountError && "border-destructive focus:ring-destructive",
                    lastAdjustment !== null && "transition-transform duration-300",
                    lastAdjustment && lastAdjustment > 0 && "scale-105",
                    lastAdjustment && lastAdjustment < 0 && "scale-95"
                  )}
                  disabled={isSubmitting}
                  aria-label="Amount to collect"
                  aria-invalid={amountError !== null}
                  aria-describedby={amountError ? "amount-error" : undefined}
                  autoComplete="off"
                />
                {amountError && (
                  <div 
                    id="amount-error"
                    className="absolute -bottom-5 left-0 right-0 flex items-center gap-1 text-xs text-destructive mt-1"
                    role="alert"
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>{amountError}</span>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-xl shrink-0 touch-target"
                onClick={() => quickAdjust(5)}
                disabled={isSubmitting || amount >= MAX_AMOUNT}
                aria-label="Increase amount by £5"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            {!amountError && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {formatCurrency(amount)}
              </p>
            )}
          </div>

          {/* Quick adjust buttons */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <Button
              variant="outline"
              size="lg"
              className="touch-sm min-h-[44px]"
              onClick={() => quickAdjust(-5)}
              disabled={isSubmitting || amount <= MIN_AMOUNT}
              aria-label="Subtract £5"
            >
              <span className="text-sm font-medium">-£5</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="touch-sm min-h-[44px]"
              onClick={() => quickAdjust(5)}
              disabled={isSubmitting || amount >= MAX_AMOUNT}
              aria-label="Add £5"
            >
              <span className="text-sm font-medium">+£5</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="touch-sm min-h-[44px]"
              onClick={() => quickAdjust(10)}
              disabled={isSubmitting || amount >= MAX_AMOUNT}
              aria-label="Add £10"
            >
              <span className="text-sm font-medium">+£10</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="touch-sm min-h-[44px]"
              onClick={() => quickAdjust(20)}
              disabled={isSubmitting || amount >= MAX_AMOUNT}
              aria-label="Add £20"
            >
              <span className="text-sm font-medium">+£20</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="touch-sm min-h-[44px]"
              onClick={() => updateAmount(job?.customer.price || 0)}
              disabled={isSubmitting}
              aria-label="Reset to original price"
            >
              <span className="text-sm font-medium">Reset</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="touch-sm min-h-[44px]"
              onClick={() => updateAmount(0)}
              disabled={isSubmitting || amount === 0}
              aria-label="Set amount to zero"
            >
              <span className="text-sm font-medium">Clear</span>
            </Button>
          </div>

          {/* Photo capture section */}
          {onCapturePhoto && (
            <div className="mb-6">
              {capturedPhotoUrl ? (
                <div className="relative">
                  <img 
                    src={capturedPhotoUrl} 
                    alt="Job photo" 
                    className="w-full h-32 object-cover rounded-xl"
                  />
                <Button
                  variant="secondary"
                  size="lg"
                  className="absolute bottom-2 right-2 touch-sm min-h-[44px] gap-2"
                  onClick={onCapturePhoto}
                  disabled={isSubmitting}
                  aria-label="Retake photo"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span className="text-sm">Retake</span>
                </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full touch-sm min-h-[44px] gap-2"
                  onClick={onCapturePhoto}
                  disabled={isSubmitting}
                  aria-label="Add photo evidence"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">Add Photo Evidence</span>
                </Button>
              )}
            </div>
          )}

          {/* Spacer to ensure footer button is accessible */}
          <div className="pb-4" />

          </div>

          {/* Fixed Footer with Confirm Button */}
          <div className="p-6 pt-4 pb-6 border-t border-border flex-shrink-0 bg-card">
            <Button
              size="lg"
              variant="success"
              className="w-full touch-sm min-h-[44px] gap-2"
              onClick={handleConfirm}
              disabled={isSubmitting || amountError !== null || amount < MIN_AMOUNT}
              aria-label={`Complete job and collect ${formatCurrency(amount)}`}
            >
              <span className="text-sm font-medium">
                {isSubmitting ? (
                  'Processing...'
                ) : (
                  <>
                    Mark Complete · {formatCurrency(amount)}
                  </>
                )}
              </span>
            </Button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
