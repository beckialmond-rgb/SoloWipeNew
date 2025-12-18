import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote, CreditCard, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';

interface BatchPaymentModalProps {
  isOpen: boolean;
  selectedJobs: JobWithCustomer[];
  onClose: () => void;
  onConfirm: (jobIds: string[], method: 'cash' | 'transfer') => Promise<void>;
}

export const BatchPaymentModal = ({ 
  isOpen, 
  selectedJobs, 
  onClose, 
  onConfirm 
}: BatchPaymentModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'transfer' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMethod(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const showModal = isOpen && selectedJobs.length > 0;

  const totalAmount = selectedJobs.reduce(
    (sum, job) => sum + (job.amount_collected || job.customer.price), 
    0
  );

  const handleConfirm = async () => {
    if (!selectedMethod || isProcessing) return;
    
    setIsProcessing(true);
    try {
      await onConfirm(selectedJobs.map(j => j.id), selectedMethod);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  return (
    <AnimatePresence>
      {showModal && (
      <motion.div
        key="batch-payment-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card w-full max-w-lg rounded-t-3xl p-6 pb-24 max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Mark {selectedJobs.length} Jobs Paid</h2>
            <button 
              onClick={handleClose} 
              disabled={isProcessing}
              className="p-2 hover:bg-muted rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Selected jobs summary */}
          <div className="bg-muted rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="text-2xl font-bold text-foreground">£{totalAmount.toFixed(2)}</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedJobs.map(job => (
                <div key={job.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate flex-1">{job.customer.name}</span>
                  <span className="text-foreground font-medium">
                    £{(job.amount_collected || job.customer.price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment method selection */}
          <p className="text-sm text-muted-foreground mb-3">Payment Method</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button
              variant={selectedMethod === 'cash' ? 'default' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={() => setSelectedMethod('cash')}
              disabled={isProcessing}
            >
              <Banknote className="w-6 h-6" />
              <span>Cash</span>
            </Button>
            <Button
              variant={selectedMethod === 'transfer' ? 'default' : 'outline'}
              className="h-16 flex-col gap-1"
              onClick={() => setSelectedMethod('transfer')}
              disabled={isProcessing}
            >
              <CreditCard className="w-6 h-6" />
              <span>Transfer</span>
            </Button>
          </div>

          {/* Confirm button */}
          <Button
            className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={!selectedMethod || isProcessing}
          >
            {isProcessing ? (
              'Processing...'
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirm Payment
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
