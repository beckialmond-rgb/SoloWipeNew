# ⚠️ URGENT: GoCardless Redirect URI Mismatch Fix

## The Error

**Error Message:** "The provided redirect_uri does not match the one for the client_id"  
**HTTP Error:** 400 Bad Request

This error occurs because the redirect URI we're sending doesn't match what's registered in your GoCardless Dashboard.

---

## The Solution

You **MUST** add the new redirect URI to your GoCardless Dashboard.

### Step 1: Determine Your Current Environment

Check your browser console for logs like:
```
[GC-CLIENT] Current hostname: localhost
[GC-CLIENT] Current origin: http://localhost:8080
[GC-CLIENT] Hardcoded redirect URL: http://localhost:8080/gocardless-callback
```

OR for production:
```
[GC-CLIENT] Hardcoded redirect URL: https://solowipe.co.uk/gocardless-callback
```

### Step 2: Add Redirect URI to GoCardless Dashboard

1. **Go to GoCardless Dashboard:**
   - Visit: https://manage.gocardless.com/
   - Login to your account

2. **Navigate to API Settings:**
   - Click **"Settings"** in the top menu
   - Click **"API"** in the left sidebar
   - Or go directly to: https://manage.gocardless.com/settings/api

3. **Find "Redirect URIs" Section:**
   - Look for a section titled **"Redirect URIs"** or **"OAuth Redirect URIs"**
   - This is usually near the top of the page, below your Client ID

4. **Add the Redirect URI:**

   **For Development/Local Testing:**
   ```
   http://localhost:8080/gocardless-callback
   ```

   **For Production:**
   ```
   https://solowipe.co.uk/gocardless-callback
   ```

5. **Click "Add" or "Save"**

6. **Verify the URI is Added:**
   - The URI should appear in your list of allowed redirect URIs
   - Make sure there's **NO trailing slash** (e.g., NOT `/gocardless-callback/`)
   - Make sure the protocol matches exactly (`http://` for localhost, `https://` for production)

---

## Critical Requirements

### Exact Match Required

GoCardless requires an **EXACT match** between:
- What we send in the OAuth request
- What's registered in the Dashboard

### Common Mistakes to Avoid

❌ **DON'T add:**
- `http://localhost:8080/gocardless-callback/` (trailing slash)
- `http://localhost:3000/gocardless-callback` (wrong port)
- `https://solowipe.co.uk/gocardless-callback/` (trailing slash)
- `http://solowipe.co.uk/gocardless-callback` (wrong protocol for production)

✅ **DO add:**
- `http://localhost:8080/gocardless-callback` (exact match, no trailing slash)
- `https://solowipe.co.uk/gocardless-callback` (exact match, no trailing slash)

### Multiple Environments

If you're testing in both development and production, you'll need to add **BOTH** URIs:

1. `http://localhost:8080/gocardless-callback` (for local development)
2. `https://solowipe.co.uk/gocardless-callback` (for production)

GoCardless allows multiple redirect URIs per client, so you can have both.

---

## Verification

After adding the redirect URI:

1. **Wait 1-2 minutes** for changes to propagate (if needed)

2. **Clear your browser cache** or do a hard refresh (Cmd+Shift+R)

3. **Try connecting GoCardless again**

4. **Check the console logs** - you should see:
   ```
   [GC-CLIENT] Hardcoded redirect URL: http://localhost:8080/gocardless-callback
   ```

5. **The error should be gone** - you should be redirected to GoCardless authorization page

---

## If It Still Doesn't Work

### Check 1: Verify What We're Sending

Open browser console and look for:
```
[GC-CLIENT] === REDIRECT URL CONSTRUCTION ===
[GC-CLIENT] Hardcoded redirect URL: [URL HERE]
```

Copy that exact URL and make sure it matches what's in GoCardless Dashboard **EXACTLY** (character for character).

### Check 2: Environment Mismatch

Make sure you're using:
- **Sandbox Client ID** with sandbox redirect URIs (for testing)
- **Live Client ID** with production redirect URIs (for production)

### Check 3: Check for Old Redirect URIs

If you had old redirect URIs registered (like `/settings?gocardless=callback`), you can either:
- Remove the old ones (if not needed)
- Keep both (GoCardless allows multiple)

### Check 4: Contact GoCardless Support

If the redirect URI is added correctly but still doesn't work, there might be a delay in propagation. Contact GoCardless support if it persists.

---

## Summary

**Action Required:** Add this redirect URI to GoCardless Dashboard:

Development:
```
http://localhost:8080/gocardless-callback
```

Production:
```
https://solowipe.co.uk/gocardless-callback
```

**Location:** GoCardless Dashboard → Settings → API → Redirect URIs

**Critical:** Must match EXACTLY (no trailing slash, correct protocol, correct port)

