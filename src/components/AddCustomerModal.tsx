import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, MapPin, Phone, PoundSterling, Calendar, Repeat, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    address: string;
    mobile_phone: string;
    price: number;
    frequency_weeks: number;
    first_clean_date: string;
    notes?: string;
  }) => Promise<unknown>;
}

export function AddCustomerModal({ isOpen, onClose, onSubmit }: AddCustomerModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [price, setPrice] = useState('20');
  const [frequencyWeeks, setFrequencyWeeks] = useState('4');
  const [firstCleanDate, setFirstCleanDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim(),
        mobile_phone: mobilePhone.trim(),
        price: parseFloat(price) || 20,
        frequency_weeks: parseInt(frequencyWeeks) || 4,
        first_clean_date: firstCleanDate,
        notes: notes.trim() || undefined,
      });
      // Reset form
      setName('');
      setAddress('');
      setMobilePhone('');
      setPrice('20');
      setFrequencyWeeks('4');
      setFirstCleanDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto safe-bottom"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <form onSubmit={handleSubmit} className="px-6 pb-8 pt-2">
            <h2 className="text-2xl font-bold text-foreground mb-6">Add Customer</h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="w-4 h-4" />
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                  className={cn(
                    "w-full h-14 px-4 rounded-xl",
                    "bg-muted border-0",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4" />
                  Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                  required
                  className={cn(
                    "w-full h-14 px-4 rounded-xl",
                    "bg-muted border-0",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Phone className="w-4 h-4" />
                  Mobile Phone
                </label>
                <input
                  type="tel"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                  placeholder="07123 456789"
                  className={cn(
                    "w-full h-14 px-4 rounded-xl",
                    "bg-muted border-0",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
              </div>

              {/* Price and Frequency Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <PoundSterling className="w-4 h-4" />
                    Price *
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                    className={cn(
                      "w-full h-14 px-4 rounded-xl",
                      "bg-muted border-0",
                      "text-foreground placeholder:text-muted-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-primary"
                    )}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Repeat className="w-4 h-4" />
                    Frequency
                  </label>
                  <select
                    value={frequencyWeeks}
                    onChange={(e) => setFrequencyWeeks(e.target.value)}
                    className={cn(
                      "w-full h-14 px-4 rounded-xl",
                      "bg-muted border-0",
                      "text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-primary"
                    )}
                  >
                    <option value="2">2 weeks</option>
                    <option value="4">4 weeks</option>
                    <option value="6">6 weeks</option>
                    <option value="8">8 weeks</option>
                  </select>
                </div>
              </div>

              {/* First Clean Date */}
              <div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  First Clean Date *
                </label>
                <input
                  type="date"
                  value={firstCleanDate}
                  onChange={(e) => setFirstCleanDate(e.target.value)}
                  required
                  className={cn(
                    "w-full h-14 px-4 rounded-xl",
                    "bg-muted border-0",
                    "text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Gate code, pet warnings, special instructions..."
                  rows={3}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl resize-none",
                    "bg-muted border-0",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !address.trim()}
              className={cn(
                "w-full mt-6 fat-button rounded-xl",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "font-semibold text-base",
                "disabled:opacity-50"
              )}
            >
              {isSubmitting ? 'Adding...' : 'Add Customer'}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
