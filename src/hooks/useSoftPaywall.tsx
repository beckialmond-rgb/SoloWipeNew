import { useState, createContext, useContext, ReactNode, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { differenceInDays } from 'date-fns';

interface SoftPaywallContextType {
  isModalOpen: boolean;
  triggerAction: string | null;
  isTrialExpired: boolean;
  openPaywall: (action?: string) => void;
  closePaywall: () => void;
  requirePremium: (action?: string) => boolean;
}

const SoftPaywallContext = createContext<SoftPaywallContextType | undefined>(undefined);

export function SoftPaywallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subscribed, status, loading: subscriptionLoading } = useSubscription();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [triggerAction, setTriggerAction] = useState<string | null>(null);

  // Calculate if user is within 14-day trial period from account creation
  const isWithinTrialPeriod = useCallback(() => {
    if (!user?.created_at) return false;
    const daysSinceSignup = differenceInDays(new Date(), new Date(user.created_at));
    return daysSinceSignup <= 7;
  }, [user?.created_at]);

  // Check if trial has expired (user exists, not subscribed, and past 14 days)
  const isTrialExpired = user && !subscribed && status !== 'trialing' && !isWithinTrialPeriod();

  const openPaywall = useCallback((action?: string) => {
    setTriggerAction(action || null);
    setIsModalOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setIsModalOpen(false);
    setTriggerAction(null);
  }, []);

  // Returns true if user has premium access, false if paywall was triggered
  const requirePremium = useCallback((action?: string): boolean => {
    // Still loading subscription status - allow action (optimistic)
    if (subscriptionLoading) return true;
    
    // User has active subscription
    if (subscribed) return true;
    
    // User is in Stripe trialing status
    if (status === 'trialing') return true;
    
    // User is within 14-day grace period from signup
    if (isWithinTrialPeriod()) return true;
    
    // No premium access - show paywall
    openPaywall(action);
    return false;
  }, [subscribed, status, subscriptionLoading, isWithinTrialPeriod, openPaywall]);

  return (
    <SoftPaywallContext.Provider value={{ 
      isModalOpen, 
      triggerAction, 
      isTrialExpired: !!isTrialExpired,
      openPaywall, 
      closePaywall, 
      requirePremium 
    }}>
      {children}
    </SoftPaywallContext.Provider>
  );
}

export function useSoftPaywall() {
  const context = useContext(SoftPaywallContext);
  if (context === undefined) {
    throw new Error('useSoftPaywall must be used within a SoftPaywallProvider');
  }
  return context;
}