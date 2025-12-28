# Fix Job Assignments RLS Recursion

## Problem
The `job_assignments` RLS policies check the `jobs` table, which triggers the `jobs` RLS policy. Since the `jobs` policy also checks `job_assignments`, this creates infinite recursion when querying jobs with assignments.

## Solution
Use a `SECURITY DEFINER` function to check job ownership, which bypasses RLS checks and prevents recursion.

## Steps

1. **Open Supabase Dashboard** → SQL Editor

2. **Copy and paste the following SQL:**

```sql
BEGIN;

-- Drop existing job_assignments policies that check jobs table
DROP POLICY IF EXISTS "Owners can view assignments for their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Owners can assign their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Owners can reassign their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Owners can unassign their jobs" ON public.job_assignments;

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
```

3. **Click "Run"** to execute the migration

4. **Verify** - All queries should now work without 500 errors

## What This Fixes

✅ Removes recursion between `jobs` and `job_assignments` RLS policies
✅ Uses `SECURITY DEFINER` function to bypass RLS when checking ownership
✅ All job queries (pending, upcoming, completed, unpaid) should work
✅ Assignment queries should work without errors

## How It Works

The `is_job_owner()` function uses `SECURITY DEFINER`, which means it runs with the privileges of the function creator (bypassing RLS). This allows it to check job ownership without triggering the jobs RLS policy, breaking the recursion cycle.





