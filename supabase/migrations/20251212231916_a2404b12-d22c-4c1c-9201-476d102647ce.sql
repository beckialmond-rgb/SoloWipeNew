-- Add photo evidence support to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS photo_url text;

-- Add Google review link to profiles for review requests
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_review_link text;

-- Add geocoding support for route optimization
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS longitude numeric;