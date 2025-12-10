import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, MapPin, Phone, Calendar, Repeat } from 'lucide-react';
import { Customer } from '@/types/database';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CustomerDetailModalProps {
  customer: Customer | null;
  businessName: string;
  onClose: () => void;
}

export function CustomerDetailModal({ customer, businessName, onClose }: CustomerDetailModalProps) {
  if (!customer) return null;

  const sendSmsReminder = () => {
    const message = encodeURIComponent(
      `Hi ${customer.name.split(' ')[0]}, ${businessName} here. We are cleaning your windows tomorrow. Please leave the gate unlocked!`
    );
    const phone = customer.mobile_phone?.replace(/\s/g, '') || '';
    window.open(`sms:${phone}?body=${message}`, '_blank');
  };

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
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto safe-bottom"
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

          <div className="px-6 pb-8 pt-2">
            {/* Customer Name */}
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {customer.name}
            </h2>

            {/* Info Cards */}
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium text-foreground">{customer.address}</p>
                </div>
              </div>

              {customer.mobile_phone && (
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                  <Phone className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium text-foreground">{customer.mobile_phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
                <Repeat className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Frequency</p>
                  <p className="font-medium text-foreground">
                    Every {customer.frequency_weeks} weeks • £{customer.price}
                  </p>
                </div>
              </div>
            </div>

            {/* SMS Button */}
            {customer.mobile_phone && (
              <Button
                onClick={sendSmsReminder}
                className={cn(
                  "w-full fat-button rounded-xl",
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                  "font-semibold text-base"
                )}
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Send SMS Reminder
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
