-- Migration: Add helper billing fields to team_members
-- Date: 2025-02-06
-- Stage: C, Phase 1 - Database Schema Changes for Helper Role Model + Billing
-- Description: Adds billing tracking fields for helper subscription model (£5/month per helper)
--
-- This migration:
-- 1. Adds four new columns to team_members:
--    - is_active: BOOLEAN (defaults to true - helpers become active immediately upon accepting invite)
--    - billing_started_at: TIMESTAMPTZ (set when helper accepts invite)
--    - billing_stopped_at: TIMESTAMPTZ (set when helper is removed/deactivated)
--    - stripe_subscription_item_id: TEXT (Stripe subscription item ID, populated in Phase 2)
-- 2. Migrates existing data:
--    - Sets is_active = true for all existing helpers
--    - Sets billing_started_at = invite_accepted_at OR added_at (whichever is available)
--    - Leaves billing_stopped_at and stripe_subscription_item_id as NULL
-- 3. Creates indexes for performance
-- 4. Adds column comments for documentation
--
-- Constraints:
-- - No RLS policy changes (Phase 1 is schema-only)
-- - No frontend/backend code changes (Phase 1 is schema-only)
-- - No Stripe logic (Phase 2 will handle Stripe integration)
-- - No active_helper_count cache in profiles (deferred to later phase)

BEGIN;

-- Step 1: Add new columns
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS billing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_stopped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT;

-- Step 2: Migrate existing data
-- Set is_active = true for all existing helpers
UPDATE public.team_members
SET is_active = true
WHERE is_active IS NULL;

-- Set billing_started_at based on invite acceptance or added_at
UPDATE public.team_members
SET billing_started_at = COALESCE(invite_accepted_at, added_at)
WHERE billing_started_at IS NULL;

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_is_active 
  ON public.team_members(is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_members_billing_started_at 
  ON public.team_members(billing_started_at) 
  WHERE billing_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_stripe_subscription_item_id 
  ON public.team_members(stripe_subscription_item_id) 
  WHERE stripe_subscription_item_id IS NOT NULL;

-- Step 4: Add column comments
COMMENT ON COLUMN public.team_members.is_active IS 
  'Indicates if helper is active for billing. Defaults to true - helpers become active immediately upon accepting invite.';

COMMENT ON COLUMN public.team_members.billing_started_at IS 
  'Timestamp when billing started for this helper. Set when helper accepts invite. Used for billing calculations.';

COMMENT ON COLUMN public.team_members.billing_stopped_at IS 
  'Timestamp when billing stopped for this helper. Set when helper is removed/deactivated. NULL if still active.';

COMMENT ON COLUMN public.team_members.stripe_subscription_item_id IS 
  'Stripe subscription item ID for this helper''s billing. Populated in Phase 2 when Stripe integration is added. NULL until then.';

-- Update table comment
COMMENT ON TABLE public.team_members IS 
  'Stores helper relationships with billing tracking. Allows owners to add helpers before first assignment. Supports placeholder helpers (not yet signed up) and real helpers (signed up). Includes invite tracking and billing fields for £5/month per helper subscription model.';

COMMIT;

