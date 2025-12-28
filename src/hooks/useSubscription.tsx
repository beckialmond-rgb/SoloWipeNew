import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { SubscriptionStatus, getTierFromProductId } from '@/constants/subscription';

interface ExtendedSubscriptionStatus extends SubscriptionStatus {
  status: 'active' | 'trialing' | 'inactive';
  trialEnd: string | null;
}

export function useSubscription() {
  const { session } = useAuth();
  const [subscription, setSubscription] = useState<ExtendedSubscriptionStatus>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    tier: null,
    status: 'inactive',
    trialEnd: null,
  });
  const [loading, setLoading] = useState(true);
  const consecutiveErrorsRef = useRef(0);
  const lastErrorTimeRef = useRef<number | null>(null);
  const isCheckingRef = useRef(false);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        tier: null,
        status: 'inactive',
        trialEnd: null,
      });
      setLoading(false);
      return;
    }

    // Prevent concurrent calls
    if (isCheckingRef.current) {
      return;
    }

    // If we've had too many consecutive errors, back off
    const now = Date.now();
    if (consecutiveErrorsRef.current >= 3 && lastErrorTimeRef.current) {
      const timeSinceLastError = now - lastErrorTimeRef.current;
      // Back off for 5 minutes after 3 consecutive errors
      if (timeSinceLastError < 5 * 60 * 1000) {
        console.warn('[useSubscription] Backing off due to repeated errors. Will retry later.');
        return;
      }
      // Reset error count after backoff period
      consecutiveErrorsRef.current = 0;
      lastErrorTimeRef.current = null;
    }

    try {
      isCheckingRef.current = true;
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        // Track consecutive errors
        consecutiveErrorsRef.current += 1;
        lastErrorTimeRef.current = now;
        
        // Check if it's a 500 error (server error) - these are more serious
        const isServerError = error.message?.includes('500') || 
                             error.message?.includes('status of 500') ||
                             (error as any)?.status === 500;
        
        if (isServerError) {
          // For server errors, log once and back off more aggressively
          if (consecutiveErrorsRef.current === 1) {
            console.error('[useSubscription] Edge function returned 500 error. This is a server-side issue. Backing off.');
          }
        } else {
          // CORS errors or function not available - handle gracefully
          if (error.message?.includes('CORS') || error.message?.includes('Failed to send') || error.message?.includes('ERR_FAILED')) {
            if (consecutiveErrorsRef.current === 1) {
              console.warn('[useSubscription] Edge function not available (CORS/network error), using defaults');
            }
          } else {
            if (consecutiveErrorsRef.current <= 2) {
              console.warn('[useSubscription] Error checking subscription (non-critical):', error.message || error);
            }
          }
        }
        
        // On error, default to inactive (safer than assuming active)
        setSubscription({
          subscribed: false,
          productId: null,
          subscriptionEnd: null,
          tier: null,
          status: 'inactive',
          trialEnd: null,
        });
        setLoading(false);
        return;
      }

      // Success - reset error tracking
      consecutiveErrorsRef.current = 0;
      lastErrorTimeRef.current = null;

      const productId = data?.product_id || null;
      setSubscription({
        subscribed: data?.subscribed || false,
        productId,
        subscriptionEnd: data?.subscription_end || null,
        tier: getTierFromProductId(productId),
        status: data?.subscription_status || 'inactive',
        trialEnd: data?.trial_end || null,
      });
    } catch (err) {
      // Track consecutive errors
      consecutiveErrorsRef.current += 1;
      lastErrorTimeRef.current = Date.now();
      
      if (consecutiveErrorsRef.current <= 2) {
        console.error('[useSubscription] Failed to check subscription:', err);
      }
      
      // On error, default to inactive
      setSubscription({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        tier: null,
        status: 'inactive',
        trialEnd: null,
      });
    } finally {
      setLoading(false);
      isCheckingRef.current = false;
    }
  }, [session?.access_token]);

  // Check on mount and when session changes
  useEffect(() => {
    if (session?.access_token) {
      checkSubscription();
    } else {
      // Reset subscription state when no session
      setSubscription({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        tier: null,
        status: 'inactive',
        trialEnd: null,
      });
      setLoading(false);
    }
  }, [session?.access_token]); // Only depend on session token, not the callback

  // Auto-refresh every minute to stay in sync with webhook updates
  // But only if we haven't had too many errors
  useEffect(() => {
    if (!session?.access_token) return;
    
    const interval = setInterval(() => {
      // Only check if we're not currently checking
      if (!isCheckingRef.current) {
        // Check if we should back off due to errors
        const now = Date.now();
        if (consecutiveErrorsRef.current >= 3 && lastErrorTimeRef.current) {
          const timeSinceLastError = now - lastErrorTimeRef.current;
          // Still in backoff period (5 minutes)
          if (timeSinceLastError < 5 * 60 * 1000) {
            return; // Skip this check
          }
          // Backoff period expired, reset error count
          consecutiveErrorsRef.current = 0;
          lastErrorTimeRef.current = null;
        }
        checkSubscription();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [session?.access_token, checkSubscription]); // Include checkSubscription in deps

  const createCheckout = async (priceType: 'monthly' | 'annual', couponCode?: string | null) => {
    if (!session?.access_token) {
      const authError = new Error('Not authenticated');
      console.error('❌ STRIPE CHECKOUT ERROR: Authentication failed', { priceType, couponCode });
      throw authError;
    }

    try {
      const body: { priceType: string; couponCode?: string } = { priceType };
      if (couponCode) {
        body.couponCode = couponCode;
      }
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('❌ STRIPE CHECKOUT ERROR: Function invocation failed', {
          priceType,
          couponCode,
          error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });
        throw error;
      }
      
      if (data?.error) {
        console.error('❌ STRIPE CHECKOUT ERROR: Server returned error', {
          priceType,
          couponCode,
          error: data.error,
        });
        throw new Error(data.error);
      }
      
      if (!data?.url) {
        const noUrlError = new Error('No checkout URL returned from server');
        console.error('❌ STRIPE CHECKOUT ERROR: Missing checkout URL', {
          priceType,
          couponCode,
          data,
        });
        throw noUrlError;
      }
      
      console.log('✅ Stripe checkout session created successfully', { 
        priceType, 
        couponCode: couponCode || 'none',
        url: data.url 
      });
      return data.url;
    } catch (err) {
      // Re-throw after logging
      console.error('❌ STRIPE CHECKOUT ERROR: Unexpected error', {
        priceType,
        error: err instanceof Error ? {
          message: err.message,
          name: err.name,
          stack: err.stack,
        } : String(err),
      });
      throw err;
    }
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
    hasActiveSubscription: subscription.subscribed, // Alias for compatibility
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
}
