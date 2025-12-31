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

      // Fetch usage counter (use maybeSingle to handle case where no row exists yet)
      let { data, error } = await supabase
        .from('usage_counters')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();

      // Handle errors gracefully - return defaults for table not found, RLS issues, or other errors
      if (error) {
        const errorCode = error.code;
        const errorMessage = error.message?.toLowerCase() || '';
        
        // Check for various error conditions that indicate table doesn't exist or isn't accessible
        const isTableNotFound = 
          errorCode === '42703' || // Column does not exist
          errorMessage.includes('404') ||
          errorMessage.includes('406') ||
          errorMessage.includes('not acceptable') ||
          errorMessage.includes('does not exist') ||
          (errorMessage.includes('relation') && errorMessage.includes('does not exist')) ||
          (errorMessage.includes('permission denied') && errorMessage.includes('usage_counters'));
        
        if (isTableNotFound) {
          console.log('[useUsageCounters] Table does not exist yet or not accessible, using defaults', {
            code: errorCode,
            message: error.message
          });
        } else {
          console.warn('[useUsageCounters] Failed to fetch usage counter (non-critical):', {
            code: errorCode,
            message: error.message
          });
        }
        
        // Return default usage counter data for any error
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

      // If no row exists, try to create one (or return defaults if creation fails)
      if (!data) {
        // Try to create a usage counter row for this user
        const { data: newData, error: createError } = await supabase
          .from('usage_counters')
          .insert({ profile_id: user.id })
          .select()
          .maybeSingle();
        
        if (createError || !newData) {
          // If creation fails (table doesn't exist, RLS issue, etc.), return defaults
          console.log('[useUsageCounters] Could not create usage counter, using defaults', {
            error: createError?.message
          });
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
        
        // Use the newly created row
        data = newData;
      }

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

