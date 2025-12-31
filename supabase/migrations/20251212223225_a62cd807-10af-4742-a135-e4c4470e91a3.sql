-- Add notes column to customers table for gate codes, pet warnings, special instructions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'customers' AND column_name = 'notes') THEN
    ALTER TABLE public.customers ADD COLUMN notes TEXT;
  END IF;
END $$;