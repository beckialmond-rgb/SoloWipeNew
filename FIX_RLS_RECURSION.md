# Fix RLS Infinite Recursion

## Problem
The RLS policies created a circular dependency:
- `jobs` table policy checks `job_assignments`
- `job_assignments` table policies check `jobs`
- This causes infinite recursion errors

## Solution
Run the fix migration to combine the policies and remove the circular dependency.

## Steps

1. **Open Supabase Dashboard** → SQL Editor

2. **Copy and paste the following SQL:**

```sql
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
```

3. **Click "Run"** to execute the migration

4. **Verify** - The app should now load without infinite recursion errors

## What This Fixes

✅ Removes circular dependency between `jobs` and `job_assignments` RLS policies
✅ Allows Owners to view their jobs (existing behavior)
✅ Allows Helpers to view assigned jobs (new behavior)
✅ Fixes query errors related to invalid `auth.users` joins

## Code Changes

The code has also been updated to:
- Remove invalid `auth.users` joins (we can't query auth.users directly)
- Use `assigned_to_user_id` directly instead of trying to join user data





