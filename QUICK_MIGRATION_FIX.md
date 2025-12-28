# QUICK FIX: Run Migration Now

## The Problem
You ran the **verification query** which checks if the column exists. Since it returned "no rows", that means **the migration hasn't been run yet**.

## The Solution
Run the actual **migration SQL** (not the verification query).

---

## Copy This SQL and Run It:

```sql
-- Add preferred_payment_method column to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT 
CHECK (preferred_payment_method IN ('gocardless', 'cash', 'transfer') OR preferred_payment_method IS NULL);

-- Add index for queries filtering by preferred payment method
CREATE INDEX IF NOT EXISTS idx_customers_preferred_payment_method 
ON public.customers(preferred_payment_method);

-- Add comment to document the field
COMMENT ON COLUMN public.customers.preferred_payment_method IS 'Customer preferred payment method: gocardless (Direct Debit), cash, or transfer (Bank Transfer). Nullable. Does not affect auto-collection logic - mandate status is always checked first.';
```

---

## Where to Run It:

1. **Supabase Dashboard** → **SQL Editor** → **New Query**
2. Paste the SQL above
3. Click **Run** (or Cmd/Ctrl + Enter)
4. Should see "Success. No rows returned" ✅

---

## Then:

1. **Hard refresh browser** (Cmd+Shift+R or Ctrl+Shift+R)
2. **Or close/reopen incognito window**
3. Try adding/updating a customer - should work! ✅





