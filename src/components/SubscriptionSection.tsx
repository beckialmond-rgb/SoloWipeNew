import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Loader2, ExternalLink, Sparkles, Clock, Zap, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageCounters } from '@/hooks/useUsageCounters';
import { useHelperBilling } from '@/hooks/useHelperBilling';
import { useBillingHistory } from '@/hooks/useBillingHistory';
import { useRole } from '@/hooks/useRole';
import { SUBSCRIPTION_TIERS } from '@/constants/subscription';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';

export function SubscriptionSection() {
  const { subscribed, tier, subscriptionEnd, status, trialEnd, loading, createCheckout, openCustomerPortal, checkSubscription } = useSubscription();
  const { data: usageCounters } = useUsageCounters();
  const { activeHelpers } = useHelperBilling();
  const { currentMonthTotal } = useBillingHistory();
  const { isOwner } = useRole();
  const { toast } = useToast();
  const [checkoutLoading, setCheckoutLoading] = useState<'monthly' | 'annual' | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);

  const isTrialing = status === 'trialing';
  const trialDaysRemaining = trialEnd ? differenceInDays(new Date(trialEnd), new Date()) : 0;
  
  // Check if user has free usage remaining (usage-based trial)
  const jobsCompleted = usageCounters?.jobs_completed_count || 0;
  const jobsRemaining = usageCounters?.jobsRemaining || 0;
  const smsRemaining = usageCounters?.smsRemaining || 0;
  const hasFreeUsage = jobsRemaining > 0 || smsRemaining > 0;
  
  // Grace period is for payment failures, not trial (handled separately)

  const handleSubscribe = async (priceType: 'monthly' | 'annual', couponCode?: string | null) => {
    // Prevent double-clicks
    if (checkoutLoading !== null) {
      console.warn('⚠️ Checkout already in progress, ignoring duplicate click');
      return;
    }
    
    setCheckoutLoading(priceType);
    try {
      // Clean coupon code: trim whitespace and convert to uppercase
      const cleanCouponCode = couponCode?.trim().toUpperCase() || null;
      const finalCouponCode = cleanCouponCode && cleanCouponCode.length > 0 ? cleanCouponCode : null;
      
      console.log(`💰 Starting Stripe checkout flow for ${priceType} plan...`, { 
        originalCoupon: couponCode,
        cleanedCoupon: finalCouponCode 
      });
      const url = await createCheckout(priceType, finalCouponCode);
      if (url) {
        console.log(`➡️ Redirecting to Stripe checkout: ${url}`);
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout";
      console.error('❌ STRIPE CHECKOUT ERROR: Failed to create checkout session', {
        priceType,
        error: errorMessage,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      
      toast({
        title: "Payment Error",
        description: errorMessage,
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
        window.location.href = url;
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
      <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Subscribed state (active or trialing)
  if (subscribed) {
    const tierConfig = tier ? SUBSCRIPTION_TIERS[tier] : null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-card rounded-xl p-4 space-y-4",
          isTrialing ? "border-2 border-amber-500" : "border-2 border-primary"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            isTrialing ? "bg-amber-500/10" : "bg-primary/10"
          )}>
            {isTrialing ? (
              <Sparkles className="w-5 h-5 text-amber-500" />
            ) : (
              <Crown className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">SoloWipe Pro</h3>
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                isTrialing 
                  ? "bg-amber-500/10 text-amber-600" 
                  : "bg-primary/10 text-primary"
              )}>
                {isTrialing ? 'Free Trial' : 'Active'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {isTrialing 
                ? `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining`
                : tierConfig 
                  ? `${tierConfig.currency}${tierConfig.price}/${tierConfig.interval}` 
                  : 'Subscription active'
              }
            </p>
          </div>
        </div>

        {isTrialing && trialEnd && (
          <div className="bg-amber-500/10 rounded-lg p-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Your free trial ends on {format(new Date(trialEnd), 'd MMMM yyyy')}. 
              You won't be charged until then.
            </p>
          </div>
        )}

        {!isTrialing && subscriptionEnd && (
          <p className="text-sm text-muted-foreground">
            Renews on {format(new Date(subscriptionEnd), 'd MMMM yyyy')}
          </p>
        )}

        {/* Helper Billing Breakdown - Only show for owners */}
        {isOwner && activeHelpers.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Monthly Billing Breakdown
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base subscription:</span>
              <span className="font-medium text-foreground">£25/month</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Helpers:</span>
              <span className="font-medium text-foreground">
                {activeHelpers.length} × £5/month
              </span>
            </div>
            {currentMonthTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current month (pro-rated):</span>
                <span className="font-medium text-foreground">
                  £{currentMonthTotal.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm pt-1.5 border-t border-border">
              <span className="font-semibold text-foreground">Total (projected):</span>
              <span className="font-bold text-foreground">
                £{25 + activeHelpers.length * 5}/month
              </span>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full min-h-[44px]"
          onClick={handleManageSubscription}
          disabled={portalLoading}
        >
          {portalLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <ExternalLink className="w-5 h-5 mr-2" />
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
      {/* Free Trial Status Card - Show if user has free usage remaining */}
      {hasFreeUsage && !subscribed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border-2 border-emerald-500 p-4 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">Your Free Trial</h3>
                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {jobsCompleted} of 10 jobs used
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {jobsRemaining > 0 
                  ? `${jobsRemaining} free job${jobsRemaining !== 1 ? 's' : ''} remaining before upgrade`
                  : `${smsRemaining} free SMS${smsRemaining !== 1 ? 'es' : ''} remaining`
                }
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium">{Math.round((jobsCompleted / 10) * 100)}%</span>
            </div>
            <div className="w-full bg-emerald-500/10 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (jobsCompleted / 10) * 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>

          <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {jobsRemaining > 0 
                ? `✨ Keep going! Complete ${jobsRemaining} more job${jobsRemaining !== 1 ? 's' : ''} for free, then subscribe to unlock unlimited access.`
                : '✨ Subscribe now to continue with unlimited jobs & SMS receipts.'
              }
            </p>
          </div>
        </motion.div>
      )}

      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {hasFreeUsage ? 'Subscribe to SoloWipe Pro' : 'Upgrade to Pro'}
            </h3>
            <p className="text-sm text-muted-foreground">
                {hasFreeUsage 
                ? 'Subscribe now to unlock unlimited access' 
                : jobsCompleted >= 10 
                  ? 'You\'ve used your free jobs - upgrade to continue'
                  : 'Get your first 10 jobs free, then £25/month'
              }
            </p>
          </div>
        </div>

        {/* Free Trial Banner - show if user hasn't used free jobs yet */}
        {jobsCompleted === 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-medium">First 10 jobs free</span> — no payment until you've automated 10 cleans
            </p>
          </div>
        )}

        {/* Coupon Code Input */}
        <div className="space-y-4">
          {!showCouponInput ? (
            <button
              onClick={() => setShowCouponInput(true)}
              className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-3 transition-colors py-2 px-3 rounded-lg hover:bg-muted/50"
            >
              <Tag className="w-5 h-5" />
              Have a coupon or promo code?
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter coupon code (e.g. SAVE20)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 uppercase"
                  autoFocus
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCouponInput(false);
                    setCouponCode('');
                  }}
                >
                  Cancel
                </Button>
              </div>
              {couponCode && (
                <p className="text-xs text-muted-foreground">
                  Your discount will be applied when you click Subscribe
                </p>
              )}
            </div>
          )}
        </div>

        {/* Monthly Plan */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
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
            variant="outline"
            onClick={() => handleSubscribe('monthly', couponCode || null)}
            disabled={checkoutLoading !== null}
          >
            {checkoutLoading === 'monthly' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Start Free Trial — then £25/month'
            )}
          </Button>
        </div>

        {/* Annual Plan */}
        <div className="bg-primary/5 rounded-lg p-4 space-y-4 border-2 border-primary relative">
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
            onClick={() => handleSubscribe('annual', couponCode || null)}
            disabled={checkoutLoading !== null}
          >
            {checkoutLoading === 'annual' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Start Free Trial — then £250/year'
            )}
          </Button>
        </div>

        {/* Features List */}
        <div className="pt-2 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">What's included:</p>
          <ul className="space-y-2">
            {[
              'Unlimited customers & jobs',
              'SMS receipts included (covers SMS & GoCardless costs)',
              'Route optimization',
              'Photo evidence storage',
              'Business insights & reports',
              'Priority support',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                <Check className="w-5 h-5 text-primary flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
