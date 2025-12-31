-- Migration: Create RPC Function for Invite Validation
-- Date: 2025-01-30
-- Description: Creates a SECURITY DEFINER function to validate invite tokens
--              This allows unauthenticated users to validate invites without RLS blocking

BEGIN;

-- Create function to validate invite token and return details
CREATE OR REPLACE FUNCTION public.get_invite_details(token_input TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  result JSON;
BEGIN
  -- Look up team_members by invite_token
  SELECT 
    tm.helper_email,
    tm.invite_expires_at,
    tm.invite_accepted_at,
    p.business_name as owner_name
  INTO invite_record
  FROM public.team_members tm
  LEFT JOIN public.profiles p ON p.id = tm.owner_id
  WHERE tm.invite_token = token_input
  LIMIT 1;

  -- If not found, return null
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check if already accepted
  IF invite_record.invite_accepted_at IS NOT NULL THEN
    RETURN json_build_object(
      'helper_email', invite_record.helper_email,
      'owner_name', invite_record.owner_name,
      'invite_expires_at', invite_record.invite_expires_at,
      'is_valid', false,
      'reason', 'already_accepted'
    );
  END IF;

  -- Check if expired
  IF invite_record.invite_expires_at IS NOT NULL AND invite_record.invite_expires_at < NOW() THEN
    RETURN json_build_object(
      'helper_email', invite_record.helper_email,
      'owner_name', invite_record.owner_name,
      'invite_expires_at', invite_record.invite_expires_at,
      'is_valid', false,
      'reason', 'expired'
    );
  END IF;

  -- Valid invite
  RETURN json_build_object(
    'helper_email', invite_record.helper_email,
    'owner_name', invite_record.owner_name,
    'invite_expires_at', invite_record.invite_expires_at,
    'is_valid', true
  );
END;
$$;

-- Grant execute permission to anon users (unauthenticated)
GRANT EXECUTE ON FUNCTION public.get_invite_details(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_details(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_invite_details(TEXT) IS 
  'Validates invite token and returns invite details. Can be called by unauthenticated users. Returns JSON with helper_email, owner_name, invite_expires_at, and is_valid.';

COMMIT;

