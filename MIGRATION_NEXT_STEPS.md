# Database Migration - Next Steps

**Date:** 2025-01-25  
**Status:** Migration file created, ready to apply

---

## Migration Required: ✅ YES

### Why Migration is Needed

1. **Existing Data Issue:**
   - Previous migrations set GoCardless payments to `'paid'` immediately
   - But funds haven't actually arrived yet (3-5 working days)
   - These should be `'processing'` until webhook confirms `paid_out`

2. **Data Integrity:**
   - Payments marked as `'paid'` but `gocardless_payment_status != 'paid_out'` are incorrect
   - This inflates earnings with funds that haven't arrived
   - Migration fixes this by setting them to `'processing'`

3. **Schema Validation:**
   - Adds CHECK constraint to ensure only valid statuses: `'unpaid'`, `'processing'`, `'paid'`
   - Prevents future invalid values

---

## Migration File Created

**File:** `supabase/migrations/20250125000000_add_processing_status.sql`

### What It Does:

1. **Updates Existing Payments:**
   - Finds GoCardless payments marked `'paid'` but not actually `paid_out`
   - Sets them to `'processing'` status
   - Clears `payment_date` (should only be set on `paid_out`)

2. **Adds Validation:**
   - Adds CHECK constraint to validate `payment_status` values
   - Only allows: `'unpaid'`, `'processing'`, `'paid'`

3. **Includes Verification:**
   - Queries to verify migration results
   - Counts payments by status
   - Checks for any remaining issues

---

## How to Apply Migration

### Option 1: Via Supabase CLI (Recommended)

```bash
# Navigate to project directory
cd /Users/rebeccaalmond/Downloads/solowipe-main

# Apply migration
supabase db push

# Or apply specific migration
supabase migration up
```

### Option 2: Via Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20250125000000_add_processing_status.sql`
3. Paste and run in SQL Editor
4. Review results

### Option 3: Manual SQL Execution

1. Connect to your Supabase database
2. Run the migration SQL file
3. Verify results using the verification queries

---

## Pre-Migration Checklist

Before running the migration:

- [ ] **Backup Database** (if possible)
- [ ] **Review Migration SQL** - Understand what it does
- [ ] **Check Current Data:**
  ```sql
  -- See how many payments will be affected
  SELECT 
    payment_status,
    payment_method,
    COUNT(*) as count
  FROM public.jobs
  WHERE status = 'completed'
  GROUP BY payment_status, payment_method;
  ```
- [ ] **Verify GoCardless Payments:**
  ```sql
  -- Check GoCardless payments that should be processing
  SELECT 
    id,
    payment_status,
    gocardless_payment_status,
    payment_date,
    completed_at
  FROM public.jobs
  WHERE payment_method = 'gocardless'
    AND payment_status = 'paid'
    AND (
      gocardless_payment_status IS NULL 
      OR gocardless_payment_status NOT IN ('paid_out', 'failed', 'cancelled', 'charged_back')
    )
    AND status = 'completed'
  LIMIT 10;
  ```

---

## Post-Migration Verification

After running the migration, verify:

1. **Check Migration Results:**
   ```sql
   -- Should show 0 for "should_be_processing"
   SELECT 
     COUNT(*) as should_be_processing
   FROM public.jobs
   WHERE payment_method = 'gocardless'
     AND payment_status = 'paid'
     AND (
       gocardless_payment_status IS NULL 
       OR gocardless_payment_status NOT IN ('paid_out', 'failed', 'cancelled', 'charged_back')
     )
     AND status = 'completed';
   ```

2. **Verify Status Distribution:**
   ```sql
   -- Should show 'processing' for GoCardless payments not yet paid_out
   SELECT 
     payment_status,
     payment_method,
     COUNT(*) as count
   FROM public.jobs
   WHERE status = 'completed'
   GROUP BY payment_status, payment_method
   ORDER BY payment_status, payment_method;
   ```

3. **Check Constraint:**
   ```sql
   -- Verify constraint was added
   SELECT 
     conname as constraint_name,
     pg_get_constraintdef(oid) as constraint_definition
   FROM pg_constraint
   WHERE conrelid = 'public.jobs'::regclass
     AND conname = 'jobs_payment_status_check';
   ```

---

## Expected Results

### Before Migration:
- GoCardless payments: `payment_status = 'paid'` (even if not `paid_out`)
- Earnings include payments where funds haven't arrived
- No validation on `payment_status` values

### After Migration:
- GoCardless payments: `payment_status = 'processing'` (until `paid_out`)
- Earnings only include payments where funds have arrived
- CHECK constraint validates `payment_status` values
- `payment_date` cleared for processing payments

---

## Rollback Plan (If Needed)

If you need to rollback the migration:

```sql
-- Remove constraint
ALTER TABLE public.jobs
DROP CONSTRAINT IF EXISTS jobs_payment_status_check;

-- Revert processing payments back to paid
-- (Only if you want to undo the migration)
UPDATE public.jobs
SET payment_status = 'paid'
WHERE payment_status = 'processing'
  AND payment_method = 'gocardless'
  AND status = 'completed';
```

**Note:** Rollback is not recommended as it would reintroduce the incorrect payment status issue.

---

## Impact Assessment

### Low Risk:
- ✅ Migration only updates data, doesn't change schema structure
- ✅ CHECK constraint is optional (wrapped in DO block)
- ✅ Verification queries included
- ✅ No breaking changes to application code

### Data Changes:
- GoCardless payments marked `'paid'` but not `paid_out` → `'processing'`
- `payment_date` cleared for processing payments
- Earnings calculations will be more accurate

---

## Next Steps

1. **Review Migration File:**
   - Read `supabase/migrations/20250125000000_add_processing_status.sql`
   - Understand what it does

2. **Run Pre-Migration Checks:**
   - Execute verification queries
   - Review affected data

3. **Apply Migration:**
   - Use Supabase CLI or Dashboard
   - Monitor for errors

4. **Verify Results:**
   - Run post-migration verification queries
   - Check application behavior

5. **Monitor:**
   - Watch for any issues in production
   - Verify earnings calculations are correct

---

## Support

If you encounter issues:

1. Check migration logs for errors
2. Review verification queries
3. Check Supabase dashboard for constraint errors
4. Review application logs for payment status issues

---

**Migration Status:** ✅ **READY TO APPLY**  
**Risk Level:** 🟢 **LOW**  
**Estimated Time:** 1-2 minutes  
**Rollback Available:** ✅ **YES** (not recommended)

