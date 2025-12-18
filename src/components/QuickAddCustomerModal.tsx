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
import { quickAddCustomerSchema, validateForm, sanitizeString } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';
import { FormField, getInputClassName } from '@/components/ui/form-field';

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with Zod
    const validation = validateForm(quickAddCustomerSchema, {
      name: sanitizeString(name),
      address: sanitizeString(address),
      price: parseFloat(price) || 0,
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
        mobile_phone: '',
        price: validation.data.price,
        frequency_weeks: 4,
        first_clean_date: format(new Date(), 'yyyy-MM-dd'),
      });
      // Reset form
      setName('');
      setAddress('');
      setPrice('20');
      setErrors({});
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add customer. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="text-left flex-shrink-0">
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

        <form onSubmit={handleSubmit} autoComplete="off" className="px-6 pb-10 overflow-y-auto flex-1">
          <div className="space-y-3">
            {/* Name */}
            <FormField 
              label="Name" 
              icon={<User className="w-4 h-4" />} 
              required 
              error={errors.name}
            >
              <input
                id="quick-add-name"
                name="customer_name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="Customer name"
                autoFocus
                autoComplete="off"
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
                id="quick-add-address"
                name="customer_address"
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (errors.address) setErrors(prev => ({ ...prev, address: undefined }));
                }}
                placeholder="Full address"
                autoComplete="off"
                className={getInputClassName(!!errors.address)}
              />
            </FormField>

            {/* Price */}
            <FormField 
              label="Price" 
              icon={<PoundSterling className="w-4 h-4" />} 
              required 
              error={errors.price}
            >
              <input
                id="quick-add-price"
                name="customer_price"
                type="number"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (errors.price) setErrors(prev => ({ ...prev, price: undefined }));
                }}
                min="0"
                step="0.01"
                autoComplete="off"
                className={getInputClassName(!!errors.price)}
              />
            </FormField>
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
