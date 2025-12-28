-- Verify that preferred_payment_method column exists and is configured correctly
-- Run this in Supabase SQL Editor to check migration status

-- Check if column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers' 
  AND column_name = 'preferred_payment_method';

-- Check if index exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'customers' 
  AND indexname = 'idx_customers_preferred_payment_method';

-- Check constraint details
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.customers'::regclass
  AND conname LIKE '%preferred_payment_method%';

-- If column doesn't exist, run the migration:
-- (Copy the content from supabase/migrations/20250128000000_add_preferred_payment_method.sql)





