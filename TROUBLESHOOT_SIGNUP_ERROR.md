# Troubleshooting "Application Error" on Sign Up

## Quick Checks

1. **Open Browser Console** (F12 or Cmd+Option+I)
   - Look for red error messages
   - Share the exact error message you see

2. **Check Network Tab**
   - Try signing up again
   - Look for failed requests to `/auth/v1/signup`
   - Check the response status and error message

3. **Check Database Trigger**
   - The `handle_new_user()` function should automatically create a profile
   - Verify it exists in Supabase SQL Editor:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

## Common Issues & Fixes

### Issue 1: Trigger Function Missing or Broken
**Fix:** Run this SQL in Supabase SQL Editor:

```sql
-- Recreate the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'business_name', 'My Window Cleaning')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Issue 2: RLS Policy Blocking Profile Creation
**Fix:** Ensure profiles can be inserted:

```sql
-- Verify the insert policy exists
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile';

-- If missing, create it:
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Issue 3: Supabase Auth Settings
Check Supabase Dashboard → Authentication → Settings:
- Email confirmations might be enabled (this is normal, user needs to verify email)
- Rate limiting might be active (try again after a minute)

## Next Steps

1. Share the **exact error message** from browser console
2. Share any **network request errors** (from Network tab)
3. Let me know if the trigger function exists (run the SQL check above)

This will help diagnose the exact issue!

