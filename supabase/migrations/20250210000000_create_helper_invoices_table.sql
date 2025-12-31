-- ============================================================================
-- STEP 4: Helper Invoice Service - Database Schema
-- ============================================================================
-- Creates helper_invoices table to track monthly billing invoices for helpers
-- Each invoice represents a billing period and lists all active helpers during that period

CREATE TABLE IF NOT EXISTS public.helper_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  helper_count INTEGER NOT NULL CHECK (helper_count >= 0),
  stripe_invoice_id TEXT, -- Links to Stripe invoice if available
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (billing_period_end > billing_period_start)
);

-- Create helper_invoice_items table to track individual helper charges
CREATE TABLE IF NOT EXISTS public.helper_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.helper_invoices(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  helper_name TEXT, -- Denormalized for historical record
  billing_start_date DATE NOT NULL,
  billing_end_date DATE, -- NULL if still active
  days_billed INTEGER NOT NULL CHECK (days_billed > 0),
  monthly_rate NUMERIC NOT NULL DEFAULT 5.00 CHECK (monthly_rate > 0),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, team_member_id)
);

-- Enable RLS
ALTER TABLE public.helper_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helper_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for helper_invoices
DROP POLICY IF EXISTS "Owners can view their helper invoices" ON public.helper_invoices;
CREATE POLICY "Owners can view their helper invoices"
  ON public.helper_invoices FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can insert their helper invoices" ON public.helper_invoices;
CREATE POLICY "Owners can insert their helper invoices"
  ON public.helper_invoices FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- RLS Policies for helper_invoice_items
DROP POLICY IF EXISTS "Owners can view their helper invoice items" ON public.helper_invoice_items;
CREATE POLICY "Owners can view their helper invoice items"
  ON public.helper_invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_invoice_items.invoice_id
        AND helper_invoices.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can insert their helper invoice items" ON public.helper_invoice_items;
CREATE POLICY "Owners can insert their helper invoice items"
  ON public.helper_invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_invoice_items.invoice_id
        AND helper_invoices.owner_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_helper_invoices_owner_period 
  ON public.helper_invoices(owner_id, billing_period_start DESC, billing_period_end DESC);

CREATE INDEX IF NOT EXISTS idx_helper_invoices_owner_created 
  ON public.helper_invoices(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_helper_invoices_stripe_invoice 
  ON public.helper_invoices(stripe_invoice_id) 
  WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_helper_invoice_items_invoice 
  ON public.helper_invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_helper_invoice_items_team_member 
  ON public.helper_invoice_items(team_member_id);

-- Column comments
COMMENT ON TABLE public.helper_invoices IS 
  'Stores monthly billing invoices for helper charges. Each invoice represents a billing period and contains the total amount charged for active helpers during that period.';

COMMENT ON TABLE public.helper_invoice_items IS 
  'Stores individual helper charges within an invoice. Tracks which helpers were active during the billing period and calculates prorated charges.';

COMMENT ON COLUMN public.helper_invoices.invoice_number IS 
  'Unique invoice number in format: HELPER-YYYY-MM-XXXXXX';

COMMENT ON COLUMN public.helper_invoices.billing_period_start IS 
  'Start date of the billing period (typically first day of month)';

COMMENT ON COLUMN public.helper_invoices.billing_period_end IS 
  'End date of the billing period (typically last day of month)';

COMMENT ON COLUMN public.helper_invoices.total_amount IS 
  'Total amount charged for all helpers during this billing period (£5/month per helper, prorated)';

COMMENT ON COLUMN public.helper_invoices.helper_count IS 
  'Number of helpers that were active during this billing period';

COMMENT ON COLUMN public.helper_invoice_items.days_billed IS 
  'Number of days this helper was active during the billing period';

COMMENT ON COLUMN public.helper_invoice_items.amount IS 
  'Prorated amount charged for this helper (monthly_rate * days_billed / days_in_month)';

