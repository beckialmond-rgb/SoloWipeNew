# Customer INSERT RLS Policy Fix

## Issue Summary
When trying to add a customer, the app logs you out. This is likely due to an RLS (Row Level Security) policy issue or error handling that triggers logout.

## Findings

### 1. Auto-Logout Code Found

**Location:** `src/hooks/useSupabaseData.tsx` (lines 755-760)

The code has logic that automatically signs out users when certain errors occur:

```typescript
if (customerError) {
  // Check for foreign key constraint error specifically
  if (customerError.message?.includes('foreign key constraint')) {
    await supabase.auth.signOut();
    throw new Error('Your session has expired. Please sign in again.');
  }
  throw customerError;
}
```

**Note:** This auto-logout triggers on foreign key constraint errors. However, RLS policy violations might also cause errors that could be misinterpreted. If the RLS policy is missing or misconfigured, the INSERT will fail, potentially triggering this logout behavior.

### 2. RLS Policy Status

The initial migration (`20251210091122_d9a74f82-816f-4a9f-8cdc-a784f01740b1.sql`) includes an INSERT policy:

```sql
CREATE POLICY "Users can insert their own customers"
  ON public.customers FOR INSERT
  WITH CHECK (profile_id = auth.uid());
```

However, the policy might have been:
- Accidentally dropped
- Not properly applied
- Missing the `TO authenticated` clause (which is more explicit)

## Solution

### SQL Snippet

I've created `fix_customers_insert_rls.sql` which:
1. Drops the existing policy (if it exists) to recreate it cleanly
2. Creates a new INSERT policy explicitly for authenticated users
3. Includes a verification query to confirm the policy was created

### How to Run This SQL in Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Or go to: Project → SQL Editor

3. **Create a New Query**
   - Click "New query" button
   - Or use the keyboard shortcut (usually Ctrl/Cmd + K)

4. **Paste the SQL**
   - Open `fix_customers_insert_rls.sql`
   - Copy the entire contents
   - Paste into the SQL Editor

5. **Run the Query**
   - Click the "Run" button (or press Ctrl/Cmd + Enter)
   - Wait for the query to complete

6. **Verify the Results**
   - Check the output panel at the bottom
   - You should see:
     - A "DROP POLICY" success message
     - A "CREATE POLICY" success message
     - A query result showing the policy details (schemaname, tablename, policyname, etc.)

7. **Test the Fix**
   - Go back to your app
   - Try adding a customer
   - It should work without logging you out

### Alternative: Using Supabase CLI

If you prefer using the CLI:

```bash
# Make sure you're authenticated
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the SQL file
supabase db execute --file fix_customers_insert_rls.sql
```

## Additional Notes

- The policy uses `WITH CHECK (profile_id = auth.uid())` which ensures users can only insert customers with their own `profile_id`
- The `TO authenticated` clause explicitly restricts this policy to authenticated users only
- If issues persist after applying this fix, check:
  - That your user has a valid profile in the `profiles` table
  - That `auth.uid()` is returning the correct user ID
  - Browser console for any additional error messages
