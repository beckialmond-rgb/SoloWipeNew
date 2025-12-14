import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CreditCard, Calendar, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Update this version when adding new features
const CURRENT_VERSION = '1.3.0';
const STORAGE_KEY = 'solowipe_seen_version';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <CreditCard className="w-5 h-5 text-success" />,
    title: "Direct Debit Payments",
    description: "Collect payments automatically with GoCardless integration.",
  },
  {
    icon: <Shield className="w-5 h-5 text-primary" />,
    title: "Enhanced Security",
    description: "Improved error handling and app stability.",
  },
  {
    icon: <Zap className="w-5 h-5 text-amber-500" />,
    title: "Faster Performance",
    description: "Optimized loading and smoother animations.",
  },
  {
    icon: <Calendar className="w-5 h-5 text-accent" />,
    title: "Better Scheduling",
    description: "Improved job management and calendar views.",
  },
];

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seenVersion = localStorage.getItem(STORAGE_KEY);
    if (seenVersion !== CURRENT_VERSION) {
      // Small delay to let the app load first
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/10 to-accent/10">
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-4"
              >
                <Sparkles className="w-7 h-7 text-primary" />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-foreground">What's New</h2>
              <p className="text-muted-foreground mt-1">Version {CURRENT_VERSION}</p>
            </div>

            {/* Features List */}
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex gap-4 items-start"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-border">
              <Button
                onClick={handleDismiss}
                className="w-full min-h-[48px]"
                size="lg"
              >
                Got it, thanks!
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
