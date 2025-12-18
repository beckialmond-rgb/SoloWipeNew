# Customer INSERT RLS Policy Fix

## Problem Summary

When trying to add a customer, the app logs you out. This is caused by:

1. **RLS Policy Issue**: The Row Level Security (RLS) policy for INSERT on the `customers` table may be missing or misconfigured
2. **Auto-logout on Errors**: The code was logging users out on certain database errors, which could be triggered by RLS violations

## What Was Fixed

### 1. Code Changes (`src/hooks/useSupabaseData.tsx`)
- Improved error handling to distinguish between:
  - **Foreign key constraint errors** (profile doesn't exist) → Logs out (correct behavior)
  - **RLS policy errors** → Shows helpful error message (doesn't log out)

### 2. SQL Fix (`fix_customers_insert_rls.sql`)
- Ensures the INSERT policy exists and is correctly configured
- Allows authenticated users to insert customers where `profile_id = auth.uid()`

## How to Run the SQL Fix in Supabase Dashboard

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project dashboard: https://app.supabase.com
2. Select your project

### Step 2: Navigate to SQL Editor
1. Click on **"SQL Editor"** in the left sidebar
2. Click **"New query"** button (top right)

### Step 3: Run the SQL
1. Copy the contents of `fix_customers_insert_rls.sql`
2. Paste it into the SQL editor
3. Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Step 4: Verify the Policy
After running, you can verify the policy exists by running this query:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, with_check
FROM pg_policies 
WHERE tablename = 'customers' AND cmd = 'INSERT';
```

You should see a policy named `"Users can insert their own customers"` with:
- `cmd` = `INSERT`
- `with_check` = `(profile_id = auth.uid())`

## Testing

After applying the fix:
1. Try adding a new customer
2. The operation should succeed without logging you out
3. If you see an error, check the browser console for the specific error message

## Additional Notes

- The RLS policy ensures users can only insert customers with their own `profile_id`
- This prevents users from creating customers for other users
- The policy uses `WITH CHECK` to validate the data before insertion
