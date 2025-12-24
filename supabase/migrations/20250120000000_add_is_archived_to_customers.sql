-- Add is_archived boolean column to customers table
-- This column will be used to filter archived customers from the main customer list

ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for performance when filtering by is_archived
CREATE INDEX IF NOT EXISTS idx_customers_is_archived 
ON public.customers(is_archived) 
WHERE is_archived = true;

-- Update existing archived customers (those with archived_at set) to have is_archived = true
UPDATE public.customers 
SET is_archived = true 
WHERE archived_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.customers.is_archived IS 'Boolean flag to indicate if customer is archived. Archived customers are hidden from main list but their data remains accessible for financial reporting.';

