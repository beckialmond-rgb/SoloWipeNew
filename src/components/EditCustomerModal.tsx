import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, MapPin, Phone, PoundSterling, Repeat, FileText, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Customer } from '@/types/database';
import { cn } from '@/lib/utils';
import { customerSchema, validateForm, sanitizeString, cleanPhoneNumber } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';
import { FormField, getInputClassName } from '@/components/ui/form-field';

interface EditCustomerModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: {
    name: string;
    address: string;
    mobile_phone: string | null;
    price: number;
    frequency_weeks: number;
    preferred_payment_method?: 'gocardless' | 'cash' | 'transfer' | null;
    notes: string | null;
  }) => Promise<void>;
}

export function EditCustomerModal({ customer, isOpen, onClose, onSubmit }: EditCustomerModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [price, setPrice] = useState('20');
  const [frequencyWeeks, setFrequencyWeeks] = useState('4');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'gocardless' | 'cash' | 'transfer' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setAddress(customer.address);
      setMobilePhone(customer.mobile_phone || '');
      setPrice(customer.price.toString());
      setFrequencyWeeks(customer.frequency_weeks.toString());
      setPreferredPaymentMethod(customer.preferred_payment_method || null);
      setNotes(customer.notes || '');
      setErrors({});
    }
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setErrors({});

    // Validate with Zod
    const validation = validateForm(customerSchema, {
      name: sanitizeString(name),
      address: sanitizeString(address),
      mobile_phone: sanitizeString(mobilePhone),
      price: parseFloat(price) || 0,
      frequency_weeks: parseInt(frequencyWeeks) || 4,
      notes: sanitizeString(notes),
    });

    if (!validation.success) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast({
        title: 'Validation Error',
        description: firstError,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(customer.id, {
        name: validation.data.name,
        address: validation.data.address,
        mobile_phone: cleanPhoneNumber(validation.data.mobile_phone),
        price: validation.data.price,
        frequency_weeks: validation.data.frequency_weeks,
        preferred_payment_method: preferredPaymentMethod,
        notes: validation.data.notes || null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && customer && (
        <motion.div
          key="edit-customer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-foreground/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 right-0 bg-card rounded-t-3xl flex flex-col overflow-hidden"
          style={{ 
            bottom: '80px',
            maxHeight: 'calc(90vh - 80px)'
          }}
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground">Edit Customer</h2>
            <button
              onClick={handleBackdropClick}
              disabled={isSubmitting}
              className="p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-target"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
              <div className="space-y-4">
              {/* Name */}
              <FormField 
                label="Name" 
                icon={<User className="w-4 h-4" />} 
                required 
                error={errors.name}
              >
                <input
                  id="edit-customer-name-input"
                  name="customer_name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="John Smith"
                  className={getInputClassName(!!errors.name)}
                />
              </FormField>

              {/* Address */}
              <FormField 
                label="Address" 
                icon={<MapPin className="w-4 h-4" />} 
                required 
                error={errors.address}
              >
                <input
                  id="edit-customer-address-input"
                  name="customer_address"
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (errors.address) setErrors(prev => ({ ...prev, address: undefined }));
                  }}
                  placeholder="123 Main Street"
                  className={getInputClassName(!!errors.address)}
                />
              </FormField>

              {/* Mobile Phone */}
              <FormField 
                label="Mobile Phone" 
                icon={<Phone className="w-4 h-4" />}
                error={errors.mobile_phone}
              >
                <input
                  id="edit-customer-phone-input"
                  name="customer_mobile_phone"
                  type="tel"
                  value={mobilePhone}
                  onChange={(e) => {
                    setMobilePhone(e.target.value);
                    if (errors.mobile_phone) setErrors(prev => ({ ...prev, mobile_phone: undefined }));
                  }}
                  placeholder="07123 456789"
                  className={getInputClassName(!!errors.mobile_phone)}
                />
              </FormField>

              {/* Price and Frequency Row */}
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  label="Price" 
                  icon={<PoundSterling className="w-4 h-4" />} 
                  required 
                  error={errors.price}
                >
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      if (errors.price) setErrors(prev => ({ ...prev, price: undefined }));
                    }}
                    min="0"
                    step="0.01"
                    className={getInputClassName(!!errors.price)}
                  />
                </FormField>

                <FormField 
                  label="Frequency" 
                  icon={<Repeat className="w-4 h-4" />}
                  error={errors.frequency_weeks}
                >
                  <select
                    value={frequencyWeeks}
                    onChange={(e) => setFrequencyWeeks(e.target.value)}
                    className={getInputClassName(!!errors.frequency_weeks)}
                  >
                    <option value="2">2 weeks</option>
                    <option value="4">4 weeks</option>
                    <option value="6">6 weeks</option>
                    <option value="8">8 weeks</option>
                  </select>
                </FormField>
              </div>

              {/* Preferred Payment Method */}
              <FormField 
                label="Preferred Payment Method" 
                icon={<CreditCard className="w-4 h-4" />}
              >
                <select
                  value={preferredPaymentMethod || ''}
                  onChange={(e) => setPreferredPaymentMethod(e.target.value === '' ? null : e.target.value as 'gocardless' | 'cash' | 'transfer')}
                  className={getInputClassName(false)}
                >
                  <option value="">Select preferred method (optional)</option>
                  <option value="gocardless">Direct Debit (Recommended)</option>
                  <option value="transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
                {preferredPaymentMethod === 'gocardless' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Note: Direct Debit requires setting up a mandate separately
                  </p>
                )}
              </FormField>

              {/* Notes */}
              <FormField 
                label="Notes" 
                icon={<FileText className="w-4 h-4" />}
                error={errors.notes}
              >
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    if (errors.notes) setErrors(prev => ({ ...prev, notes: undefined }));
                  }}
                  placeholder="Gate code, pet warnings, special instructions..."
                  rows={3}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl resize-none border-2 transition-colors",
                    "bg-muted",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary",
                    errors.notes ? "border-destructive focus:ring-destructive" : "border-transparent"
                  )}
                />
              </FormField>
            </div>
            </div>

            {/* Fixed Footer with Submit Button */}
            <div className="flex-shrink-0 bg-card pt-4 pb-24 border-t border-border px-6 safe-bottom">
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim() || !address.trim()}
                size="lg"
                className={cn(
                  "w-full rounded-lg touch-sm min-h-[44px] gap-2",
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                  "disabled:opacity-50"
                )}
              >
                <span className="text-sm font-medium">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </span>
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
