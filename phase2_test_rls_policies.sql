-- Phase 2: Test RLS Policies
-- This script helps verify RLS policies are working correctly
-- Run this with a test user authenticated

-- ============================================================================
-- TEST 1: Verify authenticated user can see their own profile
-- ============================================================================

-- This should return 1 row (the current user's profile)
SELECT 
  id,
  business_name,
  created_at
FROM public.profiles
WHERE id = auth.uid();

-- ============================================================================
-- TEST 2: Verify authenticated user CANNOT see other users' profiles
-- ============================================================================

-- This should return 0 rows (can't see other profiles)
SELECT 
  id,
  business_name
FROM public.profiles
WHERE id != auth.uid()
LIMIT 5;

-- ============================================================================
-- TEST 3: Verify authenticated user can insert their own profile
-- ============================================================================

-- This should work (if profile doesn't exist)
-- Note: Usually handled by trigger, but test the policy
-- INSERT INTO public.profiles (id, business_name)
-- VALUES (auth.uid(), 'Test Business')
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEST 4: Verify authenticated user can see their own customers
-- ============================================================================

-- This should return customers belonging to current user
SELECT 
  id,
  name,
  address,
  profile_id
FROM public.customers
WHERE profile_id = auth.uid()
LIMIT 10;

-- ============================================================================
-- TEST 5: Verify authenticated user CANNOT see other users' customers
-- ============================================================================

-- This should return 0 rows (can't see other users' customers)
SELECT 
  id,
  name,
  address
FROM public.customers
WHERE profile_id != auth.uid()
LIMIT 5;

-- ============================================================================
-- TEST 6: Verify authenticated user can insert customer with their own profile_id
-- ============================================================================

-- This should work
-- INSERT INTO public.customers (
--   profile_id,
--   name,
--   address,
--   price,
--   frequency_weeks
-- ) VALUES (
--   auth.uid(),
--   'Test Customer',
--   '123 Test St',
--   20.00,
--   4
-- );

-- ============================================================================
-- TEST 7: Verify authenticated user CANNOT insert customer with different profile_id
-- ============================================================================

-- This should FAIL with RLS policy error
-- Try to insert with a fake UUID (this should be blocked)
-- INSERT INTO public.customers (
--   profile_id,
--   name,
--   address,
--   price,
--   frequency_weeks
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'Hacker Customer',
--   '123 Hack St',
--   20.00,
--   4
-- );

-- ============================================================================
-- TEST 8: Verify authenticated user can see jobs for their customers
-- ============================================================================

-- This should return jobs for customers belonging to current user
SELECT 
  j.id,
  j.scheduled_date,
  j.status,
  c.name as customer_name,
  c.profile_id
FROM public.jobs j
JOIN public.customers c ON j.customer_id = c.id
WHERE c.profile_id = auth.uid()
LIMIT 10;

-- ============================================================================
-- TEST 9: Verify authenticated user CANNOT see jobs for other users' customers
-- ============================================================================

-- This should return 0 rows
SELECT 
  j.id,
  j.scheduled_date,
  c.name as customer_name
FROM public.jobs j
JOIN public.customers c ON j.customer_id = c.id
WHERE c.profile_id != auth.uid()
LIMIT 5;

-- ============================================================================
-- TEST 10: Verify authenticated user can insert job for their own customer
-- ============================================================================

-- First, get a customer ID belonging to current user
-- SELECT id FROM public.customers WHERE profile_id = auth.uid() LIMIT 1;

-- Then try to insert a job (replace CUSTOMER_ID with actual ID from above)
-- INSERT INTO public.jobs (
--   customer_id,
--   scheduled_date,
--   status
-- ) VALUES (
--   'CUSTOMER_ID_HERE'::uuid,
--   CURRENT_DATE + INTERVAL '7 days',
--   'pending'
-- );

-- ============================================================================
-- TEST 11: Verify authenticated user CANNOT insert job for other user's customer
-- ============================================================================

-- This should FAIL with RLS policy error
-- INSERT INTO public.jobs (
--   customer_id,
--   scheduled_date,
--   status
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000'::uuid, -- Fake customer ID
--   CURRENT_DATE + INTERVAL '7 days',
--   'pending'
-- );

-- ============================================================================
-- SUMMARY: Check current user context
-- ============================================================================

SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ Authenticated'
    ELSE '❌ Not authenticated'
  END as auth_status;
