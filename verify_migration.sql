-- Verification queries for payment_status migration
-- Run these in Supabase SQL Editor to verify migration results

-- 1. Count payments by status (should show 'processing' for GoCardless payments not yet paid_out)
SELECT 
  payment_status,
  payment_method,
  COUNT(*) as count
FROM public.jobs
WHERE status = 'completed'
GROUP BY payment_status, payment_method
ORDER BY payment_status, payment_method;

-- 2. Check for any GoCardless payments that should still be processing
-- (Should return 0 if migration worked correctly)
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

-- 3. Verify CHECK constraint was added
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.jobs'::regclass
  AND conname = 'jobs_payment_status_check';

-- 4. Show sample processing payments
SELECT 
  id,
  payment_status,
  payment_method,
  gocardless_payment_status,
  payment_date,
  amount_collected,
  completed_at
FROM public.jobs
WHERE payment_status = 'processing'
  AND payment_method = 'gocardless'
LIMIT 10;

