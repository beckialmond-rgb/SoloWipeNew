# GoCardless Connection Error - Troubleshooting Guide

## Error: "Failed to start GoCardless connection"

This error occurs when the `gocardless-connect` edge function fails. Here's how to diagnose and fix it:

---

## Step 1: Check Browser Console

1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to the **Console** tab
4. Try connecting GoCardless again
5. Look for error messages - they will show the specific failure

Common errors you might see:
- `"GoCardless not configured"` → Missing `GOCARDLESS_CLIENT_ID`
- `"Invalid redirect URL"` → Domain not in trusted list
- `"Unauthorized"` → Authentication issue
- Network errors → Edge function not deployed or unreachable

---

## Step 2: Check Supabase Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on `gocardless-connect` function
3. Go to the **Logs** tab
4. Try connecting again and check for error messages

Look for:
- `"Client ID: undefined"` or `"Client ID: null"` → Missing `GOCARDLESS_CLIENT_ID` secret
- `"Invalid redirect URL"` → Domain validation failed
- `"GoCardless not configured"` → Missing required secrets

---

## Step 3: Verify Required Secrets Are Set

Go to **Supabase Dashboard** → **Edge Functions** → **Secrets** and verify:

### Required Secrets:
- [ ] `GOCARDLESS_CLIENT_ID` - Must be set!
- [ ] `GOCARDLESS_CLIENT_SECRET` - Must be set!
- [ ] `GOCARDLESS_ENVIRONMENT` - Should be `sandbox` or `live`
- [ ] `SERVICE_ROLE_KEY` - Required for database operations

### Where to Find GoCardless Credentials:

1. **GoCardless Dashboard**: https://manage.gocardless.com/
2. Go to **Settings** → **API**
3. Copy:
   - **Client ID** → Set as `GOCARDLESS_CLIENT_ID`
   - **Client Secret** → Set as `GOCARDLESS_CLIENT_SECRET`
4. Make sure you're in the correct environment:
   - **Sandbox** for testing
   - **Live** for production

---

## Step 4: Check Redirect URL Domain

The redirect URL must match one of these trusted domains:
- `solowipe.co.uk`
- `lovable.app`
- `lovableproject.com`
- `localhost` (for local development)

The code checks your current hostname and sets:
- **Production**: `https://solowipe.co.uk/settings?gocardless=callback`
- **Development**: `http://localhost:3000/settings?gocardless=callback`

**If you're running on a different domain** (e.g., preview URLs), the connection will fail. You may need to:
1. Update the trusted domains in `gocardless-connect/index.ts` (line 32)
2. Or test on `solowipe.co.uk` or `localhost:3000`

---

## Step 5: Enable Debug Mode

The GoCardless section has built-in debug mode:

1. In the GoCardless settings section, look for a debug/bug icon
2. Enable debug mode
3. Try connecting again
4. Review the debug logs for detailed error information

---

## Step 6: Verify Edge Function is Deployed

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Verify `gocardless-connect` function exists and is deployed
3. Check the function code hasn't been modified incorrectly

---

## Common Issues & Solutions

### Issue 1: "GoCardless not configured"
**Solution**: Add `GOCARDLESS_CLIENT_ID` to Supabase Edge Functions secrets

### Issue 2: "Invalid redirect URL: Untrusted domain"
**Solution**: 
- Make sure you're testing on `localhost:3000` (dev) or `solowipe.co.uk` (prod)
- Or add your domain to the trusted domains list in the function

### Issue 3: Function returns 500 error
**Solution**: 
- Check Supabase function logs for the actual error
- Verify all required secrets are set correctly
- Make sure `SERVICE_ROLE_KEY` is set (needed for database operations)

### Issue 4: CORS errors
**Solution**: 
- This shouldn't happen as the function has CORS headers
- Check if the function is actually deployed and accessible

---

## Quick Fix Checklist

1. ✅ Verify `GOCARDLESS_CLIENT_ID` is set in Supabase secrets
2. ✅ Verify `GOCARDLESS_CLIENT_SECRET` is set in Supabase secrets
3. ✅ Verify `GOCARDLESS_ENVIRONMENT` is set to `sandbox` or `live`
4. ✅ Verify `SERVICE_ROLE_KEY` is set (for database operations)
5. ✅ Check browser console for specific error
6. ✅ Check Supabase Edge Function logs
7. ✅ Test on `localhost:3000` or `solowipe.co.uk`
8. ✅ Enable debug mode in the UI for detailed logs

---

## Still Having Issues?

If you've checked everything above and it still doesn't work:

1. **Check the exact error message** from browser console or function logs
2. **Verify your GoCardless account** is active and API access is enabled
3. **Test with a fresh browser session** (clear cache/cookies)
4. **Verify the edge function code** matches the repository

