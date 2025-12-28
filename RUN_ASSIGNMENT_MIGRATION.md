# Run Job Assignments Migration

**Migration File:** `supabase/migrations/20250129000000_add_job_assignments.sql`  
**Date:** 2025-01-29  
**Status:** Ready to Apply

---

## Quick Steps (Supabase Dashboard)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your SoloWipe project

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query** button

3. **Copy Migration SQL**
   - Open: `supabase/migrations/20250129000000_add_job_assignments.sql`
   - Copy **ALL** contents (Ctrl/Cmd + A, then Ctrl/Cmd + C)

4. **Paste and Run**
   - Paste into SQL Editor
   - Click **Run** button (or press Cmd/Ctrl + Enter)
   - Wait for success message

5. **Verify Migration**
   - Run the verification queries below
   - Check that all queries return expected results

---

## Migration SQL

The migration file is located at:
```
supabase/migrations/20250129000000_add_job_assignments.sql
```

**What it does:**
- Creates `job_assignments` table
- Adds indexes for performance
- Sets up RLS policies for security
- Adds Helper view policy to `jobs` table

---

## Verification Queries

After running the migration, verify it worked:

### 1. Check Table Exists
```sql
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'job_assignments';
```

**Expected:** Should return 1 row

### 2. Check Indexes Created
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'job_assignments' 
AND schemaname = 'public';
```

**Expected:** Should return 3 indexes:
- `idx_job_assignments_assigned_to`
- `idx_job_assignments_job_id`
- `idx_job_assignments_assigned_by`

### 3. Check RLS Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'job_assignments';
```

**Expected:** `rowsecurity` should be `true`

### 4. Check RLS Policies
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'job_assignments';
```

**Expected:** Should return 5 policies:
- "Helpers can view their assignments"
- "Owners can view assignments for their jobs"
- "Owners can assign their jobs"
- "Owners can reassign their jobs"
- "Owners can unassign their jobs"

### 5. Check Jobs Table Policy
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'jobs' 
AND policyname = 'Helpers can view assigned jobs';
```

**Expected:** Should return 1 policy

### 6. Check Table Structure
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'job_assignments' 
ORDER BY ordinal_position;
```

**Expected:** Should show columns:
- `id` (uuid)
- `job_id` (uuid)
- `assigned_to_user_id` (uuid)
- `assigned_by_user_id` (uuid)
- `assigned_at` (timestamptz)
- `created_at` (timestamptz)

---

## Expected Results

After successful migration:

✅ `job_assignments` table created  
✅ 3 indexes created  
✅ RLS enabled  
✅ 5 RLS policies created  
✅ Helper view policy added to `jobs` table  
✅ Table structure correct  

---

## Troubleshooting

### Error: "relation already exists"
- The table already exists - this is safe to ignore
- The migration uses `CREATE TABLE IF NOT EXISTS`

### Error: "policy already exists"
- Policies already exist - this is safe to ignore
- The migration uses `DROP POLICY IF EXISTS` before creating

### Error: "permission denied"
- Make sure you're using the correct database user
- Check that you have admin access to the project

### Error: "syntax error"
- Check that you copied the entire migration file
- Make sure there are no extra characters or missing lines

---

## Next Steps

After migration is complete:

1. ✅ **Test Assignment Flow**
   - Owner assigns a job to a Helper
   - Verify Helper sees the assigned job
   - Verify route sorting works for Helpers

2. ✅ **Test RLS Security**
   - Helper should only see assigned jobs
   - Owner should see all jobs (assigned + unassigned)

3. ✅ **Monitor for Issues**
   - Check application logs
   - Verify no RLS policy violations
   - Test assignment/unassignment flows

---

## Rollback (if needed)

If you need to rollback the migration:

```sql
BEGIN;

-- Drop Helper view policy from jobs
DROP POLICY IF EXISTS "Helpers can view assigned jobs" ON public.jobs;

-- Drop all policies
DROP POLICY IF EXISTS "Owners can unassign their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Owners can reassign their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Owners can assign their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Owners can view assignments for their jobs" ON public.job_assignments;
DROP POLICY IF EXISTS "Helpers can view their assignments" ON public.job_assignments;

-- Drop indexes
DROP INDEX IF EXISTS idx_job_assignments_assigned_by;
DROP INDEX IF EXISTS idx_job_assignments_job_id;
DROP INDEX IF EXISTS idx_job_assignments_assigned_to;

-- Drop table
DROP TABLE IF EXISTS public.job_assignments;

COMMIT;
```

**⚠️ Warning:** This will delete all assignment data. Only use if absolutely necessary.

---

**Migration Status:** ✅ **READY TO APPLY**  
**Risk Level:** 🟢 **LOW** (additive changes only)  
**Estimated Time:** 30 seconds  
**Rollback Available:** ✅ **YES**





