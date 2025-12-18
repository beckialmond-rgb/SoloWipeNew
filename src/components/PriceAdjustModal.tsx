import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JobWithCustomer } from '@/types/database';

interface PriceAdjustModalProps {
  isOpen: boolean;
  job: JobWithCustomer | null;
  onClose: () => void;
  onConfirm: (amount: number, photoUrl?: string) => void;
  onCapturePhoto?: () => void;
  capturedPhotoUrl?: string | null;
}

export const PriceAdjustModal = ({ 
  isOpen, 
  job, 
  onClose, 
  onConfirm, 
  onCapturePhoto,
  capturedPhotoUrl 
}: PriceAdjustModalProps) => {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (job && isOpen) {
      setAmount(job.customer.price);
    }
  }, [job, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount(0);
    }
  }, [isOpen]);

  const quickAdjust = (adjustment: number) => {
    setAmount(prev => Math.max(0, prev + adjustment));
  };

  const handleConfirm = () => {
    onConfirm(amount, capturedPhotoUrl || undefined);
  };

  return (
    <AnimatePresence>
      {isOpen && job && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        onClick={onClose}
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
            <h2 className="text-xl font-bold text-foreground">Complete Job</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">Customer</p>
            <p className="font-semibold text-foreground">{job.customer.name}</p>
            <p className="text-sm text-muted-foreground">{job.customer.address}</p>
          </div>

          {/* Amount adjustment */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-3">Amount to collect</p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-xl"
                onClick={() => quickAdjust(-5)}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">£</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="h-14 text-center text-2xl font-bold pl-8"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-xl"
                onClick={() => quickAdjust(5)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick add buttons */}
          <div className="flex gap-2 mb-6">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => quickAdjust(5)}
            >
              +£5
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => quickAdjust(10)}
            >
              +£10
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => quickAdjust(20)}
            >
              +£20
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
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={onCapturePhoto}
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Retake
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-14 gap-2"
                  onClick={onCapturePhoto}
                >
                  <Camera className="w-5 h-5" />
                  Add Photo Evidence
                </Button>
              )}
            </div>
          )}

          {/* Confirm button */}
          <Button
            className="w-full h-14 text-lg font-semibold bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
          >
            Mark Complete · £{amount.toFixed(2)}
          </Button>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
