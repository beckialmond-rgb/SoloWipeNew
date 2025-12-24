import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { googleReviewLinkSchema, validateForm } from '@/lib/validations';
import { FormField, getInputClassName } from '@/components/ui/form-field';

interface EditGoogleReviewLinkModalProps {
  isOpen: boolean;
  currentLink: string | null;
  onClose: () => void;
  onSubmit: (link: string | null) => Promise<void>;
}

export function EditGoogleReviewLinkModal({
  isOpen,
  currentLink,
  onClose,
  onSubmit,
}: EditGoogleReviewLinkModalProps) {
  const [link, setLink] = useState(currentLink || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      setLink(currentLink || '');
      setError(undefined);
    }
  }, [isOpen, currentLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only validate if a link is provided
    const trimmedLink = link.trim();
    if (trimmedLink) {
      const validation = validateForm(googleReviewLinkSchema, {
        link: trimmedLink,
      });

      if (!validation.success) {
        setError(validation.errors.link);
        return;
      }
    }

    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit(trimmedLink || null);
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
          className="absolute left-0 right-0 bg-card rounded-t-3xl overflow-y-auto safe-bottom"
          style={{ 
            bottom: '80px',
            maxHeight: '70vh'
          }}
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

          <form onSubmit={handleSubmit} className="px-6 pb-32 pt-2">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Google Review Link</h2>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Add your Google Business review link to enable "Ask for Review" buttons after completing jobs.
            </p>

            <FormField
              label="Review Link URL"
              icon={<LinkIcon className="w-4 h-4" />}
              error={error}
              className="mb-2"
            >
              <input
                type="url"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  if (error) setError(undefined);
                }}
                placeholder="https://g.page/r/YOUR_BUSINESS_ID/review"
                className={getInputClassName(!!error)}
              />
            </FormField>
            <p className="text-xs text-muted-foreground mb-6">
              Find this in your Google Business Profile → Share → Ask for reviews
            </p>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "flex-1 h-12 rounded-xl",
                  "bg-primary hover:bg-primary/90 text-primary-foreground"
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
