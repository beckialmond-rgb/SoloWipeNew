-- Add notes column to jobs table for per-visit notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'notes') THEN
    ALTER TABLE public.jobs ADD COLUMN notes TEXT;
  END IF;
END $$;;