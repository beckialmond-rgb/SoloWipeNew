-- Migration: Add Helper Invite Tracking
-- Date: 2025-01-30
-- Description: Enables invite token system for helper onboarding
--
-- This migration adds invite tracking columns to team_members table:
-- - invite_token: Unique token for magic link invites
-- - invited_at: Timestamp when invite was sent
-- - invite_expires_at: Expiration timestamp (default: 7 days)
-- - invite_accepted_at: Timestamp when helper accepts invite (null until accepted)
--
-- Security: Invite tokens are unique and expire after 7 days by default.

BEGIN;

-- Add invite tracking columns to team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

-- Index for invite token lookups (fast validation)
CREATE INDEX IF NOT EXISTS idx_team_members_invite_token 
  ON public.team_members(invite_token) 
  WHERE invite_token IS NOT NULL;

-- Index for pending invites (not yet accepted, not expired)
-- Useful for querying active invites
CREATE INDEX IF NOT EXISTS idx_team_members_pending_invites
  ON public.team_members(invite_accepted_at, invite_expires_at)
  WHERE invite_accepted_at IS NULL AND invite_token IS NOT NULL;

-- Add column comments for documentation
COMMENT ON COLUMN public.team_members.invite_token IS 
  'Unique token for helper invite. Used in magic link URL. Generated as UUID.';
COMMENT ON COLUMN public.team_members.invited_at IS 
  'Timestamp when invite was sent to helper.';
COMMENT ON COLUMN public.team_members.invite_expires_at IS 
  'Invite expiration timestamp. Default: 7 days from invite. After expiration, token is invalid.';
COMMENT ON COLUMN public.team_members.invite_accepted_at IS 
  'Timestamp when helper accepts invite by signing up. NULL until accepted.';

-- Update table comment
COMMENT ON TABLE public.team_members IS 
  'Stores helper relationships. Allows owners to add helpers before first assignment. Supports placeholder helpers (not yet signed up) and real helpers (signed up). Includes invite tracking for email-based onboarding.';

COMMIT;

