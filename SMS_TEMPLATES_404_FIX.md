# SMS Templates 404 Error Fix

## Issue
The app is showing 404 errors for `sms_templates` table:
```
owqjyaiptexqwafzmcwy.supabase.co/rest/v1/sms_templates?select=*&profile_id=eq.xxx:1  
Failed to load resource: the server responded with a status of 404
```

## Root Cause
The `sms_templates` table doesn't exist in your Supabase database yet. The migration file exists but hasn't been run.

## Solution

### Option 1: Run the Migration (Recommended)
Run the migration to create the table:

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com/
   - Select your project

2. **Open SQL Editor**
   - Go to: SQL Editor → New query

3. **Run the Migration**
   - Copy the contents of `supabase/migrations/20251222000000_add_sms_templates.sql`
   - Paste into SQL Editor
   - Click "Run"

4. **Verify Table Created**
   - Go to: Table Editor
   - You should see `sms_templates` table

### Option 2: App Will Work Without Table (Current Behavior)
The app has been updated to:
- ✅ Gracefully handle 404 errors
- ✅ Use default templates when table doesn't exist
- ✅ Not crash or show errors to users
- ✅ Log warnings instead of errors

The app will function normally using default SMS templates stored in the code.

## What Changed

### Before
- 404 errors were logged as errors
- Could potentially cause issues if error handling wasn't perfect

### After
- 404 errors are handled gracefully
- Logged as info/warning instead of error
- App continues to work with default templates
- No user-facing errors

## Error Types Handled

1. **404 / Table Doesn't Exist**
   - Detected and handled gracefully
   - App uses default templates
   - No error shown to user

2. **Other Database Errors**
   - Still logged for debugging
   - App falls back to defaults
   - User experience not affected

3. **Network Errors (ERR_NETWORK_IO_SUSPENDED)**
   - Normal on mobile when app goes to background
   - Browser suspends network requests
   - Not a real error, just browser behavior

## Testing

After running the migration:
1. Refresh the app
2. Check console - should see successful fetch instead of 404
3. Go to Settings → SMS Templates
4. Should be able to customize templates
5. Changes should save to database

## Migration File Location
`supabase/migrations/20251222000000_add_sms_templates.sql`

## Current Status
- ✅ Error handling improved
- ✅ App works without table (uses defaults)
- ⚠️ Table migration needs to be run for full functionality
- ✅ No user-facing errors

The app should now load successfully on mobile even if the table doesn't exist!

