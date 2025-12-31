-- Migration: Add helper_payment_amount to jobs
-- Date: 2025-01-31
-- Description: Stores calculated helper payment amount for revenue split tracking
--
-- This field stores the payment amount for the helper who completed the job.
-- Calculated at job completion time as:
-- helper_payment_amount = amount_collected * (commission_percentage / 100)
--
-- NULL = no helper payment (owner completed or helper has 0% commission)
-- Non-NULL = payment amount for helper who completed the job

BEGIN;

-- Add helper_payment_amount column
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS helper_payment_amount NUMERIC DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.jobs.helper_payment_amount IS 
  'Payment amount for helper who completed this job. Calculated at completion time as: amount_collected * (commission_percentage / 100). NULL = no helper payment (owner completed or helper has 0% commission). Stored for historical accuracy even if commission_percentage changes later.';

COMMIT;

