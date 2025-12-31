-- ============================================================================
-- Helper Invoicing & Payment System - Complete Database Schema
-- ============================================================================
-- Date: 2025-02-11
-- Description: Complete invoicing and payment tracking system for helpers
-- HMRC-safe, accountant-friendly, subcontractor-compliant
--
-- This migration creates:
-- 1. helper_invoices - Main invoice table
-- 2. helper_invoice_items - Line items (jobs) per invoice
-- 3. helper_payments - Payment records linked to invoices
-- 4. helper_invoice_audit_log - Audit trail for HMRC compliance
--
-- Invoice Status Flow: draft → issued → paid
-- Once issued, invoices are locked and cannot be modified
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. HELPER INVOICES TABLE
-- ============================================================================
-- Stores invoices for helper earnings per period (weekly or monthly)
-- Each invoice represents a billing period for a specific helper

CREATE TABLE IF NOT EXISTS public.helper_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership and helper identification
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Invoice identification
  invoice_number TEXT NOT NULL, -- Format: HELPER-{helper_id_short}-{period}-{sequence}
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Billing period
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Financial amounts
  subtotal NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  total_amount NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Payment tracking
  amount_paid NUMERIC NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  outstanding_balance NUMERIC NOT NULL DEFAULT 0 CHECK (outstanding_balance >= 0),
  
  -- Metadata
  notes TEXT, -- Optional notes for owner
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CHECK (period_end > period_start),
  CHECK (outstanding_balance = total_amount - amount_paid),
  UNIQUE(owner_id, helper_id, invoice_number)
);

-- ============================================================================
-- 2. HELPER INVOICE ITEMS TABLE
-- ============================================================================
-- Stores line items (jobs) for each invoice
-- Links completed jobs to invoices for detailed breakdown

CREATE TABLE IF NOT EXISTS public.helper_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invoice reference
  invoice_id UUID NOT NULL REFERENCES public.helper_invoices(id) ON DELETE CASCADE,
  
  -- Job reference (immutable link to completed job)
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
  
  -- Line item details (denormalized for historical accuracy)
  job_date DATE NOT NULL, -- Date job was completed
  customer_name TEXT NOT NULL, -- Denormalized customer name
  job_amount NUMERIC NOT NULL CHECK (job_amount >= 0), -- Original job amount_collected
  helper_payment_amount NUMERIC NOT NULL CHECK (helper_payment_amount >= 0), -- Payment from helper_payment_amount field
  
  -- Line item metadata
  description TEXT, -- Optional description
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure each job appears only once per invoice
  UNIQUE(invoice_id, job_id)
);

-- ============================================================================
-- 3. HELPER PAYMENTS TABLE
-- ============================================================================
-- Stores payment records linked to invoices
-- Supports partial payments and multiple payments per invoice

CREATE TABLE IF NOT EXISTS public.helper_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invoice reference
  invoice_id UUID NOT NULL REFERENCES public.helper_invoices(id) ON DELETE CASCADE,
  
  -- Payment details
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'cheque', 'other')),
  payment_reference TEXT, -- Bank reference, cheque number, etc.
  amount NUMERIC NOT NULL CHECK (amount > 0),
  
  -- Metadata
  notes TEXT, -- Optional payment notes
  recorded_by_user_id UUID NOT NULL REFERENCES auth.users(id), -- Who recorded the payment
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. HELPER INVOICE AUDIT LOG TABLE
-- ============================================================================
-- HMRC-safe audit trail for all invoice and payment changes
-- Immutable log for compliance and debugging

CREATE TABLE IF NOT EXISTS public.helper_invoice_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What was changed
  invoice_id UUID REFERENCES public.helper_invoices(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.helper_payments(id) ON DELETE SET NULL,
  
  -- Change details
  action TEXT NOT NULL CHECK (action IN (
    'invoice_created',
    'invoice_issued',
    'invoice_paid',
    'invoice_cancelled',
    'invoice_updated',
    'payment_created',
    'payment_updated',
    'payment_deleted',
    'job_linked_to_invoice'
  )),
  
  -- Who made the change
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Change data (JSONB for flexibility)
  changes JSONB,
  
  -- When it happened
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Helper invoices indexes
CREATE INDEX IF NOT EXISTS idx_helper_invoices_owner ON public.helper_invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_helper_invoices_helper ON public.helper_invoices(helper_id);
CREATE INDEX IF NOT EXISTS idx_helper_invoices_status ON public.helper_invoices(status);
CREATE INDEX IF NOT EXISTS idx_helper_invoices_period ON public.helper_invoices(period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_helper_invoices_owner_helper_period ON public.helper_invoices(owner_id, helper_id, period_start DESC);

-- Invoice items indexes
CREATE INDEX IF NOT EXISTS idx_helper_invoice_items_invoice ON public.helper_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_helper_invoice_items_job ON public.helper_invoice_items(job_id);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_helper_payments_invoice ON public.helper_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_helper_payments_date ON public.helper_payments(payment_date DESC);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_helper_invoice_audit_invoice ON public.helper_invoice_audit_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_helper_invoice_audit_payment ON public.helper_invoice_audit_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_helper_invoice_audit_user ON public.helper_invoice_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_helper_invoice_audit_created ON public.helper_invoice_audit_log(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.helper_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helper_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helper_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helper_invoice_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: HELPER INVOICES
-- ============================================================================

-- Owners can view all invoices for their helpers
DROP POLICY IF EXISTS "Owners can view their helper invoices" ON public.helper_invoices;
CREATE POLICY "Owners can view their helper invoices"
  ON public.helper_invoices FOR SELECT
  USING (owner_id = auth.uid());

-- Helpers can view only their own invoices
DROP POLICY IF EXISTS "Helpers can view their own invoices" ON public.helper_invoices;
CREATE POLICY "Helpers can view their own invoices"
  ON public.helper_invoices FOR SELECT
  USING (helper_id = auth.uid());

-- Owners can create invoices for their helpers
DROP POLICY IF EXISTS "Owners can create helper invoices" ON public.helper_invoices;
CREATE POLICY "Owners can create helper invoices"
  ON public.helper_invoices FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owners can update invoices (only draft status)
DROP POLICY IF EXISTS "Owners can update draft invoices" ON public.helper_invoices;
CREATE POLICY "Owners can update draft invoices"
  ON public.helper_invoices FOR UPDATE
  USING (owner_id = auth.uid() AND status = 'draft')
  WITH CHECK (owner_id = auth.uid() AND status = 'draft');

-- ============================================================================
-- RLS POLICIES: HELPER INVOICE ITEMS
-- ============================================================================

-- Owners can view invoice items for their invoices
DROP POLICY IF EXISTS "Owners can view their invoice items" ON public.helper_invoice_items;
CREATE POLICY "Owners can view their invoice items"
  ON public.helper_invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_invoice_items.invoice_id
        AND helper_invoices.owner_id = auth.uid()
    )
  );

-- Helpers can view invoice items for their invoices
DROP POLICY IF EXISTS "Helpers can view their invoice items" ON public.helper_invoice_items;
CREATE POLICY "Helpers can view their invoice items"
  ON public.helper_invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_invoice_items.invoice_id
        AND helper_invoices.helper_id = auth.uid()
    )
  );

-- Owners can create invoice items for their invoices
DROP POLICY IF EXISTS "Owners can create invoice items" ON public.helper_invoice_items;
CREATE POLICY "Owners can create invoice items"
  ON public.helper_invoice_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_invoice_items.invoice_id
        AND helper_invoices.owner_id = auth.uid()
        AND helper_invoices.status = 'draft'
    )
  );

-- ============================================================================
-- RLS POLICIES: HELPER PAYMENTS
-- ============================================================================

-- Owners can view payments for their invoices
DROP POLICY IF EXISTS "Owners can view their helper payments" ON public.helper_payments;
CREATE POLICY "Owners can view their helper payments"
  ON public.helper_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_payments.invoice_id
        AND helper_invoices.owner_id = auth.uid()
    )
  );

-- Helpers can view payments for their invoices
DROP POLICY IF EXISTS "Helpers can view their payments" ON public.helper_payments;
CREATE POLICY "Helpers can view their payments"
  ON public.helper_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_payments.invoice_id
        AND helper_invoices.helper_id = auth.uid()
    )
  );

-- Owners can create payments for their invoices
DROP POLICY IF EXISTS "Owners can create helper payments" ON public.helper_payments;
CREATE POLICY "Owners can create helper payments"
  ON public.helper_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_payments.invoice_id
        AND helper_invoices.owner_id = auth.uid()
        AND helper_invoices.status IN ('issued', 'paid')
    )
    AND recorded_by_user_id = auth.uid()
  );

-- Owners can update payments (for corrections)
DROP POLICY IF EXISTS "Owners can update helper payments" ON public.helper_payments;
CREATE POLICY "Owners can update helper payments"
  ON public.helper_payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_payments.invoice_id
        AND helper_invoices.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_payments.invoice_id
        AND helper_invoices.owner_id = auth.uid()
    )
  );

-- Owners can delete payments (for corrections)
DROP POLICY IF EXISTS "Owners can delete helper payments" ON public.helper_payments;
CREATE POLICY "Owners can delete helper payments"
  ON public.helper_payments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_payments.invoice_id
        AND helper_invoices.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES: HELPER INVOICE AUDIT LOG
-- ============================================================================

-- Owners can view audit logs for their invoices
DROP POLICY IF EXISTS "Owners can view their audit logs" ON public.helper_invoice_audit_log;
CREATE POLICY "Owners can view their audit logs"
  ON public.helper_invoice_audit_log FOR SELECT
  USING (
    invoice_id IS NULL OR EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_invoice_audit_log.invoice_id
        AND helper_invoices.owner_id = auth.uid()
    )
  );

-- Helpers can view audit logs for their invoices
DROP POLICY IF EXISTS "Helpers can view their audit logs" ON public.helper_invoice_audit_log;
CREATE POLICY "Helpers can view their audit logs"
  ON public.helper_invoice_audit_log FOR SELECT
  USING (
    invoice_id IS NULL OR EXISTS (
      SELECT 1 FROM public.helper_invoices
      WHERE helper_invoices.id = helper_invoice_audit_log.invoice_id
        AND helper_invoices.helper_id = auth.uid()
    )
  );

-- System can create audit logs (via functions)
DROP POLICY IF EXISTS "System can create audit logs" ON public.helper_invoice_audit_log;
CREATE POLICY "System can create audit logs"
  ON public.helper_invoice_audit_log FOR INSERT
  WITH CHECK (true); -- Allow all inserts (functions will set user_id)

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_helper_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for helper_invoices
DROP TRIGGER IF EXISTS update_helper_invoices_updated_at ON public.helper_invoices;
CREATE TRIGGER update_helper_invoices_updated_at
  BEFORE UPDATE ON public.helper_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_helper_invoice_updated_at();

-- Trigger for helper_payments
DROP TRIGGER IF EXISTS update_helper_payments_updated_at ON public.helper_payments;
CREATE TRIGGER update_helper_payments_updated_at
  BEFORE UPDATE ON public.helper_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_helper_invoice_updated_at();

-- Function to update invoice payment totals when payment changes
CREATE OR REPLACE FUNCTION update_invoice_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC;
  v_invoice_total NUMERIC;
BEGIN
  -- Calculate total payments for the invoice
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.helper_payments
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- Get invoice total
  SELECT total_amount INTO v_invoice_total
  FROM public.helper_invoices
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- Update invoice payment totals
  UPDATE public.helper_invoices
  SET 
    amount_paid = v_total_paid,
    outstanding_balance = v_invoice_total - v_total_paid,
    paid_at = CASE 
      WHEN v_total_paid >= v_invoice_total AND v_total_paid > 0 THEN COALESCE(paid_at, now())
      ELSE NULL
    END,
    status = CASE
      WHEN v_total_paid >= v_invoice_total AND v_total_paid > 0 THEN 'paid'
      WHEN v_total_paid > 0 AND status = 'issued' THEN 'issued' -- Keep issued if partially paid
      WHEN v_total_paid = 0 AND status = 'paid' THEN 'issued' -- Revert to issued if payment removed
      ELSE status
    END
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update invoice totals when payment is created/updated/deleted
DROP TRIGGER IF EXISTS update_invoice_on_payment_change ON public.helper_payments;
CREATE TRIGGER update_invoice_on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.helper_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_payment_totals();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.helper_invoices IS 
  'Stores invoices for helper earnings. Each invoice represents a billing period (weekly or monthly) and contains line items for completed jobs. Status flow: draft → issued → paid. Once issued, invoices are locked.';

COMMENT ON TABLE public.helper_invoice_items IS 
  'Stores line items (jobs) for each invoice. Links completed jobs to invoices for detailed breakdown. Denormalized fields ensure historical accuracy even if job data changes.';

COMMENT ON TABLE public.helper_payments IS 
  'Stores payment records linked to invoices. Supports partial payments and multiple payments per invoice. Only owners can record payments.';

COMMENT ON TABLE public.helper_invoice_audit_log IS 
  'HMRC-safe audit trail for all invoice and payment changes. Immutable log for compliance and debugging.';

COMMENT ON COLUMN public.helper_invoices.invoice_number IS 
  'Unique invoice number per helper. Format: HELPER-{helper_id_short}-{period}-{sequence}';

COMMENT ON COLUMN public.helper_invoices.status IS 
  'Invoice status: draft (can be modified), issued (locked, can receive payments), paid (fully paid), cancelled (voided)';

COMMENT ON COLUMN public.helper_invoices.outstanding_balance IS 
  'Calculated as total_amount - amount_paid. Automatically updated when payments are added/removed.';

COMMENT ON COLUMN public.helper_invoice_items.job_id IS 
  'Reference to completed job. Uses ON DELETE RESTRICT to prevent deletion of jobs that are invoiced.';

COMMENT ON COLUMN public.helper_invoice_items.helper_payment_amount IS 
  'Payment amount from job.helper_payment_amount field, stored for historical accuracy.';

COMMENT ON COLUMN public.helper_payments.payment_method IS 
  'Payment method: bank_transfer, cash, cheque, or other.';

COMMENT ON COLUMN public.helper_payments.recorded_by_user_id IS 
  'User who recorded the payment (always the owner).';

COMMIT;

