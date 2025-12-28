-- Add preferred_payment_method column to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT 
CHECK (preferred_payment_method IN ('gocardless', 'cash', 'transfer') OR preferred_payment_method IS NULL);

-- Add index for queries filtering by preferred payment method
CREATE INDEX IF NOT EXISTS idx_customers_preferred_payment_method 
ON public.customers(preferred_payment_method);

-- Add comment to document the field
COMMENT ON COLUMN public.customers.preferred_payment_method IS 'Customer preferred payment method: gocardless (Direct Debit), cash, or transfer (Bank Transfer). Nullable. Does not affect auto-collection logic - mandate status is always checked first.';





