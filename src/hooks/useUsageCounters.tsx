/**
 * Usage Counters Hook
 * 
 * Tracks and provides usage counter data for subscription limits
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { UsageCounter } from '@/types/database';

export interface UsageCounterData extends UsageCounter {
  jobsRemaining: number;
  smsRemaining: number;
  jobsLimitReached: boolean;
  smsLimitReached: boolean;
}

export function useUsageCounters() {
  const { user } = useAuth();

  return useQuery<UsageCounterData | null>({
    queryKey: ['usageCounters', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Fetch usage counter (or create if doesn't exist)
      let { data, error } = await supabase
        .from('usage_counters')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      // If not found (404), return default values instead of creating
      if (error && (error.code === 'PGRST116' || error.message?.includes('404') || error.message?.includes('does not exist'))) {
        console.log('[useUsageCounters] Table does not exist yet, using defaults');
        // Return default usage counter data
        return {
          profile_id: user.id,
          jobs_completed_count: 0,
          sms_sent_count: 0,
          free_jobs_limit: 10,
          free_sms_limit: 10,
          jobs_limit_hit_at: null,
          sms_limit_hit_at: null,
          jobsRemaining: 10,
          smsRemaining: 10,
          jobsLimitReached: false,
          smsLimitReached: false,
        };
      } else if (error) {
        console.warn('[useUsageCounters] Failed to fetch usage counter (non-critical):', error.message || error);
        // Return defaults on error instead of throwing
        return {
          profile_id: user.id,
          jobs_completed_count: 0,
          sms_sent_count: 0,
          free_jobs_limit: 10,
          free_sms_limit: 10,
          jobs_limit_hit_at: null,
          sms_limit_hit_at: null,
          jobsRemaining: 10,
          smsRemaining: 10,
          jobsLimitReached: false,
          smsLimitReached: false,
        };
      }

      if (!data) return null;

      // Calculate remaining counts
      const jobsRemaining = Math.max(0, data.free_jobs_limit - data.jobs_completed_count);
      const smsRemaining = Math.max(0, data.free_sms_limit - data.sms_sent_count);
      const jobsLimitReached = data.jobs_completed_count >= data.free_jobs_limit;
      const smsLimitReached = data.sms_sent_count >= data.free_sms_limit;

      return {
        ...data,
        jobsRemaining,
        smsRemaining,
        jobsLimitReached,
        smsLimitReached,
      };
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds - refresh regularly to catch limit changes
    refetchInterval: 60000, // Refetch every minute to stay updated
  });
}

