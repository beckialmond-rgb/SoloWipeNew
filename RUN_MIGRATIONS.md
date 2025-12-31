# Run Helper Feature Migrations
**Date:** 2025-02-10

---

## Migrations to Run

Two migrations need to be run to complete the Helper feature fixes:

1. **20250130000010_add_helper_job_update_policy.sql** - Adds RLS policy for helpers to update assigned jobs
2. **20250210000001_fix_helper_deactivation_cleanup.sql** - Creates function to cleanup ALL assignments on deactivation

---

## Option 1: Run via Supabase CLI (Recommended)

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main

# Link to your project (if not already linked)
npx supabase link --project-ref owqjyaiptexqwafzmcwy

# Run migrations
npx supabase db push
```

This will run all pending migrations including the two new ones.

---

## Option 2: Run via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/sql/new

2. Copy and paste the contents of:
   - `supabase/migrations/20250130000010_add_helper_job_update_policy.sql`
   - `supabase/migrations/20250210000001_fix_helper_deactivation_cleanup.sql`

3. Run each migration separately

---

## Option 3: Run Combined Migration

A combined migration file has been created at `/tmp/run_migrations.sql`. You can:

1. Copy the file contents
2. Paste into Supabase SQL Editor
3. Run it

---

## Verify Migrations Ran Successfully

After running migrations, verify:

### 1. Check RLS Policy Exists

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'jobs'
  AND policyname = 'Helpers can update assigned jobs';
```

**Expected:** 1 row with operation = 'UPDATE'

### 2. Check Cleanup Function Exists

```sql
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'cleanup_helper_assignments';
```

**Expected:** 1 row with return_type = 'integer'

### 3. Test Cleanup Function

```sql
-- This should return 0 (no assignments to clean up for test)
SELECT cleanup_helper_assignments(
  '00000000-0000-0000-0000-000000000000'::UUID,
  '00000000-0000-0000-0000-000000000000'::UUID
);
```

**Expected:** Returns 0 (no error)

---

## Deploy Updated Edge Function

After migrations are run, deploy the updated edge function:

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main

# Deploy manage-helper-billing function
npx supabase functions deploy manage-helper-billing
```

---

## What Changed

### Migration 1: Helper Job Update Policy
- Adds RLS policy allowing helpers to UPDATE jobs they're assigned to
- Enables helper job completion workflow
- **CRITICAL:** Without this, helpers cannot complete assigned jobs

### Migration 2: Assignment Cleanup Function
- Creates `cleanup_helper_assignments()` function
- Removes ALL job assignments (not just future ones)
- Ensures helpers cannot see assigned jobs after deactivation
- **CRITICAL:** Prevents orphaned assignments

### Edge Function Update
- Updated `manage-helper-billing` to call `cleanup_helper_assignments()`
- Removes ALL assignments on deactivation (not just future ones)
- More secure and consistent cleanup

---

## Testing After Deployment

1. Test helper can complete assigned job
2. Test deactivation removes ALL assignments
3. Test helper earnings query filters correctly
4. Verify no orphaned assignments exist

See `HELPER_FEATURE_QA_CHECKLIST.md` for full testing guide.

---

## Rollback (If Needed)

If you need to rollback:

```sql
-- Remove cleanup function
DROP FUNCTION IF EXISTS cleanup_helper_assignments(UUID, UUID);

-- Remove RLS policy
DROP POLICY IF EXISTS "Helpers can update assigned jobs" ON public.jobs;
```

**Note:** Rolling back the RLS policy will break helper job completion.

---

**End of Migration Guide**

