import { useState, createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageCounters } from '@/hooks/useUsageCounters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SoftPaywallContextType {
  isModalOpen: boolean;
  triggerAction: string | null;
  isTrialExpired: boolean;
  isLocked: boolean; // True if user is locked out (no subscription, no free usage, not in grace period)
  isInGracePeriod: boolean; // True if user is in grace period (soft lock)
  openPaywall: (action?: string) => void;
  closePaywall: () => void;
  requirePremium: (action?: string) => boolean;
  canPerformAction: (action?: string) => boolean; // Check if action can be performed (for disabling buttons)
}

const SoftPaywallContext = createContext<SoftPaywallContextType | undefined>(undefined);

export function SoftPaywallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { subscribed, status, loading: subscriptionLoading } = useSubscription();
  const { data: usageCounters, isLoading: usageCountersLoading } = useUsageCounters();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [triggerAction, setTriggerAction] = useState<string | null>(null);

  // Fetch profile to check grace period
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('grace_period_ends_at, subscription_status')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Check if user is in grace period (payment failed, 7-day buffer)
  const isInGracePeriod = useMemo(() => {
    if (!profile?.grace_period_ends_at) return false;
    const graceEnd = new Date(profile.grace_period_ends_at);
    return graceEnd > new Date();
  }, [profile?.grace_period_ends_at]);

  // Check if user has free usage remaining
  const hasFreeUsage = useMemo(() => {
    if (!usageCounters) return false;
    return usageCounters.jobsRemaining > 0 || usageCounters.smsRemaining > 0;
  }, [usageCounters]);

  // Check if trial has expired (no subscription, no free usage, not in grace period)
  const isTrialExpired = useMemo(() => {
    if (!user) return false;
    if (subscribed || status === 'trialing') return false;
    if (hasFreeUsage) return false;
    if (isInGracePeriod) return false;
    return true;
  }, [user, subscribed, status, hasFreeUsage, isInGracePeriod]);

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
    // Still loading - allow action (optimistic, prevents blocking while data loads)
    if (subscriptionLoading || usageCountersLoading) return true;
    
    // User has active subscription or is trialing
    if (subscribed || status === 'trialing') return true;
    
    // User has free usage remaining (first 10 jobs/SMS free)
    if (hasFreeUsage) return true;
    
    // User is in grace period - allow viewing, block actions
    if (isInGracePeriod) {
      if (action === 'view') return true; // Allow viewing customer list
      openPaywall(action);
      return false;
    }
    
    // No premium access - show paywall
    openPaywall(action);
    return false;
  }, [subscribed, status, subscriptionLoading, usageCountersLoading, hasFreeUsage, isInGracePeriod, openPaywall]);

  // Check if action can be performed (for UI disabling buttons)
  const canPerformAction = useCallback((action?: string): boolean => {
    // Still loading - allow (optimistic)
    if (subscriptionLoading || usageCountersLoading) return true;
    
    // User has active subscription or is trialing
    if (subscribed || status === 'trialing') return true;
    
    // User has free usage remaining
    if (hasFreeUsage) return true;
    
    // In grace period - allow viewing, disable actions
    if (isInGracePeriod) {
      return action === 'view';
    }
    
    // Locked out
    return false;
  }, [subscribed, status, subscriptionLoading, usageCountersLoading, hasFreeUsage, isInGracePeriod]);

  const isLocked = useMemo(() => {
    if (subscriptionLoading || usageCountersLoading) return false;
    if (subscribed || status === 'trialing') return false;
    if (hasFreeUsage) return false;
    if (isInGracePeriod) return false; // Grace period is soft lock, not hard lock
    return true;
  }, [subscribed, status, subscriptionLoading, usageCountersLoading, hasFreeUsage, isInGracePeriod]);

  return (
    <SoftPaywallContext.Provider value={{ 
      isModalOpen, 
      triggerAction, 
      isTrialExpired: !!isTrialExpired,
      isLocked,
      isInGracePeriod,
      openPaywall, 
      closePaywall, 
      requirePremium,
      canPerformAction
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