-- Migration: Fix job_assignments RLS policies to avoid recursion
-- Date: 2025-01-29
-- Description: Fixes job_assignments policies to check customers directly instead of jobs
-- This prevents recursion when querying jobs with assignments

BEGIN;

-- Drop existing job_assignments policies that check jobs table
DROP POLICY IF EXISTS "Owners can view assignments for their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Owners can assign their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Owners can reassign their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Owners can unassign their jobs" ON public.job_assignments;

-- Recreate policies using a SECURITY DEFINER function to bypass RLS recursion
-- This prevents recursion when jobs queries include assignments

-- Create a helper function to check job ownership without triggering RLS recursion
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

-- Owners can view assignments for their jobs (using function to avoid recursion)
CREATE POLICY "Owners can view assignments for their jobs"
  ON public.job_assignments FOR SELECT
  USING (public.is_job_owner(job_id));

-- Owners can create assignments for their jobs (using function to avoid recursion)
CREATE POLICY "Owners can assign their jobs"
  ON public.job_assignments FOR INSERT
  WITH CHECK (public.is_job_owner(job_id));

-- Owners can update assignments for their jobs (using function to avoid recursion)
CREATE POLICY "Owners can reassign their jobs"
  ON public.job_assignments FOR UPDATE
  USING (public.is_job_owner(job_id));

-- Owners can delete assignments for their jobs (using function to avoid recursion)
CREATE POLICY "Owners can unassign their jobs"
  ON public.job_assignments FOR DELETE
  USING (public.is_job_owner(job_id));

COMMIT;

