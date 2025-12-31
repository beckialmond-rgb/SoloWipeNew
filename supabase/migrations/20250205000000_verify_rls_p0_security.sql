-- Migration: Verify and ensure RLS is enabled on critical tables (P0 Security Fix)
-- Date: 2025-02-05
-- Description: Verifies RLS is enabled on team_members, job_assignments, helper_schedule, notifications
--              and ensures appropriate policies exist. Creates missing policies if needed.

BEGIN;

-- ============================================================================
-- 1. VERIFY RLS IS ENABLED ON ALL CRITICAL TABLES
-- ============================================================================

-- Enable RLS on team_members if not already enabled
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on job_assignments if not already enabled
ALTER TABLE IF EXISTS public.job_assignments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on helper_schedule if not already enabled
ALTER TABLE IF EXISTS public.helper_schedule ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notifications if not already enabled
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. VERIFY AND CREATE POLICIES FOR team_members
-- ============================================================================

-- Policies should already exist from migration 20250129000003_add_team_members.sql
-- But we ensure they exist here for safety

-- Owners can view their team members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'team_members' 
      AND policyname = 'Owners can view their team members'
  ) THEN
    CREATE POLICY "Owners can view their team members"
      ON public.team_members FOR SELECT
      USING (owner_id = auth.uid());
  END IF;
END $$;

-- Owners can add team members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'team_members' 
      AND policyname = 'Owners can add team members'
  ) THEN
    CREATE POLICY "Owners can add team members"
      ON public.team_members FOR INSERT
      WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- Owners can update their team members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'team_members' 
      AND policyname = 'Owners can update their team members'
  ) THEN
    CREATE POLICY "Owners can update their team members"
      ON public.team_members FOR UPDATE
      USING (owner_id = auth.uid());
  END IF;
END $$;

-- Owners can remove team members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'team_members' 
      AND policyname = 'Owners can remove team members'
  ) THEN
    CREATE POLICY "Owners can remove team members"
      ON public.team_members FOR DELETE
      USING (owner_id = auth.uid());
  END IF;
END $$;

-- Helpers can view their team memberships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'team_members' 
      AND policyname = 'Helpers can view their team memberships'
  ) THEN
    CREATE POLICY "Helpers can view their team memberships"
      ON public.team_members FOR SELECT
      USING (helper_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 3. VERIFY AND CREATE POLICIES FOR job_assignments
-- ============================================================================

-- Policies should already exist from migrations 20250129000000 and 20250129000002
-- But we ensure they exist here for safety

-- Ensure is_job_owner function exists (from migration 20250129000002)
CREATE OR REPLACE FUNCTION public.is_job_owner(job_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs
    JOIN public.customers ON jobs.customer_id = customers.id
    WHERE jobs.id = job_uuid
      AND customers.profile_id = auth.uid()
  );
$$;

-- Helpers can view assignments made to them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'job_assignments' 
      AND policyname = 'Helpers can view their assignments'
  ) THEN
    CREATE POLICY "Helpers can view their assignments"
      ON public.job_assignments FOR SELECT
      USING (assigned_to_user_id = auth.uid());
  END IF;
END $$;

-- Owners can view assignments for their jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'job_assignments' 
      AND policyname = 'Owners can view assignments for their jobs'
  ) THEN
    CREATE POLICY "Owners can view assignments for their jobs"
      ON public.job_assignments FOR SELECT
      USING (public.is_job_owner(job_id));
  END IF;
END $$;

-- Owners can assign their jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'job_assignments' 
      AND policyname = 'Owners can assign their jobs'
  ) THEN
    CREATE POLICY "Owners can assign their jobs"
      ON public.job_assignments FOR INSERT
      WITH CHECK (public.is_job_owner(job_id));
  END IF;
END $$;

-- Owners can reassign their jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'job_assignments' 
      AND policyname = 'Owners can reassign their jobs'
  ) THEN
    CREATE POLICY "Owners can reassign their jobs"
      ON public.job_assignments FOR UPDATE
      USING (public.is_job_owner(job_id));
  END IF;
END $$;

-- Owners can unassign their jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'job_assignments' 
      AND policyname = 'Owners can unassign their jobs'
  ) THEN
    CREATE POLICY "Owners can unassign their jobs"
      ON public.job_assignments FOR DELETE
      USING (public.is_job_owner(job_id));
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFY AND CREATE POLICIES FOR helper_schedule
-- ============================================================================

-- Policies should already exist from migration 20250204000000_add_helper_schedule.sql
-- But we ensure they exist here for safety

-- Owners can view their helper schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'helper_schedule' 
      AND policyname = 'Owners can view their helper schedules'
  ) THEN
    CREATE POLICY "Owners can view their helper schedules"
      ON public.helper_schedule FOR SELECT
      USING (owner_id = auth.uid());
  END IF;
END $$;

-- Owners can create helper schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'helper_schedule' 
      AND policyname = 'Owners can create helper schedules'
  ) THEN
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
  END IF;
END $$;

-- Owners can update their helper schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'helper_schedule' 
      AND policyname = 'Owners can update their helper schedules'
  ) THEN
    CREATE POLICY "Owners can update their helper schedules"
      ON public.helper_schedule FOR UPDATE
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- Owners can delete their helper schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'helper_schedule' 
      AND policyname = 'Owners can delete their helper schedules'
  ) THEN
    CREATE POLICY "Owners can delete their helper schedules"
      ON public.helper_schedule FOR DELETE
      USING (owner_id = auth.uid());
  END IF;
END $$;

-- Helpers can view their own schedule
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'helper_schedule' 
      AND policyname = 'Helpers can view their own schedule'
  ) THEN
    CREATE POLICY "Helpers can view their own schedule"
      ON public.helper_schedule FOR SELECT
      USING (helper_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- 5. VERIFY AND CREATE POLICIES FOR notifications
-- ============================================================================

-- Policies should already exist from migration 20250202000000_add_notifications_table.sql
-- But we ensure they exist here for safety

-- Users can view their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications' 
      AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON public.notifications FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

-- System can create notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications' 
      AND policyname = 'System can create notifications'
  ) THEN
    CREATE POLICY "System can create notifications"
      ON public.notifications FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Users can update their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications' 
      AND policyname = 'Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON public.notifications FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Users can delete their own notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'notifications' 
      AND policyname = 'Users can delete their own notifications'
  ) THEN
    CREATE POLICY "Users can delete their own notifications"
      ON public.notifications FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY (run separately to verify RLS status)
-- ============================================================================
-- Run this query in Supabase SQL Editor to verify RLS is enabled:
--
-- SELECT 
--   tablename, 
--   rowsecurity as rls_enabled,
--   CASE 
--     WHEN rowsecurity THEN '✅ RLS Enabled'
--     ELSE '❌ RLS DISABLED - SECURITY RISK!'
--   END as status
-- FROM pg_tables
-- WHERE schemaname = 'public' 
--   AND tablename IN ('team_members', 'job_assignments', 'helper_schedule', 'notifications')
-- ORDER BY tablename;
--
-- Expected: All 4 tables should show rls_enabled = true
-- ============================================================================

