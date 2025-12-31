# Apply Helper UPDATE Policy Migration

**Migration File:** `supabase/migrations/20250130000010_add_helper_job_update_policy.sql`  
**Purpose:** Fixes critical RLS blocker preventing Helpers from completing assigned jobs  
**Date:** 2025-01-30

---

## 🎯 What This Migration Does

This migration adds a Row Level Security (RLS) policy that allows Helpers to **UPDATE** jobs they are assigned to. 

**Before:** Helpers could VIEW assigned jobs but could NOT complete them (UPDATE blocked)  
**After:** Helpers can VIEW and UPDATE (complete) assigned jobs

**Security:** The policy ensures `auth.uid()` can only UPDATE jobs where they exist in the `job_assignments` table, preventing access to non-assigned jobs.

---

## 📋 Migration Details

**Policy Name:** `"Helpers can update assigned jobs"`  
**Table:** `public.jobs`  
**Operation:** `UPDATE`

**Policy Logic:**
- Checks if `auth.uid()` exists in `job_assignments.assigned_to_user_id` for the job being updated
- Uses both `USING` and `WITH CHECK` clauses for complete security

---

## 🚀 How to Apply This Migration

You have **two options** for applying this migration:

### **Option 1: Supabase Dashboard (Recommended for Production)**

**Best for:** Production deployments, one-off migrations, non-CLI workflows

#### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `owqjyaiptexqwafzmcwy`

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy Migration SQL**
   - Open the migration file: `supabase/migrations/20250130000010_add_helper_job_update_policy.sql`
   - Copy **ALL** the SQL content (including `BEGIN;` and `COMMIT;`)

4. **Paste and Run**
   - Paste the SQL into the SQL Editor
   - Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)

5. **Verify Success**
   - You should see: `Success. No rows returned`
   - Check for any error messages (should be none)

6. **Verify Policy Exists**
   - Run this verification query:
   ```sql
   SELECT 
     schemaname,
     tablename,
     policyname,
     cmd,
     qual,
     with_check
   FROM pg_policies
   WHERE tablename = 'jobs' 
     AND policyname = 'Helpers can update assigned jobs';
   ```
   - Should return 1 row with the policy details

---

### **Option 2: Supabase CLI (Recommended for Local Development)**

**Best for:** Local development, automated workflows, version control

#### Prerequisites:

1. **Install Supabase CLI** (if not already installed):
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # Or via npm
   npm install -g supabase
   ```

2. **Link to Your Project** (if not already linked):
   ```bash
   cd /Users/rebeccaalmond/Downloads/solowipe-main
   supabase link --project-ref owqjyaiptexqwafzmcwy
   ```
   - You'll need your database password when prompted

#### Steps:

1. **Apply Migration Locally** (if using local Supabase):
   ```bash
   cd /Users/rebeccaalmond/Downloads/solowipe-main
   supabase migration up
   ```
   - This applies all pending migrations including the new one

2. **Push to Production**:
   ```bash
   supabase db push
   ```
   - This pushes all local migrations to your production database
   - **⚠️ WARNING:** This applies to production immediately!

3. **Verify Migration Applied**:
   ```bash
   supabase migration list
   ```
   - Should show `20250130000010_add_helper_job_update_policy` as applied

---

## ✅ Verification Steps

After applying the migration, verify it works:

### **1. Check Policy Exists**

Run in Supabase SQL Editor:
```sql
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'jobs' 
  AND policyname = 'Helpers can update assigned jobs';
```

**Expected Result:** 1 row showing the policy exists

### **2. Test Helper Can Complete Job**

**Test Scenario:**
1. Create a test Owner account (or use existing)
2. Create a test Helper account (or use existing)
3. Owner assigns a job to Helper
4. Helper logs in and attempts to complete the job
5. **Expected:** Job completes successfully ✅

**If Test Fails:**
- Check browser console for RLS errors
- Verify Helper is in `job_assignments` table:
  ```sql
  SELECT * FROM job_assignments 
  WHERE assigned_to_user_id = '<helper_user_id>';
  ```

### **3. Test Helper Cannot Complete Non-Assigned Job**

**Test Scenario:**
1. Helper tries to complete a job NOT assigned to them
2. **Expected:** Update fails with RLS error ✅

---

## 🔍 Troubleshooting

### **Error: "policy already exists"**

**Solution:** The policy might already exist. Check first:
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'jobs' 
  AND policyname = 'Helpers can update assigned jobs';
```

If it exists, you can either:
- Skip the migration (policy already applied)
- Drop and recreate: `DROP POLICY IF EXISTS "Helpers can update assigned jobs" ON public.jobs;`

### **Error: "relation job_assignments does not exist"**

**Solution:** The `job_assignments` table must exist first. Run earlier migrations:
- `20250129000000_add_job_assignments.sql`

### **Helper Still Cannot Complete Jobs**

**Checklist:**
1. ✅ Policy exists (run verification query above)
2. ✅ Helper is assigned to the job:
   ```sql
   SELECT * FROM job_assignments 
   WHERE job_id = '<job_id>' 
     AND assigned_to_user_id = '<helper_user_id>';
   ```
3. ✅ Helper is logged in (`auth.uid()` matches `assigned_to_user_id`)
4. ✅ Job status is `pending` (can't complete already-completed jobs)

---

## 📝 Migration File Location

**Local Path:**
```
/Users/rebeccaalmond/Downloads/solowipe-main/supabase/migrations/20250130000010_add_helper_job_update_policy.sql
```

**In Repository:**
```
supabase/migrations/20250130000010_add_helper_job_update_policy.sql
```

---

## 🎯 Next Steps After Migration

1. **Test Helper Workflow End-to-End**
   - Owner assigns job → Helper completes job → Owner sees completion

2. **Monitor for Errors**
   - Check Supabase logs for RLS violations
   - Check browser console for client-side errors

3. **Update Documentation**
   - Mark this migration as applied in your deployment checklist

---

## 🔒 Security Notes

- **This policy is secure:** It only allows UPDATEs where `auth.uid()` matches `assigned_to_user_id` in `job_assignments`
- **No privilege escalation:** Helpers cannot update jobs they're not assigned to
- **Works alongside Owner policy:** Both policies coexist (Helpers via assignments, Owners via customer ownership)

---

## 📚 Related Files

- **Audit Document:** `HELPER_FUNCTIONALITY_AUDIT_AND_PLAN.md`
- **Original Assignment Migration:** `supabase/migrations/20250129000000_add_job_assignments.sql`
- **RLS Fix Migration:** `supabase/migrations/20250129000002_fix_job_assignments_rls.sql`

---

**Status:** ✅ Migration file created and ready to apply  
**Priority:** 🔴 **CRITICAL** - Blocks Helper job completion workflow

