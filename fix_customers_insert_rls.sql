-- Fix RLS policy for INSERT on customers table
-- This ensures authenticated users can insert customers with their own profile_id

-- First, drop the existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;

-- Create/Recreate the INSERT policy for customers
-- This allows authenticated users to insert customers where profile_id matches their auth.uid()
CREATE POLICY "Users can insert their own customers"
  ON public.customers 
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
  );

-- Verify RLS is enabled on the customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Optional: Check existing policies (for debugging)
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'customers';
