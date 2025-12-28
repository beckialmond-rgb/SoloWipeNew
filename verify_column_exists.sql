-- Quick verification: Check if preferred_payment_method column exists
-- Run this in Supabase SQL Editor

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers' 
  AND column_name = 'preferred_payment_method';

-- Expected Result: Should return 1 row
-- If you see 1 row = ✅ Migration successful!
-- If you see no rows = ❌ Migration didn't work, need to troubleshoot





