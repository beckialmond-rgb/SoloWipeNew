# Run Preferred Payment Method Migration

## ⚠️ IMPORTANT: You Need to Run the Migration SQL

The verification query returned "no rows" because **the migration hasn't been applied yet**. You need to run the actual migration SQL.

## Steps to Run Migration

### 1. Open Supabase Dashboard
- Go to: https://app.supabase.com/
- Select your project

### 2. Open SQL Editor
- Click **SQL Editor** in the left sidebar
- Click **New Query** button

### 3. Copy and Paste This SQL

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

### 4. Run the SQL
- Click **Run** button (or press Cmd/Ctrl + Enter)
- You should see "Success. No rows returned" - this is CORRECT for ALTER TABLE statements

### 5. Verify It Worked
Run this verification query in a new query:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'customers' 
  AND column_name = 'preferred_payment_method';
```

**Expected Result:** You should see 1 row with:
- `column_name`: `preferred_payment_method`
- `data_type`: `text`
- `is_nullable`: `YES`

### 6. Clear Browser Cache
- **Hard refresh** your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
- Or close and reopen your incognito window
- This clears the Supabase client-side schema cache

## Why You're Seeing Cache Errors

The schema cache error happens because:
1. Your code is trying to use `preferred_payment_method` column
2. The column doesn't exist in the database yet
3. Supabase client cache also doesn't have it

**After running the migration and refreshing:**
- The column will exist in the database ✅
- Refreshing clears the client cache ✅
- Everything should work ✅

## Troubleshooting

### If Migration Fails
- Check for any error messages in the SQL Editor
- Make sure you're connected to the correct database/project
- Verify you have permissions to alter tables

### If Still Getting Cache Errors After Migration
1. **Hard refresh** the browser (Cmd+Shift+R / Ctrl+Shift+R)
2. **Close and reopen** the incognito window
3. **Wait 30 seconds** - sometimes Supabase takes a moment to sync
4. **Clear browser cache** completely if needed

### For Local Development
If you're using **local Supabase**:
```bash
# Run migration via CLI
supabase db reset
# Or apply just this migration
supabase migration up
```

## Next Steps After Migration

Once the migration is applied and you've refreshed:
1. ✅ Try adding a customer - should work without errors
2. ✅ Try updating a customer's payment method - should work
3. ✅ No more "[object Object]" errors
4. ✅ No more schema cache errors





