-- Migration: Fix Job Assignments Unique Constraint
-- Date: 2025-01-30
-- Description: Ensures the correct unique constraint exists for job_assignments table.
--              This fixes the issue where assigning jobs to account holders fails.
--              The constraint should be UNIQUE(job_id, assigned_to_user_id) to allow
--              multiple users per job but prevent duplicate assignments.

BEGIN;

-- First, find and drop any existing unique constraint on job_id only
-- PostgreSQL auto-generates constraint names, so we need to find them dynamically
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for UNIQUE(job_id) if it exists
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.job_assignments'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
      AND conkey[1] = (
          SELECT attnum 
          FROM pg_attribute 
          WHERE attrelid = 'public.job_assignments'::regclass 
            AND attname = 'job_id'
      );
    
    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.job_assignments DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped single-assignment constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No single-assignment constraint found on job_id';
    END IF;
END $$;

-- Drop the multi-user constraint if it exists (to recreate it cleanly)
ALTER TABLE public.job_assignments
  DROP CONSTRAINT IF EXISTS job_assignments_job_user_unique;

-- Add the correct constraint: UNIQUE(job_id, assigned_to_user_id)
-- This allows multiple users per job but prevents duplicate assignments
ALTER TABLE public.job_assignments
  ADD CONSTRAINT job_assignments_job_user_unique 
  UNIQUE(job_id, assigned_to_user_id);

-- Verify the constraint exists
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'job_assignments_job_user_unique'
        AND conrelid = 'public.job_assignments'::regclass
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        RAISE EXCEPTION 'Failed to create unique constraint job_assignments_job_user_unique';
    ELSE
        RAISE NOTICE 'Successfully created unique constraint job_assignments_job_user_unique';
    END IF;
END $$;

-- Update comment
COMMENT ON CONSTRAINT job_assignments_job_user_unique ON public.job_assignments IS 
  'Ensures a user cannot be assigned to the same job twice. Allows multiple users per job.';

COMMIT;




