-- Migration: Helper Security Validation Functions
-- Date: 2025-02-10
-- Description: Phase 5 - Assignment Security Hardening
-- 
-- Creates helper functions to validate RLS security for helper-related queries.
-- These functions help ensure helpers can only access their assigned jobs and data.

BEGIN;

-- ============================================================================
-- SECURITY VALIDATION FUNCTIONS
-- ============================================================================

-- Function to verify helper can only see assigned jobs
CREATE OR REPLACE FUNCTION verify_helper_job_access(
  p_helper_id UUID,
  p_job_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_assignment BOOLEAN;
BEGIN
  -- Check if job is assigned to helper
  SELECT EXISTS (
    SELECT 1
    FROM public.job_assignments
    WHERE job_assignments.job_id = p_job_id
      AND job_assignments.assigned_to_user_id = p_helper_id
  ) INTO v_has_assignment;
  
  RETURN v_has_assignment;
END;
$$;

-- Function to verify helper can only see their own data
CREATE OR REPLACE FUNCTION verify_helper_data_access(
  p_helper_id UUID,
  p_data_type TEXT,
  p_data_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  CASE p_data_type
    WHEN 'onboarding' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.helper_onboarding_progress
        WHERE id = p_data_id
          AND helper_id = p_helper_id
      ) INTO v_has_access;
    
    WHEN 'schedule' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.helper_schedule
        WHERE id = p_data_id
          AND helper_id = p_helper_id
      ) INTO v_has_access;
    
    WHEN 'note' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.helper_job_notes
        WHERE id = p_data_id
          AND helper_id = p_helper_id
      ) INTO v_has_access;
    
    WHEN 'invoice' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.helper_invoices
        WHERE id = p_data_id
          AND helper_id = p_helper_id
      ) INTO v_has_access;
    
    ELSE
      v_has_access := false;
  END CASE;
  
  RETURN v_has_access;
END;
$$;

-- Function to get helper's assigned job IDs (for validation)
CREATE OR REPLACE FUNCTION get_helper_assigned_job_ids(
  p_helper_id UUID
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(job_id)
  INTO v_job_ids
  FROM public.job_assignments
  WHERE assigned_to_user_id = p_helper_id;
  
  RETURN COALESCE(v_job_ids, ARRAY[]::UUID[]);
END;
$$;

-- Function to audit helper access (for security testing)
CREATE OR REPLACE FUNCTION audit_helper_access(
  p_helper_id UUID
)
RETURNS TABLE (
  table_name TEXT,
  record_count BIGINT,
  has_rls_enabled BOOLEAN,
  policy_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'jobs'::TEXT,
    (SELECT COUNT(*) FROM public.jobs j
     INNER JOIN public.job_assignments ja ON j.id = ja.job_id
     WHERE ja.assigned_to_user_id = p_helper_id)::BIGINT,
    (SELECT rowsecurity FROM pg_tables 
     WHERE schemaname = 'public' AND tablename = 'jobs')::BOOLEAN,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE schemaname = 'public' AND tablename = 'jobs')::INTEGER
  UNION ALL
  SELECT 
    'helper_onboarding_progress'::TEXT,
    (SELECT COUNT(*) FROM public.helper_onboarding_progress 
     WHERE helper_id = p_helper_id)::BIGINT,
    (SELECT rowsecurity FROM pg_tables 
     WHERE schemaname = 'public' AND tablename = 'helper_onboarding_progress')::BOOLEAN,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE schemaname = 'public' AND tablename = 'helper_onboarding_progress')::INTEGER
  UNION ALL
  SELECT 
    'helper_schedule'::TEXT,
    (SELECT COUNT(*) FROM public.helper_schedule 
     WHERE helper_id = p_helper_id)::BIGINT,
    (SELECT rowsecurity FROM pg_tables 
     WHERE schemaname = 'public' AND tablename = 'helper_schedule')::BOOLEAN,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE schemaname = 'public' AND tablename = 'helper_schedule')::INTEGER
  UNION ALL
  SELECT 
    'helper_job_notes'::TEXT,
    (SELECT COUNT(*) FROM public.helper_job_notes 
     WHERE helper_id = p_helper_id)::BIGINT,
    (SELECT rowsecurity FROM pg_tables 
     WHERE schemaname = 'public' AND tablename = 'helper_job_notes')::BOOLEAN,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE schemaname = 'public' AND tablename = 'helper_job_notes')::INTEGER;
END;
$$;

-- Comments
COMMENT ON FUNCTION verify_helper_job_access IS 
  'Validates that a helper has access to a specific job via assignment. Returns true if job is assigned to helper.';

COMMENT ON FUNCTION verify_helper_data_access IS 
  'Validates that a helper has access to their own data. Checks helper_id matches for various helper-related tables.';

COMMENT ON FUNCTION get_helper_assigned_job_ids IS 
  'Returns array of job IDs assigned to a helper. Used for query validation and security checks.';

COMMENT ON FUNCTION audit_helper_access IS 
  'Audits helper access to verify RLS is working correctly. Returns record counts and RLS status for helper-related tables.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
-- These functions are SECURITY DEFINER, so they run with elevated privileges
-- but authenticated users need permission to call them
GRANT EXECUTE ON FUNCTION verify_helper_job_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_helper_data_access(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_helper_assigned_job_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION audit_helper_access(UUID) TO authenticated;

COMMIT;

