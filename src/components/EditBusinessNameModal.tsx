import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { businessNameSchema, validateForm, sanitizeString } from '@/lib/validations';
import { FormField, getInputClassName } from '@/components/ui/form-field';
import { DEFAULT_BUSINESS_NAME } from '@/constants/app';

interface EditBusinessNameModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

export function EditBusinessNameModal({ isOpen, currentName, onClose, onSubmit }: EditBusinessNameModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setError(undefined);
    }
  }, [isOpen, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with Zod
    const validation = validateForm(businessNameSchema, {
      name: sanitizeString(name),
    });

    if (!validation.success) {
      setError(validation.errors.name);
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit(validation.data.name);
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
        className="fixed inset-0 z-[60] bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl safe-bottom max-h-[85vh] overflow-y-auto flex flex-col"
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

          <form onSubmit={handleSubmit} className="px-6 pb-8 pt-2 flex-1 overflow-y-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6">Edit Business Name</h2>

            <FormField
              label="Business Name"
              icon={<Building className="w-4 h-4" />}
              required
              error={error}
            >
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(undefined);
                }}
                placeholder={DEFAULT_BUSINESS_NAME}
                autoFocus
                className={getInputClassName(!!error)}
              />
            </FormField>

            {/* Submit Button - Sticky at bottom */}
            <div className="sticky bottom-0 z-10 bg-card pt-4 pb-6 -mx-6 px-6 border-t border-border mt-6">
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className={cn(
                  "w-full fat-button rounded-xl",
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                  "font-semibold text-base",
                  "disabled:opacity-50"
                )}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
