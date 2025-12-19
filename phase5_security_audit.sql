-- Phase 5: Security Audit - RLS Policy Verification
-- Run this in Supabase SQL Editor to verify RLS policies are secure

-- ============================================================================
-- 1. VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
ORDER BY tablename;

-- Expected: All tables should have rls_enabled = true

-- ============================================================================
-- 2. VERIFY RLS POLICIES EXIST AND ARE RESTRICTIVE
-- ============================================================================

-- Check profiles policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd;

-- Expected: SELECT, UPDATE, INSERT policies all using auth.uid() = id

-- Check customers policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'customers'
ORDER BY cmd;

-- Expected: All policies using profile_id = auth.uid()

-- Check jobs policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'jobs'
ORDER BY cmd;

-- Expected: All policies checking customer ownership via EXISTS subquery

-- ============================================================================
-- 3. VERIFY NO PERMISSIVE POLICIES (should all be RESTRICTIVE)
-- ============================================================================

SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
  AND permissive = 'PERMISSIVE'
ORDER BY tablename, policyname;

-- Expected: 0 rows (all policies should be RESTRICTIVE)

-- ============================================================================
-- 4. VERIFY POLICIES USE AUTH.UID() (not allowing all users)
-- ============================================================================

SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
  AND (
    qual NOT LIKE '%auth.uid()%' 
    AND with_check NOT LIKE '%auth.uid()%'
  )
ORDER BY tablename, policyname;

-- Expected: 0 rows (all policies should use auth.uid())

-- ============================================================================
-- 5. CHECK FOR PUBLIC ACCESS POLICIES (should not exist)
-- ============================================================================

SELECT 
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
  AND (
    'public' = ANY(roles) 
    OR roles IS NULL
  )
ORDER BY tablename, policyname;

-- Expected: 0 rows (no public access policies)

-- ============================================================================
-- 6. VERIFY STORAGE POLICIES ARE RESTRICTIVE
-- ============================================================================

SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%job photos%'
ORDER BY policyname;

-- Expected: Policies should check bucket_id and user folder structure

-- ============================================================================
-- 7. SUMMARY: COUNT POLICIES PER TABLE
-- ============================================================================

SELECT 
  tablename,
  COUNT(*) as policy_count,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
GROUP BY tablename
ORDER BY tablename;

-- Expected:
-- profiles: 3 policies (SELECT, UPDATE, INSERT)
-- customers: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- jobs: 4 policies (SELECT, INSERT, UPDATE, DELETE)

-- ============================================================================
-- 8. VERIFY NO POLICY ALLOWS CROSS-USER ACCESS
-- ============================================================================

-- Check if any policy allows accessing other users' data
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  CASE 
    WHEN qual LIKE '%!=%auth.uid()%' THEN '⚠️ WARNING: May allow cross-user access'
    WHEN qual LIKE '%<>%auth.uid()%' THEN '⚠️ WARNING: May allow cross-user access'
    WHEN qual NOT LIKE '%auth.uid()%' THEN '⚠️ WARNING: Does not check user ID'
    ELSE '✅ OK'
  END as security_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
ORDER BY tablename, cmd;

-- Expected: All policies should show '✅ OK'
