-- Migration: Add usage counters and grace period support
-- Purpose: Track free trial usage (jobs completed, SMS sent) and implement grace period for payment failures

-- ============================================================================
-- USAGE COUNTERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Usage tracking (incremented on each action)
  jobs_completed_count INTEGER NOT NULL DEFAULT 0,
  sms_sent_count INTEGER NOT NULL DEFAULT 0,
  
  -- Trial configuration
  free_jobs_limit INTEGER NOT NULL DEFAULT 10,
  free_sms_limit INTEGER NOT NULL DEFAULT 10,
  
  -- Tracking when limits were hit
  jobs_limit_hit_at TIMESTAMPTZ,
  sms_limit_hit_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_counters_profile_id ON public.usage_counters(profile_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_usage_counters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_usage_counters_updated_at
  BEFORE UPDATE ON public.usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_counters_updated_at();

-- ============================================================================
-- RLS POLICIES FOR USAGE_COUNTERS
-- ============================================================================

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage counters"
  ON public.usage_counters FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own usage counters"
  ON public.usage_counters FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own usage counters"
  ON public.usage_counters FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- ============================================================================
-- DATABASE FUNCTIONS FOR USAGE TRACKING
-- ============================================================================

-- Function to increment job completion counter
CREATE OR REPLACE FUNCTION increment_job_completion(p_profile_id UUID)
RETURNS TABLE(jobs_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER;
  v_reached BOOLEAN;
BEGIN
  -- Get or create usage counter
  INSERT INTO public.usage_counters (profile_id)
  VALUES (p_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;
  
  -- Increment counter
  UPDATE public.usage_counters
  SET 
    jobs_completed_count = jobs_completed_count + 1,
    jobs_limit_hit_at = CASE 
      WHEN jobs_completed_count + 1 >= free_jobs_limit 
        AND jobs_limit_hit_at IS NULL 
      THEN NOW() 
      ELSE jobs_limit_hit_at 
    END
  WHERE profile_id = p_profile_id
  RETURNING jobs_completed_count, free_jobs_limit INTO v_current_count, v_limit;
  
  v_reached := v_current_count >= v_limit;
  
  RETURN QUERY SELECT v_current_count, v_reached;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment SMS send counter
CREATE OR REPLACE FUNCTION increment_sms_send(p_profile_id UUID)
RETURNS TABLE(sms_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER;
  v_reached BOOLEAN;
BEGIN
  -- Get or create usage counter
  INSERT INTO public.usage_counters (profile_id)
  VALUES (p_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;
  
  -- Increment counter
  UPDATE public.usage_counters
  SET 
    sms_sent_count = sms_sent_count + 1,
    sms_limit_hit_at = CASE 
      WHEN sms_sent_count + 1 >= free_sms_limit 
        AND sms_limit_hit_at IS NULL 
      THEN NOW() 
      ELSE sms_limit_hit_at 
    END
  WHERE profile_id = p_profile_id
  RETURNING sms_sent_count, free_sms_limit INTO v_current_count, v_limit;
  
  v_reached := v_current_count >= v_limit;
  
  RETURN QUERY SELECT v_current_count, v_reached;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRACE PERIOD SUPPORT IN PROFILES
-- ============================================================================

-- Add grace period fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_grace_period BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- INITIALIZE USAGE COUNTERS FOR EXISTING USERS
-- ============================================================================

-- Initialize usage counters for all existing users
-- Jobs completed count is calculated from existing jobs
-- SMS count starts at 0 (no historical tracking)
INSERT INTO public.usage_counters (profile_id, jobs_completed_count, sms_sent_count)
SELECT 
  p.id,
  COALESCE((
    SELECT COUNT(*) 
    FROM public.jobs j 
    JOIN public.customers c ON c.id = j.customer_id 
    WHERE c.profile_id = p.id 
      AND j.status = 'completed'
  ), 0),
  0 -- SMS count unknown (no historical tracking)
FROM public.profiles p
ON CONFLICT (profile_id) DO NOTHING;

