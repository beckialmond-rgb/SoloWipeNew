-- Migration: Add commission_percentage to team_members
-- Date: 2025-01-31
-- Description: Enables revenue split by storing commission percentage per helper-owner relationship
-- 
-- This field allows owners to set a commission percentage for each helper.
-- When a helper completes a job, their payment is calculated as:
-- helper_payment_amount = amount_collected * (commission_percentage / 100)
--
-- Default: 0 (no commission unless explicitly set)

BEGIN;

-- Add commission_percentage column
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC DEFAULT 0;

-- Set default for existing rows (if any)
UPDATE public.team_members
SET commission_percentage = 0
WHERE commission_percentage IS NULL;

-- Make column NOT NULL with default
ALTER TABLE public.team_members
  ALTER COLUMN commission_percentage SET NOT NULL,
  ALTER COLUMN commission_percentage SET DEFAULT 0;

-- Add comment explaining the field
COMMENT ON COLUMN public.team_members.commission_percentage IS 
  'Commission percentage for this helper (e.g., 15.5 = 15.5% of job amount). Default: 0 (no commission). Used to calculate helper_payment_amount when helper completes a job.';

COMMIT;

