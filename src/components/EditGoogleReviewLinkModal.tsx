import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { googleReviewLinkSchema, validateForm } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setLink(currentLink || '');
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
        const firstError = Object.values(validation.errors)[0];
        toast({
          title: 'Validation Error',
          description: firstError,
          variant: 'destructive',
        });
        return;
      }
    }

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
        className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[70vh] overflow-y-auto safe-bottom"
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
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Google Review Link</h2>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Add your Google Business review link to enable "Ask for Review" buttons after completing jobs.
            </p>

            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">
                Review Link URL
              </label>
              <Input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://g.page/r/YOUR_BUSINESS_ID/review"
                className={cn(
                  "h-14 px-4",
                  "bg-muted border-0",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-primary"
                )}
              />
              <p className="text-xs text-muted-foreground">
                Find this in your Google Business Profile → Share → Ask for reviews
              </p>
            </div>

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