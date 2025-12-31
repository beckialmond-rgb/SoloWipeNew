-- Migration: Add team_members table for helper management
-- Date: 2025-01-29
-- Description: Allows owners to proactively add helpers before first assignment

BEGIN;

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helper_email TEXT NOT NULL, -- Store email for display (can't query auth.users)
  helper_name TEXT, -- Optional display name
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, helper_id) -- Prevent duplicate relationships
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_owner ON public.team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_helper ON public.team_members(helper_id);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Owners can view their team members
DROP POLICY IF EXISTS "Owners can view their team members" ON public.team_members;
CREATE POLICY "Owners can view their team members"
  ON public.team_members FOR SELECT
  USING (owner_id = auth.uid());

-- Owners can add team members
DROP POLICY IF EXISTS "Owners can add team members" ON public.team_members;
CREATE POLICY "Owners can add team members"
  ON public.team_members FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their team members (e.g., change name)
DROP POLICY IF EXISTS "Owners can update their team members" ON public.team_members;
CREATE POLICY "Owners can update their team members"
  ON public.team_members FOR UPDATE
  USING (owner_id = auth.uid());

-- Owners can remove team members
DROP POLICY IF EXISTS "Owners can remove team members" ON public.team_members;
CREATE POLICY "Owners can remove team members"
  ON public.team_members FOR DELETE
  USING (owner_id = auth.uid());

-- Helpers can view if they're on someone's team (for verification)
DROP POLICY IF EXISTS "Helpers can view their team memberships" ON public.team_members;
CREATE POLICY "Helpers can view their team memberships"
  ON public.team_members FOR SELECT
  USING (helper_id = auth.uid());

COMMENT ON TABLE public.team_members IS 'Stores helper relationships. Allows owners to add helpers before first assignment.';

COMMIT;




