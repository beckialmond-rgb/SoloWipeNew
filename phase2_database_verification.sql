-- Phase 2: Database Setup & Verification
-- Run this in Supabase SQL Editor to verify all database components

-- ============================================================================
-- 1. VERIFY TABLES EXIST
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
ORDER BY tablename;

-- Expected: 3 rows (profiles, customers, jobs) with rls_enabled = true

-- ============================================================================
-- 2. VERIFY TABLE STRUCTURES
-- ============================================================================

-- Check profiles table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check customers table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- Check jobs table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'jobs'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. VERIFY RLS POLICIES
-- ============================================================================

-- Check all RLS policies on profiles table
SELECT 
  policyname,
  cmd as operation,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

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

-- Check all RLS policies on jobs table
SELECT 
  policyname,
  cmd as operation,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'jobs'
ORDER BY cmd, policyname;

-- Expected policies:
-- profiles: SELECT, UPDATE, INSERT (3 policies)
-- customers: SELECT, INSERT, UPDATE, DELETE (4 policies)
-- jobs: SELECT, INSERT, UPDATE, DELETE (4 policies)

-- ============================================================================
-- 4. VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================

SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Expected:
-- customers.profile_id -> profiles.id
-- jobs.customer_id -> customers.id

-- ============================================================================
-- 5. VERIFY DATABASE TRIGGERS
-- ============================================================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  OR event_object_schema = 'auth'
ORDER BY event_object_table, trigger_name;

-- Expected: on_auth_user_created trigger on auth.users table

-- ============================================================================
-- 6. VERIFY FUNCTIONS
-- ============================================================================

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Expected: handle_new_user function

-- ============================================================================
-- 7. VERIFY INDEXES
-- ============================================================================

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'customers', 'jobs')
ORDER BY tablename, indexname;

-- Expected indexes:
-- profiles: idx_profiles_subscription_status, idx_profiles_gocardless_connected
-- customers: idx_customers_gocardless_mandate_status
-- jobs: idx_jobs_gocardless_payment_id, idx_jobs_payment_status

-- ============================================================================
-- 8. VERIFY STORAGE BUCKET (if accessible via SQL)
-- ============================================================================

-- Note: Storage buckets are typically managed via Supabase Dashboard
-- Check in Dashboard: Storage → Buckets → job-photos

-- ============================================================================
-- SUMMARY CHECKLIST
-- ============================================================================

-- Run this to get a quick summary
SELECT 
  'Tables' as component,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ All tables exist'
    ELSE '❌ Missing tables'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')

UNION ALL

SELECT 
  'RLS Policies' as component,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 11 THEN '✅ All policies exist'
    ELSE '❌ Missing policies'
  END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')

UNION ALL

SELECT 
  'Foreign Keys' as component,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ All foreign keys exist'
    ELSE '❌ Missing foreign keys'
  END as status
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' 
  AND table_schema = 'public'

UNION ALL

SELECT 
  'Triggers' as component,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Trigger exists'
    ELSE '❌ Missing trigger'
  END as status
FROM information_schema.triggers
WHERE (trigger_schema = 'public' OR event_object_schema = 'auth')
  AND trigger_name = 'on_auth_user_created'

UNION ALL

SELECT 
  'Functions' as component,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Function exists'
    ELSE '❌ Missing function'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';
