-- ============================================================================
-- MIGRATION: Add 'processing' status to payment_status
-- Date: 2025-01-25
-- Purpose: Support GoCardless payments that are in progress (not yet paid_out)
-- ============================================================================

-- Step 1: Update existing GoCardless payments that are marked 'paid' 
-- but haven't actually been paid_out yet to 'processing'
-- This fixes payments that were incorrectly marked as paid before funds arrived
UPDATE public.jobs
SET payment_status = 'processing'
WHERE payment_method = 'gocardless'
  AND payment_status = 'paid'
  AND (
    -- Payment hasn't been paid_out yet
    gocardless_payment_status IS NULL 
    OR gocardless_payment_status NOT IN ('paid_out', 'failed', 'cancelled', 'charged_back')
  )
  AND status = 'completed';

-- Step 2: Update payment_date to NULL for processing payments
-- (payment_date should only be set when paid_out via webhook)
UPDATE public.jobs
SET payment_date = NULL
WHERE payment_status = 'processing'
  AND payment_method = 'gocardless'
  AND payment_date IS NOT NULL;

-- Step 3: (Optional) Add CHECK constraint to validate payment_status values
-- This ensures only valid statuses can be set
-- Note: This will fail if there are any invalid values, so we check first
DO $$
BEGIN
  -- Check if there are any invalid payment_status values
  IF EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE payment_status NOT IN ('unpaid', 'processing', 'paid')
  ) THEN
    RAISE NOTICE 'Warning: Found invalid payment_status values. Constraint not added.';
    RAISE NOTICE 'Please review and fix invalid values before adding constraint.';
  ELSE
    -- Add constraint if all values are valid
    ALTER TABLE public.jobs
    DROP CONSTRAINT IF EXISTS jobs_payment_status_check;
    
    ALTER TABLE public.jobs
    ADD CONSTRAINT jobs_payment_status_check 
    CHECK (payment_status IN ('unpaid', 'processing', 'paid'));
    
    RAISE NOTICE 'Successfully added payment_status CHECK constraint.';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count payments by status
SELECT 
  payment_status,
  payment_method,
  COUNT(*) as count
FROM public.jobs
WHERE status = 'completed'
GROUP BY payment_status, payment_method
ORDER BY payment_status, payment_method;

-- Check for GoCardless payments that should be processing
SELECT 
  COUNT(*) as should_be_processing
FROM public.jobs
WHERE payment_method = 'gocardless'
  AND payment_status = 'paid'
  AND (
    gocardless_payment_status IS NULL 
    OR gocardless_payment_status NOT IN ('paid_out', 'failed', 'cancelled', 'charged_back')
  )
  AND status = 'completed';

