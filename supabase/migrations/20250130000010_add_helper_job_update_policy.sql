-- Migration: Add Helper Job UPDATE Policy
-- Date: 2025-01-30
-- Description: Allows Helpers to update jobs assigned to them (for completion)
-- 
-- CRITICAL FIX: This policy enables Helpers to mark assigned jobs as complete.
-- Without this policy, Helpers can VIEW assigned jobs but cannot UPDATE them,
-- which blocks the entire Helper workflow.
--
-- Security: This policy ensures Helpers can ONLY update jobs they are assigned to,
-- preventing privilege escalation or access to non-assigned jobs.

BEGIN;

-- Allow Helpers to update jobs assigned to them
-- This policy checks if the current user (auth.uid()) exists in job_assignments
-- for the job being updated, ensuring only assigned Helpers can complete jobs.
DROP POLICY IF EXISTS "Helpers can update assigned jobs" ON public.jobs;
CREATE POLICY "Helpers can update assigned jobs"
  ON public.jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_assignments
      WHERE job_assignments.job_id = jobs.id
        AND job_assignments.assigned_to_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_assignments
      WHERE job_assignments.job_id = jobs.id
        AND job_assignments.assigned_to_user_id = auth.uid()
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Helpers can update assigned jobs" ON public.jobs IS 
  'Allows Helpers to update jobs assigned to them via job_assignments table. Enables job completion workflow for Helpers.';

COMMIT;

