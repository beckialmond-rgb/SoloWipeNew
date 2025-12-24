-- Create leads table for email capture forms (newsletter, tips, etc.)
-- This table stores email addresses from landing page forms
-- GDPR compliant: includes consent tracking and unsubscribe capability

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'landing_page' CHECK (source IN ('landing_page', 'newsletter', 'tips', 'exit_intent')),
  variant TEXT, -- 'banner', 'inline', 'modal' - which form variant was used
  consent_given BOOLEAN NOT NULL DEFAULT true,
  subscribed BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  metadata JSONB, -- Store additional info like referrer, user agent, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Index for active subscribers
CREATE INDEX IF NOT EXISTS idx_leads_subscribed ON public.leads(subscribed) WHERE subscribed = true;

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous inserts (for landing page forms)
-- This allows unauthenticated users to submit their email
CREATE POLICY "Allow anonymous inserts for leads"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only allow viewing leads with service role (admin access)
-- Regular users cannot view leads for privacy
CREATE POLICY "Service role can view all leads"
  ON public.leads FOR SELECT
  TO service_role
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.leads IS 'Stores email addresses captured from landing page forms. GDPR compliant with consent tracking.';
COMMENT ON COLUMN public.leads.source IS 'Where the email was captured: landing_page, newsletter, tips, exit_intent';
COMMENT ON COLUMN public.leads.consent_given IS 'User has given consent to receive emails (GDPR requirement)';
COMMENT ON COLUMN public.leads.subscribed IS 'User is currently subscribed (can be unsubscribed)';

