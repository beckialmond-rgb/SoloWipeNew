import { useState, useEffect } from 'react';
import { Banknote, CreditCard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MarkPaidModalProps {
  isOpen: boolean;
  job: JobWithCustomer | null;
  onClose: () => void;
  onConfirm: (method: 'cash' | 'transfer') => Promise<void>;
}

export function MarkPaidModal({ isOpen, job, onClose, onConfirm }: MarkPaidModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'transfer' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Reset state when modal opens or closes, and pre-select preferred payment method
  useEffect(() => {
    if (!isOpen) {
      setSelectedMethod(null);
      setIsSubmitting(false);
    } else if (job?.customer?.preferred_payment_method) {
      // Pre-select preferred payment method (only if cash or transfer - modal only shows these)
      const preferred = job.customer.preferred_payment_method;
      if (preferred === 'cash' || preferred === 'transfer') {
        setSelectedMethod(preferred);
      }
    }
  }, [isOpen, job?.customer?.preferred_payment_method]);

  const handleConfirm = async () => {
    if (!selectedMethod || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedMethod);
      setSelectedMethod(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to mark job as paid. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing while submitting
    onClose();
  };

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Mark as Paid</DialogTitle>
          <DialogDescription>
            How did {job.customer?.name || 'the customer'} pay for this job?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-foreground">
              £{(job.amount_collected || 0).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {job.customer?.address || 'No address'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedMethod('cash')}
              disabled={isSubmitting}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                "hover:border-primary hover:bg-primary/5",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                selectedMethod === 'cash'
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-green-600" />
              </div>
              <span className="font-medium text-foreground">Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMethod('transfer')}
              disabled={isSubmitting}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all",
                "hover:border-primary hover:bg-primary/5",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                selectedMethod === 'transfer'
                  ? "border-primary bg-primary/10"
                  : "border-border"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <span className="font-medium text-foreground">Transfer</span>
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12 bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={!selectedMethod || isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
