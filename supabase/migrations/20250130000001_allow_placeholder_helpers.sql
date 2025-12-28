-- Migration: Allow Placeholder Helpers
-- Date: 2025-01-30
-- Description: Removes foreign key constraint on helper_id to allow placeholder helpers
--              that haven't signed up yet. Enables "Just-in-Time" helper creation.

BEGIN;

-- Remove the foreign key constraint that requires helper_id to exist in auth.users
ALTER TABLE public.team_members 
  DROP CONSTRAINT IF EXISTS team_members_helper_id_fkey;

-- Add a check constraint to validate UUID format (optional but good practice)
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_helper_id_format_check;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_helper_id_format_check 
  CHECK (helper_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Update column comment
COMMENT ON COLUMN public.team_members.helper_id IS 
  'Helper user ID. Can be a placeholder UUID for helpers not yet signed up, or a real auth.users ID for existing helpers.';

-- Update table comment
COMMENT ON TABLE public.team_members IS 
  'Stores helper relationships. Allows owners to add helpers before first assignment. Supports placeholder helpers (not yet signed up) and real helpers (signed up).';

COMMIT;




