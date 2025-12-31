-- ============================================================================
-- PHASE 9: Expenses Table
-- ============================================================================
-- Business owner expense tracking with receipt photos and job linking

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN ('cleaning_supplies', 'fuel', 'equipment', 'misc')),
  date DATE NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Owners can view their expenses" ON public.expenses;
CREATE POLICY "Owners can view their expenses"
  ON public.expenses FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can insert their expenses" ON public.expenses;
CREATE POLICY "Owners can insert their expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update their expenses" ON public.expenses;
CREATE POLICY "Owners can update their expenses"
  ON public.expenses FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete their expenses" ON public.expenses;
CREATE POLICY "Owners can delete their expenses"
  ON public.expenses FOR DELETE
  USING (owner_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_owner_date ON public.expenses(owner_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_job ON public.expenses(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

