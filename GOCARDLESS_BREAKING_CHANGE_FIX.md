# GoCardless Breaking Change - Redirect URI Update

**Issue:** GoCardless was working before but now shows redirect URI mismatch error.

**Root Cause:** The redirect URI was changed from the old format to a new dedicated route, but the new URI wasn't added to GoCardless Dashboard.

---

## What Changed

### Old Redirect URI (Before)
- Likely: `/settings?gocardless=callback` or similar
- This was probably registered in your GoCardless Dashboard

### New Redirect URI (Current)
- **Production:** `https://solowipe.co.uk/gocardless-callback`
- **Development:** `http://localhost:[PORT]/gocardless-callback`

**The code now uses a dedicated callback route instead of the Settings page.**

---

## The Fix

### Step 1: Find Your Current Redirect URI

**Option A: Browser Console**
1. Open browser console (F12)
2. Click "Connect GoCardless"
3. Look for: `[GC-CLIENT] Hardcoded redirect URL: [URL]`
4. Copy that exact URL

**Option B: Debug Mode**
1. In Settings → GoCardless section, click the bug icon (🐛)
2. The redirect URI will be shown in the debug panel

**Expected URLs:**
- Production: `https://solowipe.co.uk/gocardless-callback`
- Development: `http://localhost:5173/gocardless-callback` (or your dev port)

---

### Step 2: Update GoCardless Dashboard

1. **Go to:** https://manage.gocardless.com/settings/api
2. **Find "Redirect URIs" section**
3. **Check what's currently registered:**
   - You might see an old URI like `/settings?gocardless=callback`
   - Or the old URI might have been removed

4. **Add the NEW redirect URI:**
   - Click "Add" or "Add Redirect URI"
   - Paste the exact URL from Step 1
   - **CRITICAL:** Must match EXACTLY:
     - ✅ No trailing slash
     - ✅ Correct protocol (`https://` for production, `http://` for localhost)
     - ✅ Correct hostname
     - ✅ Correct path (`/gocardless-callback`)

5. **You can keep both URIs:**
   - Keep the old one (if it exists) AND add the new one
   - GoCardless allows multiple redirect URIs
   - Or remove the old one if you prefer

---

### Step 3: Verify Environment Match

- **Sandbox Client ID** → Use sandbox redirect URIs
- **Live Client ID** → Use production redirect URIs

**Mismatch will cause the error!**

---

## Quick Checklist

- [ ] Found the redirect URI from console/debug mode
- [ ] Added new redirect URI to GoCardless Dashboard
- [ ] Verified no trailing slash
- [ ] Verified correct protocol (https for production, http for localhost)
- [ ] Verified environment matches (sandbox vs live)
- [ ] Waited 1-2 minutes for changes to propagate
- [ ] Cleared browser cache
- [ ] Tried connecting again

---

## Why This Happened

The code was updated to use a dedicated `/gocardless-callback` route instead of handling the callback on the Settings page. This is a better architecture, but requires updating the GoCardless Dashboard configuration.

**The old redirect URI is no longer used by the code**, so you need to add the new one.

---

## Summary

**Action Required:**
1. Find the redirect URI (from console: `[GC-CLIENT] Hardcoded redirect URL`)
2. Add it to GoCardless Dashboard → Settings → API → Redirect URIs
3. Make sure it matches EXACTLY (no trailing slash, correct protocol)

**That's it!** Once the new redirect URI is registered, GoCardless will work again.

