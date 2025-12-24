-- Add fee tracking columns to jobs table for financial reporting
-- These track the breakdown of fees for GoCardless payments

-- Gross amount (what customer pays)
-- Note: amount_collected already exists and represents this

-- SoloWipe Platform Fee (0.75% + 30p)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT NULL;

-- GoCardless Processing Fee (varies, typically 1% + 20p, capped at £4)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS gocardless_fee NUMERIC DEFAULT NULL;

-- Net payout (amount after all fees)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.jobs.platform_fee IS 'SoloWipe platform fee (0.75% + £0.30) for GoCardless payments';
COMMENT ON COLUMN public.jobs.gocardless_fee IS 'GoCardless processing fee (typically 1% + £0.20, capped at £4)';
COMMENT ON COLUMN public.jobs.net_amount IS 'Net payout amount after deducting all fees (for GoCardless payments)';

-- For GoCardless payments, calculate and populate fees for existing records
-- This is approximate - actual fees may vary based on payment amount
UPDATE public.jobs j
SET 
  platform_fee = CASE 
    WHEN j.payment_method = 'gocardless' AND j.amount_collected IS NOT NULL 
    THEN ROUND((j.amount_collected * 0.0075) + 0.30, 2)
    ELSE NULL
  END,
  gocardless_fee = CASE 
    WHEN j.payment_method = 'gocardless' AND j.amount_collected IS NOT NULL 
    THEN LEAST(ROUND((j.amount_collected * 0.01) + 0.20, 2), 4.00)
    ELSE NULL
  END,
  net_amount = CASE 
    WHEN j.payment_method = 'gocardless' AND j.amount_collected IS NOT NULL 
    THEN j.amount_collected - 
         ROUND((j.amount_collected * 0.0075) + 0.30, 2) - 
         LEAST(ROUND((j.amount_collected * 0.01) + 0.20, 2), 4.00)
    ELSE NULL
  END
WHERE j.payment_method = 'gocardless' 
  AND j.amount_collected IS NOT NULL;

