-- Add payment tracking columns to jobs table
ALTER TABLE public.jobs
ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid',
ADD COLUMN payment_method text,
ADD COLUMN payment_date timestamp with time zone,
ADD COLUMN invoice_number text;

-- Add index for querying unpaid jobs efficiently
CREATE INDEX idx_jobs_payment_status ON public.jobs(payment_status);

-- Update existing completed jobs: mark GoCardless customers as paid
UPDATE public.jobs j
SET payment_status = 'paid',
    payment_method = 'gocardless'
FROM public.customers c
WHERE j.customer_id = c.id
  AND j.status = 'completed'
  AND c.gocardless_id IS NOT NULL;