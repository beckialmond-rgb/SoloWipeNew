-- Migration: Fix Helper Deactivation - Remove ALL Job Assignments
-- Date: 2025-02-10
-- Description: Ensures that when a helper is deactivated, ALL pending job assignments
--              are removed (not just future ones). This prevents helpers from seeing
--              jobs they shouldn't after deactivation.
--
-- CRITICAL FIX: Previous implementation may have only removed future assignments.
-- This migration ensures ALL assignments are cleaned up on deactivation.

BEGIN;

-- Create or replace function to clean up ALL assignments when helper is deactivated
-- This function should be called by the manage-helper-billing edge function
CREATE OR REPLACE FUNCTION cleanup_helper_assignments(p_helper_id UUID, p_owner_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete ALL job assignments for this helper
  -- Only delete assignments for jobs owned by the specified owner (security check)
  DELETE FROM public.job_assignments
  WHERE assigned_to_user_id = p_helper_id
    AND EXISTS (
      SELECT 1
      FROM public.jobs j
      JOIN public.customers c ON c.id = j.customer_id
      WHERE j.id = job_assignments.job_id
        AND c.profile_id = p_owner_id
    );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION cleanup_helper_assignments IS 
  'Removes ALL job assignments for a helper when they are deactivated. Ensures helpers cannot see assigned jobs after deactivation.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_helper_assignments(UUID, UUID) TO authenticated;

COMMIT;

