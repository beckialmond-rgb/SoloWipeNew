import { useState } from 'react';
import { User, MapPin, Phone, PoundSterling, Calendar, Repeat, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { customerSchema, validateForm, sanitizeString } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';
import { FormField, getInputClassName } from '@/components/ui/form-field';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await onSubmit({
        name: validation.data.name,
        address: validation.data.address,
        mobile_phone: validation.data.mobile_phone || '',
        price: validation.data.price,
        frequency_weeks: validation.data.frequency_weeks,
        first_clean_date: firstCleanDate,
        notes: validation.data.notes || undefined,
      });
      // Reset form
      setName('');
      setAddress('');
      setMobilePhone('');
      setPrice('20');
      setFrequencyWeeks('4');
      setFirstCleanDate(format(new Date(), 'yyyy-MM-dd'));
      setNotes('');
      setErrors({});
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Add Customer</DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} autoComplete="off" className="px-6 pb-8 overflow-y-auto">
          <div className="space-y-4">
            {/* Name */}
            <FormField 
              label="Name" 
              icon={<User className="w-4 h-4" />} 
              required 
              error={errors.name}
            >
              <input
                id="add-cust-name"
                name="customer_name"
                autoComplete="off"
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
                id="add-cust-address"
                name="customer_address"
                autoComplete="off"
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
                id="add-cust-phone"
                name="customer_phone"
                autoComplete="off"
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
                  id="add-cust-price"
                  name="customer_price"
                  autoComplete="off"
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
                  id="add-cust-freq"
                  name="customer_frequency"
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

            {/* First Clean Date */}
            <FormField 
              label="First Clean Date" 
              icon={<Calendar className="w-4 h-4" />} 
              required
            >
              <input
                id="add-cust-date"
                name="customer_date"
                type="date"
                value={firstCleanDate}
                onChange={(e) => setFirstCleanDate(e.target.value)}
                className={getInputClassName(false)}
              />
            </FormField>

            {/* Notes */}
            <FormField 
              label="Notes" 
              icon={<FileText className="w-4 h-4" />}
              error={errors.notes}
            >
              <textarea
                id="add-cust-notes"
                name="customer_notes"
                autoComplete="off"
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
      </DrawerContent>
    </Drawer>
  );
}
