-- Migration: Add explicit role field to profiles table
-- Date: 2025-02-01
-- Description: Phase 4 - Adds explicit role column to profiles for permission logic
--
-- This migration:
-- 1. Adds role column with CHECK constraint (owner, helper, both)
-- 2. Creates index for performance
-- 3. Backfills existing users based on current data relationships
-- 4. Sets default to 'owner' for new users
--
-- Role determination:
-- - 'owner': User has customers (non-archived)
-- - 'helper': User is in team_members table
-- - 'both': User has both customers and team_members entry
-- - Default: 'owner' (for new users or edge cases)

BEGIN;

-- Step 1: Add role column with CHECK constraint and default
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner'
  CHECK (role IN ('owner', 'helper', 'both'));

-- Step 2: Create index for role queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON public.profiles(role) 
  WHERE role IS NOT NULL;

-- Step 3: Backfill existing users (safe, non-destructive)
-- Only updates NULL or default values to preserve any manually set roles
UPDATE public.profiles
SET role = CASE
  -- User has customers (non-archived) AND is in team_members → 'both'
  WHEN EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.profile_id = profiles.id 
    AND customers.is_archived = false
  ) AND EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.helper_id = profiles.id
  )
  THEN 'both'
  
  -- User has customers (non-archived) → 'owner'
  WHEN EXISTS (
    SELECT 1 FROM public.customers 
    WHERE customers.profile_id = profiles.id 
    AND customers.is_archived = false
  )
  THEN 'owner'
  
  -- User is in team_members → 'helper'
  WHEN EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.helper_id = profiles.id
  )
  THEN 'helper'
  
  -- Default fallback (shouldn't happen, but safe)
  ELSE 'owner'
END
WHERE role IS NULL OR role = 'owner'; -- Only update if null or default

-- Step 4: Add comment for documentation
COMMENT ON COLUMN public.profiles.role IS 
  'User role: owner (has customers), helper (in team_members), or both. Used for permission logic. Defaults to owner for new users.';

COMMIT;

