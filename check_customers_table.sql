-- Diagnostic query to check if customers table exists
-- Run this first to see what tables are available

-- Check all tables in public schema
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check specifically for customers table (case-insensitive search)
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE LOWER(tablename) LIKE '%customer%'
ORDER BY schemaname, tablename;

-- Check if RLS is enabled on any customer-related tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE LOWER(tablename) LIKE '%customer%';
