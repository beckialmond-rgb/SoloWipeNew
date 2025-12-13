-- Add mandate status tracking to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gocardless_mandate_status text;

-- Add payment tracking to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gocardless_payment_id text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gocardless_payment_status text;

-- Add index for mandate status queries
CREATE INDEX IF NOT EXISTS idx_customers_gocardless_mandate_status ON customers(gocardless_mandate_status);
CREATE INDEX IF NOT EXISTS idx_jobs_gocardless_payment_id ON jobs(gocardless_payment_id);