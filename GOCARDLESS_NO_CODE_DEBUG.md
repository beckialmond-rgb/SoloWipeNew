# Debug: "No authorization code received from GoCardless"

## Quick Diagnosis Steps

### Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the **Console** tab
3. Look for logs starting with `[GC-CALLBACK-PAGE]` or `[GC-CLIENT]`
4. Check for any error messages

**What to look for:**
- `[GC-CALLBACK-PAGE] Code from URL:` - Should show a code or "MISSING"
- `[GC-CALLBACK-PAGE] Error from URL:` - Check if GoCardless returned an error
- Any redirect URI mismatch errors

### Step 2: Check the URL

When you're on the error page, look at the browser's address bar:

**Good URL (should have code):**
```
https://solowipe.co.uk/gocardless-callback?code=abc123&state=xyz789
```

**Bad URL (no code):**
```
https://solowipe.co.uk/gocardless-callback
```

**Error URL (GoCardless returned error):**
```
https://solowipe.co.uk/gocardless-callback?error=access_denied&error_description=...
```

### Step 3: Common Causes

#### Cause 1: Redirect URI Mismatch (Most Common)

**Symptoms:**
- No code in URL
- No error parameter either
- You're redirected back but GoCardless never showed the authorization page

**Fix:**
1. Go to GoCardless Dashboard → Settings → API → Redirect URIs
2. Verify this EXACT URL is registered: `https://solowipe.co.uk/gocardless-callback`
3. Check:
   - ✅ No trailing slash
   - ✅ Correct protocol (https)
   - ✅ Correct domain (solowipe.co.uk, not www.solowipe.co.uk)
   - ✅ Correct path (/gocardless-callback)

#### Cause 2: User Cancelled Authorization

**Symptoms:**
- URL has `error=access_denied` parameter
- You saw the GoCardless login page but cancelled

**Fix:**
- Try connecting again and complete the authorization

#### Cause 3: Wrong Environment (Sandbox vs Live)

**Symptoms:**
- Using sandbox Client ID but redirect URI registered in live (or vice versa)

**Fix:**
1. Check Supabase Edge Functions → Secrets → `GOCARDLESS_ENVIRONMENT`
2. Should be `sandbox` for testing, `live` for production
3. Make sure redirect URI is registered in the SAME environment as your Client ID

#### Cause 4: OAuth Flow Never Started

**Symptoms:**
- No localStorage data
- Error message says "Connection session not found"

**Fix:**
1. Go to Settings → GoCardless
2. Click "Connect GoCardless" button
3. Make sure you're redirected to GoCardless OAuth page
4. Complete the authorization

---

## Detailed Debugging

### Check localStorage

1. Open browser console (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Look for localStorage items:
   - `gocardless_session_token`
   - `gocardless_user_id`
   - `gocardless_redirect_url`
   - `gocardless_state`

**If these are missing:**
- The OAuth flow didn't start properly
- Try clicking "Connect GoCardless" again

### Check Network Tab

1. Open browser console (F12)
2. Go to **Network** tab
3. Try connecting again
4. Look for:
   - Request to `gocardless-connect` function
   - Redirect to GoCardless OAuth page
   - Redirect back to callback page

**What to check:**
- Does the `gocardless-connect` function return a URL?
- Are you redirected to GoCardless?
- What URL does GoCardless redirect you back to?

### Check Supabase Edge Function Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click on `gocardless-connect`
3. Go to **Logs** tab
4. Look for errors or warnings

**Common errors:**
- `GoCardless not configured` → Missing `GOCARDLESS_CLIENT_ID`
- `Invalid redirect URL` → Domain not in trusted list
- `Unauthorized` → Authentication issue

---

## Step-by-Step Fix

### Fix 1: Verify Redirect URI Registration

1. **Go to GoCardless Dashboard:**
   - https://manage.gocardless.com/settings/api (for live)
   - https://manage-sandbox.gocardless.com/settings/api (for sandbox)

2. **Check Redirect URIs section:**
   - Should have: `https://solowipe.co.uk/gocardless-callback`
   - Must match EXACTLY (no trailing slash, correct protocol)

3. **If missing or incorrect:**
   - Click "Add redirect URI" or edit existing
   - Add: `https://solowipe.co.uk/gocardless-callback`
   - Save

4. **Wait 1-2 minutes** for changes to propagate

5. **Try connecting again**

### Fix 2: Clear Browser Data

1. Clear localStorage:
   - Open browser console (F12)
   - Go to **Application** tab → **Local Storage**
   - Delete all `gocardless_*` items
   - Or run: `localStorage.clear()` in console

2. Clear cookies for GoCardless:
   - Go to browser settings
   - Clear cookies for `gocardless.com` and `solowipe.co.uk`

3. Try connecting again

### Fix 3: Check Environment Variables

1. **Go to Supabase Dashboard:**
   - Edge Functions → Secrets

2. **Verify these are set:**
   - `GOCARDLESS_CLIENT_ID` - Should match your GoCardless Dashboard
   - `GOCARDLESS_CLIENT_SECRET` - Should match your GoCardless Dashboard
   - `GOCARDLESS_ENVIRONMENT` - Should be `sandbox` or `live`
   - `GOCARDLESS_WEBHOOK_SECRET` - Should match GoCardless webhook secret

3. **Verify environment matches:**
   - If `GOCARDLESS_ENVIRONMENT=sandbox`, use sandbox Client ID
   - If `GOCARDLESS_ENVIRONMENT=live`, use live Client ID
   - Redirect URI must be registered in the SAME environment

### Fix 4: Test with Browser Console

1. Open browser console (F12)
2. Go to Settings → GoCardless
3. Before clicking "Connect", run this in console:

```javascript
// Check what redirect URL will be used
const isProduction = window.location.hostname === 'solowipe.co.uk' || window.location.hostname === 'www.solowipe.co.uk';
const redirectUrl = isProduction 
  ? 'https://solowipe.co.uk/gocardless-callback'
  : `${window.location.origin}/gocardless-callback`;
console.log('Redirect URL that will be sent:', redirectUrl);
```

4. Copy this URL
5. Verify it matches EXACTLY what's in GoCardless Dashboard

---

## Still Not Working?

### Enable Debug Mode

1. Go to Settings → GoCardless
2. Click the bug icon (🐛) to enable debug mode
3. Try connecting again
4. Check the debug logs for detailed information

### Check GoCardless Dashboard

1. Go to GoCardless Dashboard → Settings → API
2. Check your **Client ID** matches what's in Supabase
3. Verify you're in the correct environment (sandbox vs live)
4. Check if there are any error messages or warnings

### Contact Support

If none of the above fixes work, gather this information:

1. **Browser console logs** (copy all `[GC-CALLBACK-PAGE]` and `[GC-CLIENT]` logs)
2. **URL when error occurs** (copy the full URL from address bar)
3. **Screenshot of GoCardless Dashboard** → Settings → API → Redirect URIs
4. **Supabase Edge Function logs** for `gocardless-connect` and `gocardless-callback`
5. **Environment** (sandbox or live)
6. **Redirect URI** you're trying to use

---

## Quick Checklist

- [ ] Redirect URI registered in GoCardless Dashboard: `https://solowipe.co.uk/gocardless-callback`
- [ ] Redirect URI matches EXACTLY (no trailing slash, correct protocol)
- [ ] Environment matches (sandbox Client ID → sandbox redirect URIs, live Client ID → live redirect URIs)
- [ ] `GOCARDLESS_CLIENT_ID` in Supabase matches GoCardless Dashboard
- [ ] `GOCARDLESS_ENVIRONMENT` is set correctly in Supabase
- [ ] Browser console shows no errors
- [ ] You're redirected to GoCardless OAuth page when clicking "Connect"
- [ ] You complete the authorization (don't cancel)
- [ ] URL has `?code=...` parameter when redirected back

---

**Most Common Fix:** Register the redirect URI in GoCardless Dashboard if it's missing or doesn't match exactly.





