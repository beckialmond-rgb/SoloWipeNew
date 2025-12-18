-- Complete Database Setup
-- This file contains all migrations combined in order
-- Run this in Supabase SQL Editor to set up your entire database

-- ============================================================================
-- INITIAL SCHEMA SETUP (Migration: 20251210091122)
-- ============================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT 'My Window Cleaning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  mobile_phone TEXT,
  price NUMERIC NOT NULL DEFAULT 20,
  frequency_weeks INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  gocardless_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at TIMESTAMPTZ,
  amount_collected NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Customers policies
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
CREATE POLICY "Users can view their own customers"
  ON public.customers FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own customers" ON public.customers;
CREATE POLICY "Users can insert their own customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own customers" ON public.customers;
CREATE POLICY "Users can update their own customers"
  ON public.customers FOR UPDATE
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own customers" ON public.customers;
CREATE POLICY "Users can delete their own customers"
  ON public.customers FOR DELETE
  USING (profile_id = auth.uid());

-- Jobs policies (through customer ownership)
DROP POLICY IF EXISTS "Users can view jobs for their customers" ON public.jobs;
CREATE POLICY "Users can view jobs for their customers"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert jobs for their customers" ON public.jobs;
CREATE POLICY "Users can insert jobs for their customers"
  ON public.jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update jobs for their customers" ON public.jobs;
CREATE POLICY "Users can update jobs for their customers"
  ON public.jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete jobs for their customers" ON public.jobs;
CREATE POLICY "Users can delete jobs for their customers"
  ON public.jobs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = jobs.customer_id
      AND customers.profile_id = auth.uid()
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'business_name', 'My Window Cleaning'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ADDITIONAL COLUMNS (Migration: 20251212223225)
-- ============================================================================

-- Add notes column to customers table for gate codes, pet warnings, special instructions
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- ADDITIONAL COLUMNS (Migration: 20251212224139)
-- ============================================================================

-- Add notes column to jobs table for per-visit notes
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================================
-- ADDITIONAL COLUMNS (Migration: 20251212230840)
-- ============================================================================

-- Add archived_at timestamp to track when customers were archived
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone DEFAULT NULL;

-- Add cancelled_at to jobs for soft-delete when archiving customers
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone DEFAULT NULL;

-- ============================================================================
-- ADDITIONAL COLUMNS (Migration: 20251212231916)
-- ============================================================================

-- Add photo evidence support to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS photo_url text;

-- Add Google review link to profiles for review requests
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_review_link text;

-- Add geocoding support for route optimization
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS longitude numeric;

-- ============================================================================
-- STORAGE SETUP (Migration: 20251212233308)
-- ============================================================================

-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own job photos" ON storage.objects;

-- Create new owner-scoped policies using folder structure {userId}/{filename}
CREATE POLICY "Users can view their own job photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'job-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own job photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own job photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'job-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- SUBSCRIPTION FIELDS (Migration: 20251213122118)
-- ============================================================================

-- Stripe subscription fields (for user's app subscription)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

-- GoCardless connection fields (for user to collect from their customers)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gocardless_access_token_encrypted text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gocardless_organisation_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gocardless_connected_at timestamptz;

-- Index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);

-- Index for finding users with GoCardless connected
CREATE INDEX IF NOT EXISTS idx_profiles_gocardless_connected ON public.profiles(gocardless_organisation_id) WHERE gocardless_organisation_id IS NOT NULL;

-- ============================================================================
-- GOCARDLESS PAYMENT TRACKING (Migration: 20251213201930)
-- ============================================================================

-- Add mandate status tracking to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gocardless_mandate_status text;

-- Add payment tracking to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS gocardless_payment_id text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS gocardless_payment_status text;

-- Add index for mandate status queries
CREATE INDEX IF NOT EXISTS idx_customers_gocardless_mandate_status ON public.customers(gocardless_mandate_status);
CREATE INDEX IF NOT EXISTS idx_jobs_gocardless_payment_id ON public.jobs(gocardless_payment_id);

-- ============================================================================
-- PAYMENT STATUS TRACKING (Migration: 20251214203142)
-- ============================================================================

-- Add payment tracking columns to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS invoice_number text;

-- Add index for querying unpaid jobs efficiently
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON public.jobs(payment_status);

-- Update existing completed jobs: mark GoCardless customers as paid
UPDATE public.jobs j
SET payment_status = 'paid',
    payment_method = 'gocardless'
FROM public.customers c
WHERE j.customer_id = c.id
  AND j.status = 'completed'
  AND c.gocardless_id IS NOT NULL
  AND j.payment_status = 'unpaid';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables were created
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
ORDER BY tablename;

-- Verify RLS policies on customers table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'customers'
ORDER BY policyname;
