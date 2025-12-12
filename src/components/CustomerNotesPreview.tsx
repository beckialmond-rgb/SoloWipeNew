import { StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface CustomerNotesPreviewProps {
  notes: string | null;
  customerName: string;
}

export function CustomerNotesPreview({ notes, customerName }: CustomerNotesPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!notes) return null;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="p-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
        aria-label="View customer notes"
      >
        <StickyNote className="w-4 h-4 text-amber-500" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-5 max-w-sm w-full shadow-xl border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <StickyNote className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-foreground">{customerName}</h3>
              </div>
              
              <div className="bg-amber-500/10 rounded-xl p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-full mt-4 py-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
