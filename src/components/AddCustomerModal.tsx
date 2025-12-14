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

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Add Customer</DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} autoComplete="off" className="px-6 pb-8 overflow-y-auto">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="add-cust-name" className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <User className="w-4 h-4" />
                Name *
              </label>
              <input
                id="add-cust-name"
                name="customer_name"
                autoComplete="off"
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
              <label htmlFor="add-cust-address" className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin className="w-4 h-4" />
                Address *
              </label>
              <input
                id="add-cust-address"
                name="customer_address"
                autoComplete="off"
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
              <label htmlFor="add-cust-phone" className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Phone className="w-4 h-4" />
                Mobile Phone
              </label>
              <input
                id="add-cust-phone"
                name="customer_phone"
                autoComplete="off"
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
                <label htmlFor="add-cust-price" className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <PoundSterling className="w-4 h-4" />
                  Price *
                </label>
                <input
                  id="add-cust-price"
                  name="customer_price"
                  autoComplete="off"
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
                <label htmlFor="add-cust-freq" className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Repeat className="w-4 h-4" />
                  Frequency
                </label>
                <select
                  id="add-cust-freq"
                  name="customer_frequency"
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
              <label htmlFor="add-cust-date" className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                First Clean Date *
              </label>
              <input
                id="add-cust-date"
                name="customer_date"
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
              <label htmlFor="add-cust-notes" className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileText className="w-4 h-4" />
                Notes
              </label>
              <textarea
                id="add-cust-notes"
                name="customer_notes"
                autoComplete="off"
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
      </DrawerContent>
    </Drawer>
  );
}
