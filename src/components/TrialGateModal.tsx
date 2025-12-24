import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSoftPaywall } from '@/hooks/useSoftPaywall';
import { Sparkles, Check, Clock, Shield, Zap, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageCounters } from '@/hooks/useUsageCounters';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

const TRIAL_BENEFITS = [
  { icon: Zap, text: 'Unlimited jobs & customers', highlight: 'No limits, grow freely' },
  { icon: TrendingUp, text: 'SMS receipts included', highlight: 'Covers SMS & GoCardless costs' },
  { icon: Shield, text: 'Route optimization & insights', highlight: 'Work smarter, earn more' },
];

const ACTION_CONTEXT = {
  complete: {
    headline: "You've automated 10 cleans!",
    subtext: "Upgrade to keep your business sparkling. Unlimited jobs & SMS receipts.",
    emoji: "🎉",
  },
  skip: {
    headline: "You've automated 10 cleans!",
    subtext: "Upgrade to keep your business sparkling. Unlimited jobs & SMS receipts.",
    emoji: "🎉",
  },
  'add-customer': {
    headline: "You've automated 10 cleans!",
    subtext: "Upgrade to keep your business sparkling. Unlimited customers & features.",
    emoji: "🎉",
  },
  'mark-paid': {
    headline: "You've automated 10 cleans!",
    subtext: "Upgrade to keep your business sparkling. Track payments & earnings.",
    emoji: "🎉",
  },
  edit: {
    headline: "You've automated 10 cleans!",
    subtext: "Upgrade to keep your business sparkling. Manage all your customers.",
    emoji: "🎉",
  },
  default: {
    headline: "You've automated 10 cleans!",
    subtext: "Upgrade to keep your business sparkling. Unlimited jobs & SMS receipts.",
    emoji: "🎉",
  },
};

const EXPIRED_CONTEXT = {
  headline: "Your free trial has ended",
  subtext: "Subscribe now to continue using all premium features.",
  emoji: "⏰",
};

export function TrialGateModal() {
  const { isModalOpen, triggerAction, isTrialExpired, closePaywall } = useSoftPaywall();
  const { createCheckout } = useSubscription();
  const { data: usageCounters } = useUsageCounters();
  const [isLoading, setIsLoading] = useState(false);
  
  // Show jobs completed if available
  const jobsCompleted = usageCounters?.jobs_completed_count || 0;

  const handleSubscribe = async (priceType: 'monthly' | 'annual') => {
    // Prevent double-clicks
    if (isLoading) {
      console.warn('⚠️ Checkout already in progress, ignoring duplicate click');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log(`💰 Starting Stripe checkout flow for ${priceType} plan...`);
      const url = await createCheckout(priceType);
      if (url) {
        console.log(`➡️ Redirecting to Stripe checkout: ${url}`);
        // Close paywall before redirecting - subscription will be active when they return
        closePaywall();
        // Small delay to ensure modal closes before redirect
        setTimeout(() => {
          window.location.href = url;
        }, 100);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.';
      console.error('❌ STRIPE CHECKOUT ERROR: Failed to create checkout session', {
        priceType,
        error: errorMessage,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      
      toast({
        title: 'Payment Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const context = isTrialExpired 
    ? EXPIRED_CONTEXT 
    : (ACTION_CONTEXT[triggerAction as keyof typeof ACTION_CONTEXT] || ACTION_CONTEXT.default);

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closePaywall()}>
      <DialogContent className="sm:max-w-[420px] p-0 border-0 shadow-2xl max-h-[85vh] overflow-y-auto flex flex-col">
        {/* Animated gradient header */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`relative p-8 text-primary-foreground flex-shrink-0 ${
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
            <DialogDescription className="text-primary-foreground/90 mt-2 text-base font-medium">
              {context.subtext}
            </DialogDescription>
            {!isTrialExpired && (
              <p className="text-primary-foreground/75 text-sm mt-3">
                You've used all your free jobs. Subscribe now to continue with unlimited access.
              </p>
            )}
          </DialogHeader>

          {/* Usage badge - show jobs completed and progress */}
          {!isTrialExpired && jobsCompleted > 0 && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-6 space-y-2"
            >
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                <Check className="w-4 h-4" />
                <span className="text-sm font-semibold">{jobsCompleted} of 10 free jobs used</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (jobsCompleted / 10) * 100)}%` }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="h-full bg-white/80 rounded-full"
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Content */}
        <div className="p-6 space-y-6 bg-background flex-1">
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
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Start Free Trial — Then £15/month
                    <Sparkles className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSubscribe('annual')}
                disabled={isLoading}
                variant="outline"
                className="w-full h-12 rounded-xl text-sm font-medium"
              >
                {isLoading ? 'Processing...' : 'Or £150/year (save £30)'}
              </Button>
            </motion.div>
          </div>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="w-3.5 h-3.5 text-success" />
              <span>7-day free trial</span>
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