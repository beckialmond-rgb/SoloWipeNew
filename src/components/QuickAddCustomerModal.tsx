import { useState } from 'react';
import { User, MapPin, PoundSterling, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface QuickAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    address: string;
    mobile_phone: string;
    price: number;
    frequency_weeks: number;
    first_clean_date: string;
  }) => Promise<unknown>;
}

export function QuickAddCustomerModal({ isOpen, onClose, onSubmit }: QuickAddCustomerModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('20');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim(),
        mobile_phone: '',
        price: parseFloat(price) || 20,
        frequency_weeks: 4,
        first_clean_date: format(new Date(), 'yyyy-MM-dd'),
      });
      // Reset form
      setName('');
      setAddress('');
      setPrice('20');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <div>
              <DrawerTitle>Quick Add</DrawerTitle>
              <DrawerDescription>Job scheduled for today</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-8">
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                <User className="w-4 h-4" />
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                required
                autoFocus
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
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                <MapPin className="w-4 h-4" />
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                required
                className={cn(
                  "w-full h-14 px-4 rounded-xl",
                  "bg-muted border-0",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary"
                )}
              />
            </div>

            {/* Price */}
            <div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                <PoundSterling className="w-4 h-4" />
                Price
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
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Defaults: 4 week frequency • Add phone/notes later in Customers
          </p>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim() || !address.trim()}
            className={cn(
              "w-full mt-4 fat-button rounded-xl",
              "bg-accent hover:bg-accent/90 text-accent-foreground",
              "font-semibold text-base",
              "disabled:opacity-50"
            )}
          >
            {isSubmitting ? 'Adding...' : 'Add & Schedule Today'}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
