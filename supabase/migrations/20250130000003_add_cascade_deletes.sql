-- Migration: Add Cascade Deletes for Job Assignments
-- Date: 2025-01-30
-- Description: Ensures assignments are cleaned up when jobs or helpers are deleted

BEGIN;

-- Add cascade delete for assignments when job is deleted
-- This ensures orphaned assignments don't remain in the database
ALTER TABLE public.job_assignments
  DROP CONSTRAINT IF EXISTS job_assignments_job_id_fkey;

-- Re-add the foreign key constraint with ON DELETE CASCADE
-- This is critical for PostgREST to detect the relationship
ALTER TABLE public.job_assignments
  ADD CONSTRAINT job_assignments_job_id_fkey
  FOREIGN KEY (job_id)
  REFERENCES public.jobs(id)
  ON DELETE CASCADE;

-- Note: We can't add CASCADE delete for helper_id because helpers might be deleted
-- from auth.users but we want to keep the assignment record for historical purposes
-- Instead, we'll handle this in application logic

-- Update comment
COMMENT ON TABLE public.job_assignments IS 
  'Links jobs to assigned Helpers. Supports multiple helpers per job. Assignments are automatically deleted when jobs are deleted.';

COMMIT;

