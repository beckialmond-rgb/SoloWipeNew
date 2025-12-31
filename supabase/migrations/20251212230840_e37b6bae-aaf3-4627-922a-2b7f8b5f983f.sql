-- Add archived_at timestamp to track when customers were archived
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'archived_at') THEN
    ALTER TABLE public.customers ADD COLUMN archived_at timestamp with time zone DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'cancelled_at') THEN
    ALTER TABLE public.jobs ADD COLUMN cancelled_at timestamp with time zone DEFAULT NULL;
  END IF;
END $$;