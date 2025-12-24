# GoCardless Connection Audit & Fix

**Date:** $(date)  
**Status:** 🔍 Investigation Required

---

## Issues Identified

### 1. ❌ Redirect URI Mismatch Error
**Error:** "The provided redirect_uri does not match the one for the client_id"  
**HTTP Error:** 400 Bad Request

**Root Cause:** The redirect URI sent in the OAuth request doesn't exactly match what's registered in the GoCardless Dashboard.

---

## Current Implementation Analysis

### Redirect URI Construction
**Location:** `src/components/GoCardlessSection.tsx` (lines 163-169)

```typescript
const currentHostname = window.location.hostname;
const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
const redirectUrl = isProduction 
  ? 'https://solowipe.co.uk/gocardless-callback'
  : `${window.location.origin}/gocardless-callback`;
```

**Current Behavior:**
- ✅ Production: `https://solowipe.co.uk/gocardless-callback`
- ✅ Development: `${window.location.origin}/gocardless-callback` (e.g., `http://localhost:5173/gocardless-callback`)

### Connection Status Logic
**Location:** `src/components/GoCardlessSection.tsx` (lines 66-67)

```typescript
const isConnected = !!profile?.gocardless_organisation_id && !!profile?.gocardless_access_token_encrypted;
const hasPartialConnection = !!profile?.gocardless_organisation_id && !profile?.gocardless_access_token_encrypted;
```

**Status Logic:**
- ✅ **Connected:** Has both organisation ID AND access token
- ⚠️ **Partial:** Has organisation ID but NO access token (incomplete connection)
- ❌ **Disconnected:** Missing organisation ID or both

**This is CORRECT** - shows as disconnected if either field is missing.

---

## Required Actions

### Step 1: Verify GoCardless Dashboard Configuration

1. **Go to GoCardless Dashboard:**
   - Visit: https://manage.gocardless.com/
   - Login to your account

2. **Navigate to API Settings:**
   - Click **"Settings"** → **"API"**
   - Or: https://manage.gocardless.com/settings/api

3. **Check Redirect URIs:**
   - Find the **"Redirect URIs"** section
   - Verify the following URIs are registered:

   **For Production (Live Environment):**
   ```
   https://solowipe.co.uk/gocardless-callback
   ```

   **For Development (Sandbox Environment):**
   ```
   http://localhost:5173/gocardless-callback
   http://localhost:8080/gocardless-callback
   http://localhost:3000/gocardless-callback
   ```
   (Add all ports you use for local development)

4. **Critical Requirements:**
   - ✅ **NO trailing slash** (NOT `/gocardless-callback/`)
   - ✅ **Exact protocol match** (`https://` for production, `http://` for localhost)
   - ✅ **Exact hostname match** (no `www.` unless you use it)
   - ✅ **Exact path match** (`/gocardless-callback`)

### Step 2: Verify Environment Match

**Check Supabase Edge Function Environment Variable:**
- `GOCARDLESS_ENVIRONMENT` should be:
  - `sandbox` for testing/development
  - `live` for production

**Check Client ID:**
- Sandbox Client ID → Use sandbox redirect URIs
- Live Client ID → Use production redirect URIs

**Mismatch will cause the error!**

### Step 3: Check Browser Console

When clicking "Connect GoCardless", check browser console for:

```
[GC-CLIENT] === REDIRECT URL CONSTRUCTION ===
[GC-CLIENT] Current hostname: [your hostname]
[GC-CLIENT] Current origin: [your origin]
[GC-CLIENT] Hardcoded redirect URL: [the URL being sent]
```

**Copy the exact redirect URL** and verify it matches GoCardless Dashboard **character for character**.

---

## Potential Issues & Fixes

### Issue 1: Redirect URI Not Registered
**Symptom:** Error 400 "redirect_uri does not match"  
**Fix:** Add the exact redirect URI to GoCardless Dashboard

### Issue 2: Environment Mismatch
**Symptom:** Error 400 "redirect_uri does not match"  
**Fix:** Ensure:
- Sandbox Client ID → Sandbox redirect URIs
- Live Client ID → Production redirect URIs

### Issue 3: Trailing Slash Mismatch
**Symptom:** Error 400 "redirect_uri does not match"  
**Fix:** Remove trailing slash from GoCardless Dashboard if present

### Issue 4: Protocol Mismatch
**Symptom:** Error 400 "redirect_uri does not match"  
**Fix:** Ensure:
- Production uses `https://`
- Localhost uses `http://`

### Issue 5: Port Mismatch (Development)
**Symptom:** Error 400 "redirect_uri does not match"  
**Fix:** Add redirect URI with correct port:
- `http://localhost:5173/gocardless-callback` (Vite default)
- `http://localhost:8080/gocardless-callback` (alternative)
- `http://localhost:3000/gocardless-callback` (alternative)

---

## Code Verification

### ✅ Connection Status Logic - CORRECT
The code correctly checks for both fields:
- Shows "Connected" only when BOTH are present
- Shows "Reconnect Required" when only organisation ID exists
- Shows "Not Connected" when missing organisation ID

### ✅ Redirect URI Construction - CORRECT
The code correctly constructs:
- Production: Hardcoded `https://solowipe.co.uk/gocardless-callback`
- Development: Dynamic `${window.location.origin}/gocardless-callback`

### ⚠️ Potential Issue: Port Detection
If running on a non-standard port, the redirect URI might not match.

**Recommendation:** Add more ports to the development check or use environment variable.

---

## Debugging Steps

1. **Enable Debug Mode:**
   - Click the bug icon in GoCardless section
   - Check debug logs for redirect URL

2. **Check Browser Console:**
   - Look for `[GC-CLIENT]` logs
   - Find the exact redirect URL being sent

3. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for `gocardless-connect` function logs
   - Check the redirect URI being sent to GoCardless

4. **Compare URLs:**
   - Copy redirect URI from console
   - Compare character-by-character with GoCardless Dashboard
   - Check for:
     - Trailing slashes
     - Protocol differences
     - Port differences
     - Hostname differences

---

## Quick Fix Checklist

- [ ] Verify redirect URI in GoCardless Dashboard matches exactly
- [ ] Check environment (sandbox vs live) matches Client ID
- [ ] Verify no trailing slash in Dashboard
- [ ] Verify protocol matches (https for production, http for localhost)
- [ ] Add all development ports to Dashboard if needed
- [ ] Clear browser cache and retry
- [ ] Check Supabase Edge Function logs for errors
- [ ] Verify `GOCARDLESS_ENVIRONMENT` variable is set correctly

---

## Next Steps

1. **User Action Required:**
   - Check GoCardless Dashboard for registered redirect URIs
   - Add missing redirect URIs if needed
   - Verify environment matches Client ID

2. **If Still Failing:**
   - Share the exact redirect URL from browser console
   - Share the redirect URIs registered in GoCardless Dashboard
   - Check Supabase Edge Function logs for detailed error

---

## Status

🔍 **AWAITING USER VERIFICATION** - Need to confirm GoCardless Dashboard configuration matches the redirect URIs being sent.

