-- Migration: Fix RLS infinite recursion
-- Date: 2025-01-29
-- Description: Fixes circular dependency between jobs and job_assignments RLS policies

BEGIN;

-- Drop the problematic Helper policy on jobs that causes circular dependency
DROP POLICY IF EXISTS "Helpers can view assigned jobs" ON public.jobs;

-- Replace the existing "Users can view jobs for their customers" policy with a combined one
-- This allows both Owners (via customer ownership) and Helpers (via assignments) to view jobs
-- without creating circular dependencies
DROP POLICY IF EXISTS "Users can view jobs for their customers" ON public.jobs;
CREATE POLICY "Users can view jobs for their customers"
  ON public.jobs FOR SELECT
  USING (
    -- Owners: can view jobs for their customers (existing behavior)
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
        AND customers.profile_id = auth.uid()
    )
    OR
    -- Helpers: can view jobs assigned to them (new behavior, no circular dependency)
    EXISTS (
      SELECT 1 FROM public.job_assignments
      WHERE job_assignments.job_id = jobs.id
        AND job_assignments.assigned_to_user_id = auth.uid()
    )
  );

COMMIT;





