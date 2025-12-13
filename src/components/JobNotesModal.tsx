import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobWithCustomer } from '@/types/database';
import { cn } from '@/lib/utils';

interface JobNotesModalProps {
  job: JobWithCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (jobId: string, notes: string | null) => Promise<void>;
}

export function JobNotesModal({ job, isOpen, onClose, onSave }: JobNotesModalProps) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (job) {
      setNotes(job.notes || '');
    }
  }, [job]);

  const handleSave = async () => {
    if (!job) return;
    setIsSaving(true);
    try {
      await onSave(job.id, notes.trim() || null);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !job) return null;

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
          className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto"
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

          <div className="px-6 pb-24 pt-2">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-foreground">Job Notes</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {job.customer.name} • {job.customer.address}
            </p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this visit... (e.g., couldn't access back windows, dog was loose)"
              rows={4}
              autoFocus
              className={cn(
                "w-full px-4 py-3 rounded-xl resize-none",
                "bg-muted border-0",
                "text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
            />

            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={onClose}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}