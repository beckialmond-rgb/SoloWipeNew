# Step-by-Step Migration Fix

Your Supabase project ID is: `owqjyaiptexqwafzmcwy`

## Step 1: First, Run This Diagnostic Query

Go to **Supabase Dashboard** → **SQL Editor** → **New Query**, paste this:

```sql
-- Check what database you're connected to and what columns exist
SELECT current_database() as database_name;

SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers'
ORDER BY column_name;
```

This shows:
- What database you're connected to
- All columns that DO exist in the customers table

**Run this and tell me what you see!**

---

## Step 2: Try the Migration with Better Error Handling

If the diagnostic shows you're in the right place, try this version of the migration:

```sql
-- Try migration with explicit error handling
DO $$
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'customers' 
      AND column_name = 'preferred_payment_method'
  ) THEN
    -- Add the column
    ALTER TABLE public.customers
    ADD COLUMN preferred_payment_method TEXT;
    
    -- Add the constraint
    ALTER TABLE public.customers
    ADD CONSTRAINT check_preferred_payment_method 
    CHECK (preferred_payment_method IN ('gocardless', 'cash', 'transfer') OR preferred_payment_method IS NULL);
    
    RAISE NOTICE 'Column added successfully';
  ELSE
    RAISE NOTICE 'Column already exists';
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_customers_preferred_payment_method 
ON public.customers(preferred_payment_method);

-- Verify
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers' 
  AND column_name = 'preferred_payment_method';
```

---

## Step 3: Check Your Dashboard URL

Make sure you're in the correct Supabase project:
- Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy
- This should be your project dashboard

---

## What to Share

After running Step 1, please share:
1. What database name it shows
2. What columns it lists (especially do you see `gocardless_id`, `gocardless_mandate_status`, `notes`, etc.?)
3. Any error messages if the migration fails





