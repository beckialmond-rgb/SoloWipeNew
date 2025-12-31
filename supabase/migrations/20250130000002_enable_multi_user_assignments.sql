-- Migration: Enable Multi-User Assignments
-- Date: 2025-01-30
-- Description: Removes single-assignment constraint and enables multiple helpers per job

BEGIN;

-- Remove the single-assignment constraint (UNIQUE on job_id only)
-- This allows multiple assignments per job
ALTER TABLE public.job_assignments 
  DROP CONSTRAINT IF EXISTS job_assignments_job_id_key;

-- Add constraint to prevent duplicate user assignments to the same job
-- This ensures a user can't be assigned to the same job twice
ALTER TABLE public.job_assignments
  DROP CONSTRAINT IF EXISTS job_assignments_job_user_unique;

ALTER TABLE public.job_assignments
  ADD CONSTRAINT job_assignments_job_user_unique 
  UNIQUE(job_id, assigned_to_user_id);

-- Update comment to reflect multi-assignment capability
COMMENT ON TABLE public.job_assignments IS 
  'Links jobs to assigned Helpers. Supports multiple helpers per job for team assignments, backup coverage, and training scenarios.';

COMMIT;




