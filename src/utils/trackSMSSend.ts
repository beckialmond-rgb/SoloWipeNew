/**
 * SMS Usage Tracking Utility
 * 
 * Tracks SMS sends for usage-based subscription limits
 */

import { supabase } from '@/integrations/supabase/client';

export interface SMSUsageResult {
  smsCount: number;
  limitReached: boolean;
}

/**
 * Track an SMS send and increment the usage counter
 * @param userId - The user's profile ID
 * @returns Usage counter result with current count and whether limit was reached
 */
export async function trackSMSSend(userId: string): Promise<SMSUsageResult> {
  try {
    const { data, error } = await supabase
      .rpc('increment_sms_send', { p_profile_id: userId });

    if (error) {
      console.error('[trackSMSSend] Failed to increment SMS counter:', error);
      // Don't throw - tracking failure shouldn't break SMS functionality
      return { smsCount: 0, limitReached: false };
    }

    if (!data || data.length === 0) {
      console.warn('[trackSMSSend] No data returned from increment_sms_send');
      return { smsCount: 0, limitReached: false };
    }

    return {
      smsCount: data[0]?.sms_count || 0,
      limitReached: data[0]?.limit_reached || false,
    };
  } catch (err) {
    console.error('[trackSMSSend] Unexpected error:', err);
    // Don't throw - tracking failure shouldn't break SMS functionality
    return { smsCount: 0, limitReached: false };
  }
}

