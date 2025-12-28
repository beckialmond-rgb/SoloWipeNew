-- Migration: Add job assignments table
-- Date: 2025-01-29
-- Description: Enables Owners to assign jobs to Helpers for manual multi-user support

BEGIN;

-- Create job_assignments table
CREATE TABLE IF NOT EXISTS public.job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_assignments_assigned_to 
  ON public.job_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id 
  ON public.job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_assigned_by 
  ON public.job_assignments(assigned_by_user_id);

-- Enable RLS
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Helpers can view assignments made to them
DROP POLICY IF EXISTS "Helpers can view their assignments" ON public.job_assignments;
CREATE POLICY "Helpers can view their assignments"
  ON public.job_assignments FOR SELECT
  USING (assigned_to_user_id = auth.uid());

-- Owners can view assignments for their jobs
DROP POLICY IF EXISTS "Owners can view assignments for their jobs" ON public.job_assignments;
CREATE POLICY "Owners can view assignments for their jobs"
  ON public.job_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.customers ON jobs.customer_id = customers.id
      WHERE jobs.id = job_assignments.job_id
        AND customers.profile_id = auth.uid()
    )
  );

-- Owners can create assignments for their jobs
DROP POLICY IF EXISTS "Owners can assign their jobs" ON public.job_assignments;
CREATE POLICY "Owners can assign their jobs"
  ON public.job_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.customers ON jobs.customer_id = customers.id
      WHERE jobs.id = job_assignments.job_id
        AND customers.profile_id = auth.uid()
    )
  );

-- Owners can update assignments for their jobs (reassignment)
DROP POLICY IF EXISTS "Owners can reassign their jobs" ON public.job_assignments;
CREATE POLICY "Owners can reassign their jobs"
  ON public.job_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.customers ON jobs.customer_id = customers.id
      WHERE jobs.id = job_assignments.job_id
        AND customers.profile_id = auth.uid()
    )
  );

-- Owners can delete assignments for their jobs
DROP POLICY IF EXISTS "Owners can unassign their jobs" ON public.job_assignments;
CREATE POLICY "Owners can unassign their jobs"
  ON public.job_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      JOIN public.customers ON jobs.customer_id = customers.id
      WHERE jobs.id = job_assignments.job_id
        AND customers.profile_id = auth.uid()
    )
  );

-- Add Helper view policy to jobs table
-- This allows Helpers to see jobs assigned to them
DROP POLICY IF EXISTS "Helpers can view assigned jobs" ON public.jobs;
CREATE POLICY "Helpers can view assigned jobs"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_assignments
      WHERE job_assignments.job_id = jobs.id
        AND job_assignments.assigned_to_user_id = auth.uid()
    )
  );

-- Add comment explaining the table
COMMENT ON TABLE public.job_assignments IS 'Links jobs to assigned Helpers. Owners can assign jobs to Helpers for manual multi-user support.';

COMMIT;





