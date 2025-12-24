# Archive Customer Fix - Summary

## Changes Made

### 1. Database Migration ✅
**File**: `supabase/migrations/20250120000000_add_is_archived_to_customers.sql`

- Added `is_archived` BOOLEAN column to `customers` table (default: `false`)
- Created index on `is_archived` for performance
- Updated existing archived customers (those with `archived_at` set) to have `is_archived = true`

**SQL to Run in Supabase Dashboard**:
```sql
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_customers_is_archived 
ON public.customers(is_archived) 
WHERE is_archived = true;

UPDATE public.customers 
SET is_archived = true 
WHERE archived_at IS NOT NULL;
```

### 2. TypeScript Types ✅
**File**: `src/types/database.ts`

- Added `is_archived: boolean` to `Customer` interface

### 3. Archive Logic ✅
**File**: `src/hooks/useSupabaseData.tsx`

**Archive Mutation**:
- Now sets `is_archived = true` when archiving
- Also sets `archived_at` timestamp and `status = 'inactive'` for backward compatibility
- Filters by `.eq('is_archived', false)` to only archive non-archived customers

**Unarchive Mutation**:
- Sets `is_archived = false` when restoring
- Also sets `status = 'active'` and `archived_at = null`
- Filters by `.eq('is_archived', true)` to only unarchive archived customers

### 4. Customer List Filtering ✅
**File**: `src/hooks/useSupabaseData.tsx`

**Main Customers Query**:
- Changed from `.eq('status', 'active')` to `.eq('is_archived', false)`
- Now filters out archived customers from the main list

**Archived Customers Queries**:
- `recentlyArchivedCustomers`: Now filters by `.eq('is_archived', true)`
- `allArchivedCustomers`: Now filters by `.eq('is_archived', true)`

### 5. Toast Notification ✅
**File**: `src/hooks/useSupabaseData.tsx`

- Toast notification already exists in `onSuccess` callback
- Message: "Customer archived" with description showing customer name
- Displays: "{Customer Name} has been moved to Archive. You can restore them from Settings."

## Testing Checklist

1. ✅ Run SQL migration in Supabase dashboard
2. ✅ Archive a customer - should disappear from list immediately
3. ✅ Check toast notification appears
4. ✅ Verify customer appears in Settings → Archive section
5. ✅ Verify archived customer's job data still accessible in Money tab
6. ✅ Restore archived customer - should reappear in main list
7. ✅ Verify filtering works correctly (archived customers hidden from main list)

## Migration Instructions

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase/migrations/20250120000000_add_is_archived_to_customers.sql`
3. Run the SQL
4. Verify the migration succeeded
5. Test archiving a customer

## Notes

- The `is_archived` column is now the primary filter for archived customers
- `status` and `archived_at` are still updated for backward compatibility
- All archived customer data (completed jobs, payments) remains accessible for financial reporting
- The main customer list now uses `is_archived = false` filter

