-- Debug: Check current database and existing columns
-- Run this to see what database you're connected to and what columns exist

-- 1. Check current database name
SELECT current_database();

-- 2. Check if customers table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'customers';

-- 3. List ALL columns in customers table
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- 4. Check if you have permissions to alter the table
SELECT 
  has_table_privilege('public.customers', 'ALTER') as can_alter,
  has_table_privilege('public.customers', 'SELECT') as can_select;





