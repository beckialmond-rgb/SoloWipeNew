-- Migration: Fix Job Assignments Foreign Key
-- Date: 2025-01-30
-- Description: Re-adds the foreign key constraint that was accidentally dropped.
--              This is critical for PostgREST to detect the relationship between jobs and job_assignments.

BEGIN;

-- Check if the foreign key constraint exists, if not add it
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'job_assignments_job_id_fkey'
    AND conrelid = 'public.job_assignments'::regclass
  ) THEN
    -- Add the foreign key constraint with ON DELETE CASCADE
    ALTER TABLE public.job_assignments
      ADD CONSTRAINT job_assignments_job_id_fkey
      FOREIGN KEY (job_id)
      REFERENCES public.jobs(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key constraint job_assignments_job_id_fkey added successfully';
  ELSE
    RAISE NOTICE 'Foreign key constraint job_assignments_job_id_fkey already exists';
  END IF;
END $$;

-- Verify the constraint exists
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'job_assignments_job_id_fkey'
    AND conrelid = 'public.job_assignments'::regclass
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    RAISE EXCEPTION 'Failed to create foreign key constraint';
  END IF;
END $$;

COMMIT;




