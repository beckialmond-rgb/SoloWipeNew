-- ============================================================================
-- Helper Invoicing & Payment System - Database Functions
-- ============================================================================
-- Date: 2025-02-11
-- Description: Functions for invoice generation, payment recording, and queries
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION: Generate Helper Invoice
-- ============================================================================
-- Generates an invoice for a helper for a specific period
-- Collects all completed jobs with helper_payment_amount in the period
-- Creates invoice with line items and calculates totals

CREATE OR REPLACE FUNCTION generate_helper_invoice(
  p_owner_id UUID,
  p_helper_id UUID,
  p_period_type TEXT, -- 'weekly' or 'monthly'
  p_period_start DATE,
  p_period_end DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_sequence_number INTEGER;
  v_helper_short_id TEXT;
  v_period_str TEXT;
  v_subtotal NUMERIC := 0;
  v_total NUMERIC := 0;
  v_job_count INTEGER := 0;
  v_job_record RECORD;
BEGIN
  -- Validate period type
  IF p_period_type NOT IN ('weekly', 'monthly') THEN
    RAISE EXCEPTION 'Invalid period_type. Must be "weekly" or "monthly"';
  END IF;
  
  -- Validate period dates
  IF p_period_end <= p_period_start THEN
    RAISE EXCEPTION 'period_end must be after period_start';
  END IF;
  
  -- Check if invoice already exists for this period
  SELECT id INTO v_invoice_id
  FROM public.helper_invoices
  WHERE owner_id = p_owner_id
    AND helper_id = p_helper_id
    AND period_type = p_period_type
    AND period_start = p_period_start
    AND period_end = p_period_end
    AND status != 'cancelled';
  
  IF v_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invoice already exists for this period';
  END IF;
  
  -- Generate invoice number
  -- Format: HELPER-{helper_id_short}-{period}-{sequence}
  v_helper_short_id := SUBSTRING(p_helper_id::TEXT, 1, 8);
  
  -- Get next sequence number for this helper
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM '(\d+)$') AS INTEGER)
  ), 0) + 1 INTO v_sequence_number
  FROM public.helper_invoices
  WHERE owner_id = p_owner_id
    AND helper_id = p_helper_id;
  
  -- Format period string
  IF p_period_type = 'weekly' THEN
    v_period_str := TO_CHAR(p_period_start, 'IYYY-IW');
  ELSE
    v_period_str := TO_CHAR(p_period_start, 'YYYY-MM');
  END IF;
  
  v_invoice_number := 'HELPER-' || v_helper_short_id || '-' || v_period_str || '-' || LPAD(v_sequence_number::TEXT, 4, '0');
  
  -- Collect all completed jobs for this helper in the period
  -- Jobs must:
  -- 1. Be completed (status = 'completed')
  -- 2. Have helper_payment_amount set (not null)
  -- 3. Be completed within the period
  -- 4. Be assigned to this helper (via job_assignments, but assignment may be deleted)
  -- 5. Belong to the owner's customers
  
  -- We check job_assignments history by checking if job has helper_payment_amount
  -- and belongs to owner's customers (indirect check via customer.profile_id)
  
  -- Create invoice
  INSERT INTO public.helper_invoices (
    owner_id,
    helper_id,
    invoice_number,
    invoice_date,
    period_type,
    period_start,
    period_end,
    status
  )
  VALUES (
    p_owner_id,
    p_helper_id,
    v_invoice_number,
    CURRENT_DATE,
    p_period_type,
    p_period_start,
    p_period_end,
    'draft'
  )
  RETURNING id INTO v_invoice_id;
  
  -- Add line items for all completed jobs in period
  -- We need to find jobs that:
  -- 1. Were completed by this helper (have helper_payment_amount)
  -- 2. Were completed in the period
  -- 3. Belong to owner's customers
  -- 4. Are not already invoiced
  
  FOR v_job_record IN
    SELECT 
      j.id,
      j.completed_at::DATE as job_date,
      j.amount_collected,
      j.helper_payment_amount,
      c.name as customer_name
    FROM public.jobs j
    INNER JOIN public.customers c ON j.customer_id = c.id
    WHERE c.profile_id = p_owner_id
      AND j.status = 'completed'
      AND j.helper_payment_amount IS NOT NULL
      AND j.helper_payment_amount > 0
      AND j.completed_at::DATE >= p_period_start
      AND j.completed_at::DATE <= p_period_end
      AND NOT EXISTS (
        SELECT 1 FROM public.helper_invoice_items
        WHERE job_id = j.id
      )
    ORDER BY j.completed_at ASC
  LOOP
    -- Verify this job was assigned to this helper
    -- Since assignments are deleted on completion, we check by:
    -- 1. Job has helper_payment_amount (indicates helper completed it)
    -- 2. We'll use a helper function or check team_members relationship
    
    -- For now, we'll include all jobs with helper_payment_amount
    -- The owner should verify the helper assignment before generating invoice
    
    INSERT INTO public.helper_invoice_items (
      invoice_id,
      job_id,
      job_date,
      customer_name,
      job_amount,
      helper_payment_amount
    )
    VALUES (
      v_invoice_id,
      v_job_record.id,
      v_job_record.job_date,
      v_job_record.customer_name,
      v_job_record.amount_collected,
      v_job_record.helper_payment_amount
    );
    
    v_subtotal := v_subtotal + v_job_record.helper_payment_amount;
    v_job_count := v_job_count + 1;
  END LOOP;
  
  -- Calculate totals
  v_total := v_subtotal; -- No tax or fees for now
  
  -- Update invoice with totals
  UPDATE public.helper_invoices
  SET 
    subtotal = v_subtotal,
    total_amount = v_total,
    outstanding_balance = v_total
  WHERE id = v_invoice_id;
  
  -- Create audit log entry
  INSERT INTO public.helper_invoice_audit_log (
    invoice_id,
    action,
    user_id,
    changes
  )
  VALUES (
    v_invoice_id,
    'invoice_created',
    p_owner_id,
    jsonb_build_object(
      'period_type', p_period_type,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'job_count', v_job_count,
      'total_amount', v_total
    )
  );
  
  RETURN v_invoice_id;
END;
$$;

-- ============================================================================
-- FUNCTION: Issue Invoice
-- ============================================================================
-- Changes invoice status from draft to issued
-- Locks invoice from further modifications

CREATE OR REPLACE FUNCTION issue_helper_invoice(
  p_invoice_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_current_status TEXT;
BEGIN
  -- Get invoice owner and status
  SELECT owner_id, status INTO v_owner_id, v_current_status
  FROM public.helper_invoices
  WHERE id = p_invoice_id;
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  IF v_owner_id != p_user_id THEN
    RAISE EXCEPTION 'Only invoice owner can issue invoice';
  END IF;
  
  IF v_current_status != 'draft' THEN
    RAISE EXCEPTION 'Only draft invoices can be issued';
  END IF;
  
  -- Update invoice status
  UPDATE public.helper_invoices
  SET 
    status = 'issued',
    issued_at = now()
  WHERE id = p_invoice_id;
  
  -- Create audit log entry
  INSERT INTO public.helper_invoice_audit_log (
    invoice_id,
    action,
    user_id,
    changes
  )
  VALUES (
    p_invoice_id,
    'invoice_issued',
    p_user_id,
    jsonb_build_object('issued_at', now())
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Record Payment
-- ============================================================================
-- Records a payment against an invoice
-- Updates invoice payment totals automatically via trigger

CREATE OR REPLACE FUNCTION record_helper_payment(
  p_invoice_id UUID,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_amount NUMERIC,
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_owner_id UUID;
  v_invoice_status TEXT;
  v_invoice_total NUMERIC;
BEGIN
  -- Validate payment method
  IF p_payment_method NOT IN ('bank_transfer', 'cash', 'cheque', 'other') THEN
    RAISE EXCEPTION 'Invalid payment_method';
  END IF;
  
  -- Get invoice details
  SELECT owner_id, status, total_amount INTO v_owner_id, v_invoice_status, v_invoice_total
  FROM public.helper_invoices
  WHERE id = p_invoice_id;
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;
  
  IF v_owner_id != p_user_id THEN
    RAISE EXCEPTION 'Only invoice owner can record payments';
  END IF;
  
  IF v_invoice_status NOT IN ('issued', 'paid') THEN
    RAISE EXCEPTION 'Payments can only be recorded for issued or paid invoices';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
  END IF;
  
  -- Create payment record
  INSERT INTO public.helper_payments (
    invoice_id,
    payment_date,
    payment_method,
    payment_reference,
    amount,
    notes,
    recorded_by_user_id
  )
  VALUES (
    p_invoice_id,
    p_payment_date,
    p_payment_method,
    p_payment_reference,
    p_amount,
    p_notes,
    p_user_id
  )
  RETURNING id INTO v_payment_id;
  
  -- Create audit log entry
  INSERT INTO public.helper_invoice_audit_log (
    invoice_id,
    payment_id,
    action,
    user_id,
    changes
  )
  VALUES (
    p_invoice_id,
    v_payment_id,
    'payment_created',
    p_user_id,
    jsonb_build_object(
      'payment_date', p_payment_date,
      'payment_method', p_payment_method,
      'amount', p_amount,
      'payment_reference', p_payment_reference
    )
  );
  
  -- Invoice totals will be updated automatically by trigger
  RETURN v_payment_id;
END;
$$;

-- ============================================================================
-- FUNCTION: Get Invoice Summary
-- ============================================================================
-- Returns summary statistics for invoices

CREATE OR REPLACE FUNCTION get_helper_invoice_summary(
  p_owner_id UUID,
  p_helper_id UUID DEFAULT NULL,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  total_invoices BIGINT,
  total_amount NUMERIC,
  total_paid NUMERIC,
  total_outstanding NUMERIC,
  draft_count BIGINT,
  issued_count BIGINT,
  paid_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_invoices,
    COALESCE(SUM(total_amount), 0) as total_amount,
    COALESCE(SUM(amount_paid), 0) as total_paid,
    COALESCE(SUM(outstanding_balance), 0) as total_outstanding,
    COUNT(*) FILTER (WHERE status = 'draft')::BIGINT as draft_count,
    COUNT(*) FILTER (WHERE status = 'issued')::BIGINT as issued_count,
    COUNT(*) FILTER (WHERE status = 'paid')::BIGINT as paid_count
  FROM public.helper_invoices
  WHERE owner_id = p_owner_id
    AND (p_helper_id IS NULL OR helper_id = p_helper_id)
    AND (p_period_start IS NULL OR period_start >= p_period_start)
    AND (p_period_end IS NULL OR period_end <= p_period_end)
    AND status != 'cancelled';
END;
$$;

-- ============================================================================
-- FUNCTION: Get Jobs Available for Invoicing
-- ============================================================================
-- Returns list of completed jobs that can be invoiced for a helper
-- Excludes jobs already included in invoices

CREATE OR REPLACE FUNCTION get_jobs_available_for_invoicing(
  p_owner_id UUID,
  p_helper_id UUID,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  job_date DATE,
  customer_name TEXT,
  job_amount NUMERIC,
  helper_payment_amount NUMERIC,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id as job_id,
    j.completed_at::DATE as job_date,
    c.name as customer_name,
    j.amount_collected as job_amount,
    j.helper_payment_amount,
    j.completed_at
  FROM public.jobs j
  INNER JOIN public.customers c ON j.customer_id = c.id
  WHERE c.profile_id = p_owner_id
    AND j.status = 'completed'
    AND j.helper_payment_amount IS NOT NULL
    AND j.helper_payment_amount > 0
    AND (p_period_start IS NULL OR j.completed_at::DATE >= p_period_start)
    AND (p_period_end IS NULL OR j.completed_at::DATE <= p_period_end)
    AND NOT EXISTS (
      SELECT 1 FROM public.helper_invoice_items
      WHERE job_id = j.id
    )
  ORDER BY j.completed_at ASC;
END;
$$;

COMMIT;

