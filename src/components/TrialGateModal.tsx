import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { Sparkles, Check, Clock, Shield, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

const TRIAL_BENEFITS = [
  { icon: Zap, text: 'Complete jobs & auto-reschedule', highlight: 'Save 30+ mins daily' },
  { icon: TrendingUp, text: 'Track payments & earnings', highlight: 'Never miss a payment' },
  { icon: Shield, text: 'Photo evidence protection', highlight: 'Dispute-proof records' },
];

const ACTION_CONTEXT = {
  complete: {
    headline: "You're about to complete a job!",
    subtext: "Subscribe to track earnings, auto-reschedule, and grow your business.",
    emoji: "✓",
  },
  skip: {
    headline: "Need to skip this job?",
    subtext: "Subscribe to auto-reschedule and keep your calendar organised.",
    emoji: "⏭️",
  },
  'add-customer': {
    headline: "Ready to add a customer?",
    subtext: "Subscribe to build your customer list and grow your round.",
    emoji: "👤",
  },
  'mark-paid': {
    headline: "Time to record a payment!",
    subtext: "Subscribe to track who owes you and never chase money again.",
    emoji: "💷",
  },
  edit: {
    headline: "Want to update this info?",
    subtext: "Subscribe to manage customer details and preferences.",
    emoji: "✏️",
  },
  default: {
    headline: "Unlock the full app",
    subtext: "Subscribe to access all features and streamline your business.",
    emoji: "🚀",
  },
};

const EXPIRED_CONTEXT = {
  headline: "Your trial has ended",
  subtext: "Subscribe now to continue using all premium features.",
  emoji: "⏰",
};

export function TrialGateModal() {
  const { isModalOpen, triggerAction, isTrialExpired, closePaywall } = useSoftPaywall();
  const { createCheckout } = useSubscription();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async (priceType: 'monthly' | 'annual') => {
    setIsLoading(true);
    try {
      const url = await createCheckout(priceType);
      if (url) {
        window.open(url, '_blank');
        closePaywall();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const context = isTrialExpired 
    ? EXPIRED_CONTEXT 
    : (ACTION_CONTEXT[triggerAction as keyof typeof ACTION_CONTEXT] || ACTION_CONTEXT.default);

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closePaywall()}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0 shadow-2xl">
        {/* Animated gradient header */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`relative p-8 text-primary-foreground overflow-hidden ${
            isTrialExpired 
              ? 'bg-gradient-to-br from-warning via-warning to-warning/70' 
              : 'bg-gradient-to-br from-primary via-primary to-primary/70'
          }`}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-xl" />
          </div>
          
          <DialogHeader className="relative z-10">
            {/* Context emoji or warning icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-4xl mb-4"
            >
              {isTrialExpired ? (
                <AlertCircle className="w-12 h-12" />
              ) : (
                context.emoji
              )}
            </motion.div>
            
            <DialogTitle className="text-2xl font-bold text-primary-foreground leading-tight">
              {context.headline}
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/85 mt-2 text-base">
              {context.subtext}
            </DialogDescription>
          </DialogHeader>

          {/* Trial badge - only show if not expired */}
          {!isTrialExpired && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-6 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
            >
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">14 days free trial</span>
            </motion.div>
          )}
        </motion.div>

        {/* Content */}
        <div className="p-6 space-y-6 bg-background">
          {/* Value props with highlights */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What you get
            </p>
            {TRIAL_BENEFITS.map((benefit, index) => (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.08 }}
                className="flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{benefit.text}</p>
                  <p className="text-xs text-success font-medium">{benefit.highlight}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-1 text-sm text-muted-foreground"
          >
            <Sparkles className="w-4 h-4 text-warning" />
            <span>Trusted by window cleaners across the UK</span>
          </motion.div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="space-y-2"
            >
              <Button
                onClick={() => handleSubscribe('monthly')}
                disabled={isLoading}
                className="w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                size="lg"
              >
                {isLoading ? 'Loading...' : 'Start Free Trial - £15/month'}
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
              <Button
                onClick={() => handleSubscribe('annual')}
                disabled={isLoading}
                variant="outline"
                className="w-full h-12 rounded-xl text-sm font-medium"
              >
                Or £150/year (save £30)
              </Button>
            </motion.div>
          </div>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="w-3.5 h-3.5 text-success" />
              <span>14-day free trial</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-border" />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="w-3.5 h-3.5 text-success" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}