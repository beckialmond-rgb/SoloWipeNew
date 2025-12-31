-- ============================================================================
-- Migration: Create get_invite_details RPC Function
-- Date: 2025-02-09
-- Description: Creates or replaces the get_invite_details function for invite validation
--              This allows unauthenticated users to validate invites without RLS blocking
-- ============================================================================

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
BEGIN
  -- Input validation: return null for empty/null tokens
  IF token_input IS NULL OR trim(token_input) = '' THEN
    RETURN NULL;
  END IF;

  -- Look up team_members by invite_token
  SELECT 
    tm.helper_email,
    tm.invite_expires_at,
    tm.invite_accepted_at,
    p.business_name as owner_name
  INTO invite_record
  FROM public.team_members tm
  LEFT JOIN public.profiles p ON p.id = tm.owner_id
  WHERE tm.invite_token = trim(token_input)
  LIMIT 1;

  -- If not found, return null
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Defensive check: if helper_email is somehow null, treat as invalid
  IF invite_record.helper_email IS NULL THEN
    RETURN json_build_object(
      'helper_email', NULL,
      'owner_name', invite_record.owner_name,
      'invite_expires_at', invite_record.invite_expires_at,
      'is_valid', false,
      'reason', 'invalid_data'
    );
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
  -- Note: NULL invite_expires_at means never expires (intentional design)
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
  'Validates invite token and returns invite details. Can be called by unauthenticated users. Returns JSON with helper_email, owner_name, invite_expires_at, is_valid, and reason (if invalid). Handles NULL/empty tokens, expired invites, and already-accepted invites.';

COMMIT;

