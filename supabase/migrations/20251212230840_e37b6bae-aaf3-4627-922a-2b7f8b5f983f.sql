-- Add archived_at timestamp to track when customers were archived
ALTER TABLE public.customers 
ADD COLUMN archived_at timestamp with time zone DEFAULT NULL;

-- Add cancelled_at to jobs for soft-delete when archiving customers
ALTER TABLE public.jobs 
ADD COLUMN cancelled_at timestamp with time zone DEFAULT NULL;