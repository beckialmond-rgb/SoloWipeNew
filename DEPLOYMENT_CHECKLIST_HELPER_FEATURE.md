# Helper Feature Deployment Checklist
**Date:** 2025-02-10  
**Status:** Ready for Production Deployment

---

## Pre-Deployment Verification

### ✅ Code Changes
- [x] Fix #1 applied: Date formatting in `HelperBillingCard.tsx`
- [x] All code changes reviewed
- [x] No linter errors
- [x] TypeScript compilation passes

### ✅ Migrations Ready
- [x] `20250130000010_add_helper_job_update_policy.sql` - RLS policy for helper job updates
- [x] `20250210000001_fix_helper_deactivation_cleanup.sql` - Assignment cleanup function
- [x] `20250209000000_create_get_invite_details_function.sql` - Invite validation function

### ✅ Edge Functions Ready
- [x] `invite-helper` - Helper invite flow
- [x] `accept-invite` - Invite acceptance flow
- [x] `manage-helper-billing` - Billing activation/deactivation

---

## Deployment Steps

### Step 1: Database Migrations

Run these migrations in order:

```sql
-- 1. Add helper job update policy
-- File: supabase/migrations/20250130000010_add_helper_job_update_policy.sql
-- This allows helpers to update (complete) assigned jobs

-- 2. Create cleanup function for deactivation
-- File: supabase/migrations/20250210000001_fix_helper_deactivation_cleanup.sql
-- This removes ALL assignments when helper is deactivated

-- 3. Create invite validation function
-- File: supabase/migrations/20250209000000_create_get_invite_details_function.sql
-- This allows unauthenticated invite validation
```

**Verification:**
```sql
-- Check RLS policy exists
SELECT * FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Helpers can update assigned jobs';

-- Check cleanup function exists
SELECT proname FROM pg_proc WHERE proname = 'cleanup_helper_assignments';

-- Check invite validation function exists
SELECT proname FROM pg_proc WHERE proname = 'get_invite_details';
```

### Step 2: Deploy Edge Functions

Deploy these edge functions:

1. **invite-helper**
   ```bash
   supabase functions deploy invite-helper
   ```

2. **accept-invite**
   ```bash
   supabase functions deploy accept-invite
   ```

3. **manage-helper-billing**
   ```bash
   supabase functions deploy manage-helper-billing
   ```

**Verification:**
- Check Supabase Dashboard → Edge Functions
- Verify all three functions are deployed and active
- Check function logs for any errors

### Step 3: Deploy Frontend

Deploy frontend code changes:

```bash
# Build and deploy frontend
npm run build
# Deploy to your hosting platform (Netlify/Vercel/etc.)
```

**Files Changed:**
- `src/components/HelperBillingCard.tsx` - Date formatting fix

**Verification:**
- Build completes without errors
- No TypeScript errors
- No linter errors

---

## Post-Deployment Verification

### 1. Verify RLS Policies

```sql
-- Verify helper job update policy
SELECT * FROM pg_policies 
WHERE tablename = 'jobs' 
AND policyname = 'Helpers can update assigned jobs';

-- Should return 1 row
```

### 2. Verify Database Functions

```sql
-- Verify cleanup function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'cleanup_helper_assignments';

-- Verify invite validation function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_invite_details';
```

### 3. Test Helper Invite Flow

1. **As Owner:**
   - Go to Helper Schedule page
   - Click "Invite Helper"
   - Enter helper email and name
   - Submit invite
   - ✅ Verify: Success toast appears
   - ✅ Verify: Helper appears in list with "Pending Invite" badge

2. **As Helper (new account):**
   - Open invite link from email
   - ✅ Verify: Email is pre-filled
   - ✅ Verify: Token is validated
   - Enter password and sign up
   - ✅ Verify: User is signed in automatically
   - ✅ Verify: Helper status changes to "Active"

### 4. Test Helper Job Assignment

1. **As Owner:**
   - Assign job to active helper
   - ✅ Verify: Assignment succeeds
   - ✅ Verify: Helper appears in job assignment list

2. **As Helper:**
   - View assigned jobs
   - ✅ Verify: Only assigned jobs are visible
   - ✅ Verify: Jobs are route-sorted

### 5. Test Helper Job Completion

1. **As Helper:**
   - Complete assigned job
   - ✅ Verify: Job completion succeeds
   - ✅ Verify: Helper payment amount is calculated
   - ✅ Verify: Assignment is removed after completion

### 6. Test Helper Earnings

1. **As Helper:**
   - Go to Earnings page
   - ✅ Verify: Only assigned job earnings are shown
   - ✅ Verify: Currency formatted as £
   - ✅ Verify: Dates formatted as dd/MM/yyyy
   - ✅ Verify: Total earnings calculated correctly

### 7. Test Helper Deactivation

1. **As Owner:**
   - Deactivate helper from billing card
   - ✅ Verify: Confirmation dialog shows
   - ✅ Verify: Dialog mentions assignment cleanup
   - Confirm deactivation
   - ✅ Verify: Helper status changes to "Inactive"
   - ✅ Verify: All assignments are removed

2. **As Helper (deactivated):**
   - Try to view assigned jobs
   - ✅ Verify: No jobs are visible
   - ✅ Verify: Cannot be assigned new jobs

### 8. Test Security

1. **As Helper A:**
   - Complete job
   - View earnings

2. **As Helper B:**
   - Try to view Helper A's earnings
   - ✅ Verify: Cannot see Helper A's earnings
   - ✅ Verify: Only own earnings are visible

---

## Monitoring Checklist

### First 24 Hours

- [ ] Monitor error logs for any issues
- [ ] Check edge function logs for errors
- [ ] Monitor database query performance
- [ ] Check for any RLS policy violations
- [ ] Verify assignment cleanup is working
- [ ] Verify payment calculations are correct

### First Week

- [ ] Monitor helper invite acceptance rate
- [ ] Check for any duplicate assignments
- [ ] Verify deactivation cleanup is working
- [ ] Monitor helper earnings queries
- [ ] Check for any security issues

---

## Rollback Plan

If issues are found:

1. **Rollback Frontend:**
   - Revert `HelperBillingCard.tsx` date formatting change
   - Redeploy previous version

2. **Rollback Edge Functions:**
   - Redeploy previous versions of edge functions
   - Or disable functions temporarily

3. **Rollback Migrations:**
   - Migrations are additive, so rollback is not required
   - If needed, drop policies/functions manually

---

## Success Criteria

✅ **Deployment Successful If:**
- All migrations run successfully
- All edge functions deploy successfully
- Frontend builds and deploys successfully
- All test scenarios pass
- No errors in logs
- RLS policies are active
- Database functions exist

---

## Support Contacts

- **Database Issues:** Check Supabase Dashboard logs
- **Edge Function Issues:** Check Supabase Edge Function logs
- **Frontend Issues:** Check browser console and build logs

---

**End of Deployment Checklist**

