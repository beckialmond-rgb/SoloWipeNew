# GoCardless Connection Error - Quick Debug Guide

## 🔍 Step 1: Check Browser Console (Most Important!)

1. **Open Browser Console:**
   - Press `F12` (Windows/Linux) or `Cmd+Option+I` (Mac)
   - Go to **Console** tab

2. **Try Connecting Again:**
   - Go to Settings → GoCardless
   - Click "Connect GoCardless"
   - Watch the console for errors

3. **Look for These Logs:**
   - `[GC-CLIENT]` - Shows connection flow
   - `[GC-CALLBACK-PAGE]` - Shows callback handling
   - Error messages in red

## 🚨 Common Errors & Quick Fixes

### Error: "GoCardless not configured"
**Cause:** Missing secrets in Supabase  
**Fix:**
1. Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/functions
2. Click **"Secrets"** tab
3. Verify these exist:
   - `GOCARDLESS_CLIENT_ID`
   - `GOCARDLESS_CLIENT_SECRET`
   - `GOCARDLESS_ENVIRONMENT` (should be `sandbox` or `live`)
   - `SERVICE_ROLE_KEY`

### Error: "Invalid redirect URL" or "Untrusted domain"
**Cause:** Your domain isn't in the trusted list  
**Fix:** This shouldn't happen for production, but if it does, check the edge function code

### Error: "Redirect URI mismatch"
**Cause:** Redirect URL not registered in GoCardless Dashboard  
**Fix:**
1. Check console for the exact redirect URL (it will be shown)
2. Go to: https://manage.gocardless.com/settings/api
3. Find **"Redirect URIs"** section
4. Add the EXACT URL from console (no trailing slash!)

### Error: "Function not found" or 404
**Cause:** Edge function not deployed  
**Fix:**
1. Go to Supabase Dashboard → Edge Functions
2. Check if `gocardless-connect` exists
3. If missing, deploy it:
   ```bash
   supabase functions deploy gocardless-connect
   ```

### Error: "Network error" or "CORS error"
**Cause:** Edge function not reachable or CORS issue  
**Fix:**
1. Check Supabase Edge Functions are deployed
2. Check network tab in browser DevTools
3. Verify Supabase URL is correct

### Error: "Unauthorized" or 401
**Cause:** User not authenticated  
**Fix:**
1. Sign out and sign back in
2. Try connecting again

## 📋 Step 2: Check Supabase Function Logs

1. **Go to Supabase Dashboard:**
   - https://app.supabase.com/project/owqjyaiptexqwafzmcwy/functions

2. **Click on `gocardless-connect`**

3. **Click "Logs" tab**

4. **Try connecting again** (to generate fresh logs)

5. **Look for:**
   - Error messages
   - Status codes (400, 401, 500, etc.)
   - Missing environment variables

## 🔧 Step 3: Verify GoCardless Dashboard

1. **Go to GoCardless Dashboard:**
   - https://manage.gocardless.com/
   - Or https://manage-sandbox.gocardless.com/ (for sandbox)

2. **Check API Settings:**
   - Settings → API
   - Verify Client ID matches what's in Supabase secrets
   - Check Redirect URIs are registered

3. **Verify Environment:**
   - Make sure you're using **sandbox** Client ID for testing
   - Or **live** Client ID for production
   - The `GOCARDLESS_ENVIRONMENT` secret must match!

## 🎯 Step 4: Enable Debug Mode

1. **In Settings → GoCardless section:**
   - Click the bug icon (🐛) to enable debug mode
   - Or add `localStorage.setItem('gocardless_debug', 'true')` in console

2. **Try connecting again:**
   - Debug logs will show detailed information
   - Check the debug panel for step-by-step flow

## 📝 What to Share for Help

If you need help, share:

1. **Exact error message** from browser console
2. **Screenshot** of the error toast
3. **Console logs** (copy all `[GC-CLIENT]` logs)
4. **Supabase function logs** (from Step 2)
5. **Your environment:**
   - Are you on localhost or production?
   - What's your current URL?
   - Are you using sandbox or live GoCardless?

## ✅ Quick Checklist

- [ ] Browser console shows error (what is it?)
- [ ] Supabase secrets are set (GOCARDLESS_CLIENT_ID, GOCARDLESS_CLIENT_SECRET, GOCARDLESS_ENVIRONMENT)
- [ ] Edge function `gocardless-connect` exists and is deployed
- [ ] Redirect URI is registered in GoCardless Dashboard
- [ ] Environment matches (sandbox vs live)
- [ ] User is authenticated (signed in)

