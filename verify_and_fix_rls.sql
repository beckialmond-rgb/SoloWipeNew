-- Security Audit: Verify and Fix RLS Policies
-- Run this in Supabase SQL Editor to verify RLS is properly configured

-- ============================================================================
-- 1. VERIFY RLS IS ENABLED
-- ============================================================================
SELECT 
  tablename, 
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS DISABLED - SECURITY RISK!'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFY CUSTOMERS TABLE POLICIES
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual LIKE '%profile_id%' AND qual LIKE '%auth.uid()%' THEN '✅ Properly scoped'
    WHEN with_check LIKE '%profile_id%' AND with_check LIKE '%auth.uid()%' THEN '✅ Properly scoped'
    ELSE '⚠️ Review needed'
  END as security_status,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'customers'
ORDER BY cmd, policyname;

-- ============================================================================
-- 3. VERIFY JOBS TABLE POLICIES (should filter via customers)
-- ============================================================================
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual LIKE '%customers.profile_id%' AND qual LIKE '%auth.uid()%' THEN '✅ Properly scoped via customers'
    WHEN with_check LIKE '%customers.profile_id%' AND with_check LIKE '%auth.uid()%' THEN '✅ Properly scoped via customers'
    ELSE '⚠️ Review needed'
  END as security_status,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'jobs'
ORDER BY cmd, policyname;

-- ============================================================================
-- 4. FIX: Ensure RLS is enabled (if not already)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. FIX: Recreate customers policies (ensuring proper scoping)
-- ============================================================================

-- Drop and recreate SELECT policy
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
CREATE POLICY "Users can view their own customers"
  ON public.customers FOR SELECT
  USING (profile_id = auth.uid());

-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;
CREATE POLICY "Users can insert their own customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
CREATE POLICY "Users can update their own customers"
  ON public.customers FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Drop and recreate DELETE policy
DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;
CREATE POLICY "Users can delete their own customers"
  ON public.customers FOR DELETE
  USING (profile_id = auth.uid());

-- ============================================================================
-- 6. VERIFY: Test that policies work correctly
-- ============================================================================
-- Note: This will show policies, not test actual access
-- To test actual access, you need to run queries as different users

SELECT 
  'All policies verified' as status,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs');

-- ============================================================================
-- 7. CHECK FOR ANY CUSTOMERS WITH MISMATCHED profile_id
-- ============================================================================
-- This query should return 0 rows if all customers belong to valid profiles
SELECT 
  c.id,
  c.name,
  c.profile_id,
  CASE 
    WHEN p.id IS NULL THEN '❌ Orphaned - profile does not exist'
    ELSE '✅ Valid profile'
  END as status
FROM public.customers c
LEFT JOIN public.profiles p ON c.profile_id = p.id
WHERE p.id IS NULL
LIMIT 10;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- After running this script:
-- 1. Check the RLS enabled status - all should be ✅
-- 2. Check the security_status - all should be ✅
-- 3. Check for orphaned customers - should return 0 rows
-- 4. Test actual access by logging in as different users

