-- schema.sql
-- Generated from repo migrations + inferred app usage.
-- Target: fresh Supabase project (Postgres).
--
-- Includes:
-- - public tables: profiles, customers, jobs
-- - trigger: public.handle_new_user() on auth.users
-- - storage bucket + RLS policies for job photos (bucket: job-photos)
-- - RLS policies for app tables
-- - indexes used by the app + additional performance indexes

BEGIN;

-- Extensions (Supabase usually has pgcrypto; keep idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT 'My Window Cleaning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Review link
  google_review_link TEXT,

  -- Stripe subscription fields
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  subscription_ends_at TIMESTAMPTZ,

  -- GoCardless connection fields
  gocardless_access_token_encrypted TEXT,
  gocardless_organisation_id TEXT,
  gocardless_connected_at TIMESTAMPTZ
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  mobile_phone TEXT,
  price NUMERIC NOT NULL DEFAULT 20,
  frequency_weeks INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- GoCardless customer/mandate fields
  gocardless_id TEXT,
  gocardless_mandate_status TEXT,

  -- Notes + archival
  notes TEXT,
  archived_at TIMESTAMPTZ DEFAULT NULL,

  -- Route optimization (geocoding)
  latitude NUMERIC,
  longitude NUMERIC,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),

  completed_at TIMESTAMPTZ,
  amount_collected NUMERIC,

  -- Notes + archival
  notes TEXT,
  cancelled_at TIMESTAMPTZ DEFAULT NULL,

  -- Evidence photo URL (storage path or public URL depending on app usage)
  photo_url TEXT,

  -- Payment tracking
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT,
  payment_date TIMESTAMPTZ,
  invoice_number TEXT,

  -- GoCardless payment tracking
  gocardless_payment_id TEXT,
  gocardless_payment_status TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- RLS ENABLE
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (public)
-- ============================================================================

-- profiles
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

-- customers
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
CREATE POLICY "Users can view their own customers"
  ON public.customers FOR SELECT
  USING (profile_id = auth.uid());

-- NOTE: include TO authenticated (matches fix migration)
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

-- jobs (scoped via customer ownership)
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

-- ============================================================================
-- AUTH → PROFILE AUTO-CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'business_name', 'My Window Cleaning')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STORAGE: job photos bucket + RLS
-- ============================================================================

-- Create bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Ensure storage.objects RLS is enabled (Supabase defaults to enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policies: enforce folder structure {userId}/{filename}
DROP POLICY IF EXISTS "Users can view job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own job photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own job photos" ON storage.objects;

CREATE POLICY "Users can view their own job photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own job photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own job photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'job-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- INDEXES (migrations + phase7 performance)
-- ============================================================================

-- Migration indexes
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON public.jobs(payment_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_gocardless_connected
  ON public.profiles(gocardless_organisation_id)
  WHERE gocardless_organisation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_gocardless_mandate_status ON public.customers(gocardless_mandate_status);
CREATE INDEX IF NOT EXISTS idx_jobs_gocardless_payment_id ON public.jobs(gocardless_payment_id);

-- Phase 7 indexes
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_customers_profile_id ON public.customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON public.jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_status_date ON public.jobs(customer_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_completed_at ON public.jobs(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_unpaid ON public.jobs(payment_status, status)
  WHERE payment_status = 'unpaid' AND status = 'completed';
CREATE INDEX IF NOT EXISTS idx_customers_name_search
  ON public.customers USING gin(to_tsvector('english', name || ' ' || COALESCE(address, '')));
CREATE INDEX IF NOT EXISTS idx_customers_mobile_phone
  ON public.customers(mobile_phone) WHERE mobile_phone IS NOT NULL;

COMMIT;
