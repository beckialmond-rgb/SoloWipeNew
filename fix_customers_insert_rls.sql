-- Fix RLS policy for INSERT on customers table
-- This ensures authenticated users can insert customers with their own profile_id

-- Drop the existing policy if it exists (to recreate it cleanly)
DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;

-- Create the INSERT policy for authenticated users
-- This allows users to insert customers where profile_id matches their auth.uid()
CREATE POLICY "Users can insert their own customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'customers' AND policyname = 'Users can insert their own customers';
