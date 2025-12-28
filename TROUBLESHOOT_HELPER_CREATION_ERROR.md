# Troubleshooting Helper Creation Application Error

## Quick Fixes

### 1. **Run the Database Migration** (Most Likely Cause)

The application error is likely because the foreign key constraint still exists. You **must** run the migration first:

**File:** `supabase/migrations/20250130000001_allow_placeholder_helpers.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste the entire migration file content
3. Click **Run**
4. Verify success message

**Verify Migration Ran:**
```sql
-- Check if constraint was removed
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'public.team_members'::regclass 
AND conname LIKE '%helper_id%';
-- Should return no rows (constraint removed)
```

---

### 2. **Check Browser Console**

Open browser console (F12) and look for:
- Red error messages
- Network errors (failed requests)
- TypeScript/runtime errors

**Common Errors:**

**Error: "foreign key constraint violation"**
- **Fix:** Run the migration (see #1)

**Error: "Cannot read property 'isPlaceholder' of undefined"**
- **Fix:** Already fixed - refresh the page

**Error: "matchPlaceholderHelper is not a function"**
- **Fix:** Already fixed - refresh the page

---

### 3. **Clear Browser Cache**

Sometimes cached JavaScript causes issues:
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Or clear cache in browser settings

---

### 4. **Check Network Tab**

1. Open DevTools → Network tab
2. Try creating a helper
3. Look for failed requests to Supabase
4. Check error response

**Common Network Errors:**

**403 Forbidden**
- RLS policy blocking insert
- Check `team_members` RLS policies

**23503 Foreign Key Violation**
- Migration not run
- Run migration (see #1)

**23505 Unique Constraint**
- Duplicate helper name
- Expected behavior - shows error message

---

## Step-by-Step Debugging

### Step 1: Verify Migration Status

```sql
-- Check if migration was applied
SELECT tablename, schemaname 
FROM pg_tables 
WHERE tablename = 'team_members';

-- Check constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.team_members'::regclass;
```

**Expected:** No `team_members_helper_id_fkey` constraint

### Step 2: Test Helper Creation Manually

```sql
-- Try inserting a test placeholder helper
INSERT INTO public.team_members (
  owner_id,
  helper_id,
  helper_email,
  helper_name
) VALUES (
  'YOUR_USER_ID_HERE',
  gen_random_uuid(),
  'test@temp.helper',
  'Test Helper'
);
```

**If this fails:** Migration not run or RLS issue

### Step 3: Check RLS Policies

```sql
-- Verify RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'team_members';
```

**Expected:** Should see policies for SELECT, INSERT, UPDATE, DELETE

---

## Common Error Messages & Fixes

### "Foreign key constraint violation"
**Cause:** Migration not run  
**Fix:** Run `20250130000001_allow_placeholder_helpers.sql`

### "A helper named 'X' already exists"
**Cause:** Duplicate name (expected behavior)  
**Fix:** Use a different name or delete existing helper

### "Helper name cannot be empty"
**Cause:** Empty input (expected validation)  
**Fix:** Enter a name

### "This helper needs to sign up first"
**Cause:** Trying to assign to placeholder helper  
**Fix:** This is expected - helper needs to sign up first

### "Cannot read property 'isPlaceholder'"
**Cause:** Type mismatch (should be fixed now)  
**Fix:** Hard refresh browser (Cmd+Shift+R)

---

## Verification Checklist

After running migration, verify:

- [ ] Migration ran successfully (no errors)
- [ ] Foreign key constraint removed
- [ ] Browser cache cleared
- [ ] Page refreshed
- [ ] Can create placeholder helper
- [ ] "Pending" badge appears
- [ ] Error shown when trying to assign

---

## Still Not Working?

1. **Share the exact error message** from browser console
2. **Share the network request** that failed (from Network tab)
3. **Verify migration ran** (run the SQL check queries above)
4. **Check RLS policies** (run the RLS check query)

The most common issue is **not running the migration**. Make sure you run it in Supabase SQL Editor first!




