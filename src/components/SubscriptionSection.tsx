import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Loader2, ExternalLink } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SUBSCRIPTION_TIERS } from '@/constants/subscription';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function SubscriptionSection() {
  const { subscribed, tier, subscriptionEnd, loading, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'annual' | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleSubscribe = async (priceType: 'monthly' | 'annual') => {
    setCheckoutLoading(priceType);
    try {
      const url = await createCheckout(priceType);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const url = await openCustomerPortal();
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open portal",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Subscribed state
  if (subscribed) {
    const tierConfig = tier ? SUBSCRIPTION_TIERS[tier] : null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border-2 border-primary p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">SoloWipe Pro</h3>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                Active
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {tierConfig ? `${tierConfig.currency}${tierConfig.price}/${tierConfig.interval}` : 'Subscription active'}
            </p>
          </div>
        </div>

        {subscriptionEnd && (
          <p className="text-sm text-muted-foreground">
            Renews on {format(new Date(subscriptionEnd), 'd MMMM yyyy')}
          </p>
        )}

        <Button
          variant="outline"
          className="w-full min-h-[44px]"
          onClick={handleManageSubscription}
          disabled={portalLoading}
        >
          {portalLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          Manage Subscription
        </Button>
      </motion.div>
    );
  }

  // Not subscribed - show pricing cards
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Upgrade to Pro</h3>
            <p className="text-sm text-muted-foreground">Unlock all premium features</p>
          </div>
        </div>

        {/* Monthly Plan */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Monthly</p>
              <p className="text-2xl font-bold text-foreground">
                {SUBSCRIPTION_TIERS.monthly.currency}{SUBSCRIPTION_TIERS.monthly.price}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
            </div>
          </div>
          <Button
            className="w-full min-h-[44px]"
            onClick={() => handleSubscribe('monthly')}
            disabled={checkoutLoading !== null}
          >
            {checkoutLoading === 'monthly' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Subscribe Monthly
          </Button>
        </div>

        {/* Annual Plan */}
        <div className="bg-primary/5 rounded-lg p-4 space-y-3 border-2 border-primary relative">
          <div className="absolute -top-3 left-4">
            <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
              Save £{SUBSCRIPTION_TIERS.annual.savings}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="font-medium text-foreground">Annual</p>
              <p className="text-2xl font-bold text-foreground">
                {SUBSCRIPTION_TIERS.annual.currency}{SUBSCRIPTION_TIERS.annual.price}
                <span className="text-sm font-normal text-muted-foreground">/year</span>
              </p>
            </div>
          </div>
          <Button
            className="w-full min-h-[44px]"
            onClick={() => handleSubscribe('annual')}
            disabled={checkoutLoading !== null}
          >
            {checkoutLoading === 'annual' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Subscribe Annually
          </Button>
        </div>

        {/* Features List */}
        <div className="pt-2 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">What's included:</p>
          <ul className="space-y-1.5">
            {[
              'Unlimited customers & jobs',
              'Route optimization',
              'Photo evidence storage',
              'Business insights & reports',
              'Priority support',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
