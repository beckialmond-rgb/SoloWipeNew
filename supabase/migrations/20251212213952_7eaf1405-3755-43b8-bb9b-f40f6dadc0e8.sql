-- Add payment tracking columns to jobs table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'payment_status') THEN
    ALTER TABLE public.jobs ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'payment_method') THEN
    ALTER TABLE public.jobs ADD COLUMN payment_method text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'payment_date') THEN
    ALTER TABLE public.jobs ADD COLUMN payment_date timestamp with time zone;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'invoice_number') THEN
    ALTER TABLE public.jobs ADD COLUMN invoice_number text;
  END IF;
END $$;

-- Add index for querying unpaid jobs efficiently
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON public.jobs(payment_status);

-- Update existing completed jobs: mark GoCardless customers as paid
UPDATE public.jobs j
SET payment_status = 'paid',
    payment_method = 'gocardless'
FROM public.customers c
WHERE j.customer_id = c.id
  AND j.status = 'completed'
  AND c.gocardless_id IS NOT NULL;