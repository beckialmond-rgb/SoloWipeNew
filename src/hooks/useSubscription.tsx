import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { SubscriptionStatus, getTierFromProductId } from '@/constants/subscription';

export function useSubscription() {
  const { session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    tier: null,
  });
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        tier: null,
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        setLoading(false);
        return;
      }

      const productId = data?.product_id || null;
      setSubscription({
        subscribed: data?.subscribed || false,
        productId,
        subscriptionEnd: data?.subscription_end || null,
        tier: getTierFromProductId(productId),
      });
    } catch (err) {
      console.error('Failed to check subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  // Check on mount and when session changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!session?.access_token) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [session?.access_token, checkSubscription]);

  const createCheckout = async (priceType: 'monthly' | 'annual') => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceType },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data.url;
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    
    return data.url;
  };

  return {
    ...subscription,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
}
