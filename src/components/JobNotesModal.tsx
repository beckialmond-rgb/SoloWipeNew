import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';
import { jobNotesSchema, validateForm, sanitizeString } from '@/lib/validations';
import { FormField } from '@/components/ui/form-field';
import { useToast } from '@/hooks/use-toast';

interface JobNotesModalProps {
  job: JobWithCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (jobId: string, notes: string | null) => Promise<void>;
}

export function JobNotesModal({ job, isOpen, onClose, onSave }: JobNotesModalProps) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    if (job) {
      setNotes(job.notes || '');
      setError(undefined);
    }
  }, [job]);

  const handleSave = async () => {
    if (!job) return;

    // Validate with Zod
    const validation = validateForm(jobNotesSchema, {
      notes: sanitizeString(notes),
    });

    if (!validation.success) {
      setError(validation.errors.notes);
      return;
    }

    setError(undefined);
    setIsSaving(true);
    try {
      await onSave(job.id, validation.data.notes || null);
      onClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save notes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && job && (
      <motion.div
        key="job-notes-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto flex flex-col"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="px-6 pb-6 pt-2 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-foreground">Job Notes</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {job.customer.name} • {job.customer.address}
            </p>

            <FormField
              label="Notes"
              icon={<StickyNote className="w-4 h-4" />}
              error={error}
            >
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (error) setError(undefined);
                }}
                placeholder="Add notes about this visit... (e.g., couldn't access back windows, dog was loose)"
                rows={4}
                autoFocus
                className={cn(
                  "w-full px-4 py-3 rounded-xl resize-none",
                  "bg-muted border-2",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary",
                  "transition-colors",
                  error 
                    ? "border-destructive focus:ring-destructive" 
                    : "border-transparent"
                )}
              />
            </FormField>

            {/* Buttons - Sticky at bottom */}
            <div className="sticky bottom-0 bg-card pt-4 -mx-6 px-6 border-t border-border mt-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSaving}
                  className="flex-1 h-12 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "flex-1 h-12 rounded-xl",
                    "bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                >
                  {isSaving ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
