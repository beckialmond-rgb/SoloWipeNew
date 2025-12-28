-- Try running the migration again with error checking
-- Copy and paste ALL of this into Supabase SQL Editor and run it

BEGIN;

-- Check if column already exists (should return 0 rows if it doesn't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'customers' 
      AND column_name = 'preferred_payment_method'
  ) THEN
    RAISE NOTICE 'Column preferred_payment_method already exists - skipping migration';
  ELSE
    -- Add the column
    ALTER TABLE public.customers
    ADD COLUMN preferred_payment_method TEXT 
    CHECK (preferred_payment_method IN ('gocardless', 'cash', 'transfer') OR preferred_payment_method IS NULL);
    
    RAISE NOTICE 'Column preferred_payment_method added successfully';
  END IF;
END $$;

-- Create index (will fail silently if it exists)
CREATE INDEX IF NOT EXISTS idx_customers_preferred_payment_method 
ON public.customers(preferred_payment_method);

-- Add comment
COMMENT ON COLUMN public.customers.preferred_payment_method IS 'Customer preferred payment method: gocardless (Direct Debit), cash, or transfer (Bank Transfer). Nullable. Does not affect auto-collection logic - mandate status is always checked first.';

COMMIT;

-- Verify it worked
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers' 
  AND column_name = 'preferred_payment_method';





