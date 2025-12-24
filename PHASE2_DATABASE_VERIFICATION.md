# Phase 2: Database Setup & Verification Guide

## Overview
This phase verifies that all database components are properly set up and working correctly.

## Prerequisites
- ✅ Complete database setup SQL script has been run (`complete_database_setup.sql`)
- Access to Supabase Dashboard
- SQL Editor access

---

## Task 1: Verify All Tables Exist

### Steps:
1. Open Supabase Dashboard → SQL Editor
2. Run `phase2_database_verification.sql`
3. Check the "Tables" section results

### Expected Results:
- ✅ `profiles` table exists
- ✅ `customers` table exists  
- ✅ `jobs` table exists
- ✅ All tables have RLS enabled (`rowsecurity = true`)

### Verification Query:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs');
```

**Expected:** 3 rows, all with `rowsecurity = true`

---

## Task 2: Verify All RLS Policies Are Active

### Steps:
1. Review the RLS policies section in the verification SQL output
2. Verify each table has the required policies

### Required Policies:

#### Profiles Table (3 policies):
- ✅ `Users can view their own profile` (SELECT)
- ✅ `Users can update their own profile` (UPDATE)
- ✅ `Users can insert their own profile` (INSERT)

#### Customers Table (4 policies):
- ✅ `Users can view their own customers` (SELECT)
- ✅ `Users can insert their own customers` (INSERT) - **Critical for Phase 1 fix**
- ✅ `Users can update their own customers` (UPDATE)
- ✅ `Users can delete their own customers` (DELETE)

#### Jobs Table (4 policies):
- ✅ `Users can view jobs for their customers` (SELECT)
- ✅ `Users can insert jobs for their customers` (INSERT)
- ✅ `Users can update jobs for their customers` (UPDATE)
- ✅ `Users can delete jobs for their customers` (DELETE)

### Verification:
Run this query to count policies:
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'customers', 'jobs')
GROUP BY tablename;
```

**Expected:**
- profiles: 3 policies
- customers: 4 policies
- jobs: 4 policies

---

## Task 3: Test RLS Policies with Test User

### Steps:
1. **Create a test user** (or use existing):
   - Sign up via your app, or
   - Create via Supabase Dashboard → Authentication → Users

2. **Sign in as test user** in your app

3. **Run test queries** from `phase2_test_rls_policies.sql`:
   - Open SQL Editor
   - Copy queries from the test file
   - Run each test query

### Test Scenarios:

#### ✅ Should Work:
- View own profile
- View own customers
- Insert customer with own `profile_id`
- View jobs for own customers
- Insert job for own customer

#### ❌ Should Fail (with RLS error):
- View other users' profiles
- View other users' customers
- Insert customer with different `profile_id`
- View jobs for other users' customers
- Insert job for other user's customer

### Expected Behavior:
- ✅ Allowed operations succeed
- ❌ Blocked operations return RLS policy error (not logged out!)

---

## Task 4: Verify Storage Bucket Exists

### Steps:
1. Go to Supabase Dashboard → Storage → Buckets
2. Look for `job-photos` bucket
3. Verify settings:
   - ✅ Bucket name: `job-photos`
   - ✅ Public: `false` (private)
   - ✅ File size limit: Appropriate (default is fine)

### If Bucket Doesn't Exist:
Run this SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', false)
ON CONFLICT (id) DO UPDATE SET public = false;
```

---

## Task 5: Test Storage Bucket Policies

### Steps:
1. Go to Supabase Dashboard → Storage → Policies
2. Verify `job-photos` bucket has these policies:

#### Required Policies:
- ✅ `Users can view their own job photos` (SELECT)
- ✅ `Users can upload their own job photos` (INSERT)
- ✅ `Users can delete their own job photos` (DELETE)

### Policy Pattern:
Policies should use folder structure: `{userId}/{filename}`

Example policy check:
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%job photos%';
```

### Test Upload:
1. In your app, try uploading a job photo
2. Verify file is stored in: `{userId}/filename.jpg`
3. Verify you can view the photo
4. Verify you can delete the photo

---

## Task 6: Verify Database Triggers

### Steps:
1. Run verification query:
```sql
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### Expected:
- ✅ Trigger name: `on_auth_user_created`
- ✅ Table: `auth.users`
- ✅ Function: `public.handle_new_user()`

### Test Trigger:
1. Create a new user via Supabase Dashboard → Authentication → Users
2. Check if profile was automatically created:
```sql
SELECT * FROM public.profiles 
WHERE id = 'NEW_USER_ID_HERE';
```

**Expected:** Profile should exist automatically

---

## Task 7: Create Database Backup Strategy

### Supabase Automatic Backups:
- ✅ Supabase provides automatic daily backups (on Pro plan)
- ✅ Point-in-time recovery available

### Manual Backup Options:

#### Option 1: Supabase Dashboard
1. Go to Database → Backups
2. Create manual backup
3. Download backup file

#### Option 2: pg_dump (via CLI)
```bash
# Get connection string from Supabase Dashboard → Settings → Database
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup.sql
```

#### Option 3: Supabase CLI
```bash
supabase db dump -f backup.sql
```

### Backup Schedule Recommendation:
- **Daily:** Automatic (Supabase handles this)
- **Before major changes:** Manual backup
- **Weekly:** Download backup file for offsite storage

### Restore Process:
1. Go to Supabase Dashboard → Database → Backups
2. Select backup point
3. Click "Restore"
4. Confirm restoration

---

## Verification Checklist

Use this checklist to track progress:

- [ ] All tables exist (profiles, customers, jobs)
- [ ] All tables have RLS enabled
- [ ] All required RLS policies exist (11 total)
- [ ] RLS policies tested with test user
- [ ] Storage bucket `job-photos` exists
- [ ] Storage bucket policies configured correctly
- [ ] Database trigger `on_auth_user_created` exists
- [ ] Trigger tested (new user creates profile)
- [ ] Backup strategy documented
- [ ] Backup tested (optional but recommended)

---

## Common Issues & Solutions

### Issue: Tables don't exist
**Solution:** Run `complete_database_setup.sql` again

### Issue: RLS policies missing
**Solution:** Re-run the policy creation statements from `complete_database_setup.sql`

### Issue: Storage bucket doesn't exist
**Solution:** Run the storage bucket creation SQL from `complete_database_setup.sql`

### Issue: Trigger not working
**Solution:** 
1. Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`
2. Recreate trigger if needed

### Issue: RLS policies too restrictive
**Solution:** Check policy `WITH CHECK` clauses match `USING` clauses

---

## Next Steps

Once all tasks are complete:
1. ✅ Document any issues found
2. ✅ Fix any problems discovered
3. ✅ Move to Phase 3: Environment Configuration

---

## SQL Files Created

1. **`phase2_database_verification.sql`** - Comprehensive verification queries
2. **`phase2_test_rls_policies.sql`** - RLS policy testing queries

Run these in Supabase SQL Editor to verify everything is set up correctly.
