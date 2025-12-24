import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExitIntentPopupProps {
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const ExitIntentPopup = ({ onClose, onSuccess }: ExitIntentPopupProps) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    // Track conversion
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'lead_capture', {
        event_category: 'Exit Intent',
        event_label: 'Email Capture',
        value: 1
      });
    }

    // Simulate API call - replace with actual API endpoint
    try {
      // TODO: Replace with actual API call to save lead
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSuccess(email);
      onClose();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-8 border-2 border-primary/20"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/20 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Before You Go
            </h2>
            <p className="text-muted-foreground">
              Get tips to grow your window cleaning business
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="exit-name" className="text-sm font-medium">
                Your Name
              </Label>
              <Input
                id="exit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="exit-email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="exit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="mt-1"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white shadow-lg"
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  Subscribe
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              We'll also send you weekly tips to grow your business. Unsubscribe anytime.
            </p>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Hook to detect exit intent
export const useExitIntent = (callback: () => void) => {
  useEffect(() => {
    let hasTriggered = false;
    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse is moving towards top of screen (exiting)
      if (!hasTriggered && e.clientY <= 0) {
        hasTriggered = true;
        callback();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [callback]);
};

