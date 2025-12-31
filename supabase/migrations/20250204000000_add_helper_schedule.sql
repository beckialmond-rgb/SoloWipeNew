-- Migration: Add helper_schedule table
-- Date: 2025-02-04
-- Description: Phase 8 - Enables owners to assign helpers to specific days of the week with optional round names

BEGIN;

-- Create helper_schedule table
CREATE TABLE IF NOT EXISTS public.helper_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  round_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(owner_id, helper_id, day_of_week)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_helper_schedule_owner_id 
  ON public.helper_schedule(owner_id);
CREATE INDEX IF NOT EXISTS idx_helper_schedule_helper_id 
  ON public.helper_schedule(helper_id);
CREATE INDEX IF NOT EXISTS idx_helper_schedule_day 
  ON public.helper_schedule(day_of_week);

-- Enable RLS
ALTER TABLE public.helper_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Owners can view schedules for their helpers
DROP POLICY IF EXISTS "Owners can view their helper schedules" ON public.helper_schedule;
CREATE POLICY "Owners can view their helper schedules"
  ON public.helper_schedule FOR SELECT
  USING (owner_id = auth.uid());

-- Owners can create schedules for their helpers
DROP POLICY IF EXISTS "Owners can create helper schedules" ON public.helper_schedule;
CREATE POLICY "Owners can create helper schedules"
  ON public.helper_schedule FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.owner_id = auth.uid()
        AND team_members.helper_id = helper_schedule.helper_id
    )
  );

-- Owners can update their helper schedules
DROP POLICY IF EXISTS "Owners can update their helper schedules" ON public.helper_schedule;
CREATE POLICY "Owners can update their helper schedules"
  ON public.helper_schedule FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners can delete their helper schedules
DROP POLICY IF EXISTS "Owners can delete their helper schedules" ON public.helper_schedule;
CREATE POLICY "Owners can delete their helper schedules"
  ON public.helper_schedule FOR DELETE
  USING (owner_id = auth.uid());

-- Helpers can view their own schedule
DROP POLICY IF EXISTS "Helpers can view their own schedule" ON public.helper_schedule;
CREATE POLICY "Helpers can view their own schedule"
  ON public.helper_schedule FOR SELECT
  USING (helper_id = auth.uid());

-- Comments
COMMENT ON TABLE public.helper_schedule IS 
  'Stores weekly schedule assignments for helpers. Owners assign helpers to specific days of the week with optional round names.';

COMMENT ON COLUMN public.helper_schedule.day_of_week IS 
  'Day of the week (lowercase: monday, tuesday, etc.). Schedule repeats weekly.';

COMMENT ON COLUMN public.helper_schedule.round_name IS 
  'Optional round name (e.g., "North Round", "South Round"). NULL if no round assigned.';

COMMIT;

