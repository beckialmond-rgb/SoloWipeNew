import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Eye, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export function DemoModeBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show when user is not authenticated
  if (user || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "sticky top-0 z-50",
          "bg-gradient-to-r from-primary/90 to-primary",
          "px-4 py-2.5",
          "flex items-center justify-between gap-2"
        )}
      >
        <div className="flex items-center gap-2 text-primary-foreground">
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            Browsing Demo Mode
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/auth?mode=signup')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "bg-primary-foreground/20 hover:bg-primary-foreground/30",
              "text-primary-foreground text-xs font-semibold",
              "transition-colors"
            )}
          >
            <Sparkles className="w-3 h-3" />
            Sign Up Free
          </button>
          
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-full hover:bg-primary-foreground/10 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4 text-primary-foreground/80" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
