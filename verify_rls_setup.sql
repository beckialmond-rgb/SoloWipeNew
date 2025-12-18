-- Verification query to check RLS policies are set up correctly
-- Run this in Supabase SQL Editor to verify everything is configured

-- Check if customers table exists
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'customers';

-- Check all RLS policies on customers table
SELECT 
  policyname,
  cmd as operation,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'customers'
ORDER BY cmd, policyname;

-- Specifically check the INSERT policy
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'customers' 
  AND cmd = 'INSERT'
  AND policyname = 'Users can insert their own customers';
