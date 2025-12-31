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