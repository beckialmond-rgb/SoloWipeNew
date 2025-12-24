# GoCardless Redirect URI Mismatch - Fix Instructions

**Error:** "The provided redirect_uri does not match the one for the client_id"  
**HTTP Error:** 400 Bad Request

---

## Quick Fix Steps

### Step 1: Find Your Redirect URI

**Option A: Check Browser Console**
1. Open browser console (F12 or Cmd+Option+I)
2. Click "Connect GoCardless" button
3. Look for: `[GC-CLIENT] Hardcoded redirect URL: [URL HERE]`
4. Copy that exact URL

**Option B: Enable Debug Mode**
1. In Settings → GoCardless section, click the bug icon (🐛)
2. The redirect URI will be displayed in the debug panel
3. Copy the exact URL shown

**Option C: Calculate It**
- **Production:** `https://solowipe.co.uk/gocardless-callback`
- **Development:** `http://localhost:[PORT]/gocardless-callback` (replace [PORT] with your dev server port, usually 5173)

---

### Step 2: Add to GoCardless Dashboard

1. **Go to GoCardless Dashboard:**
   - Visit: https://manage.gocardless.com/
   - Login to your account

2. **Navigate to API Settings:**
   - Click **"Settings"** in top menu
   - Click **"API"** in left sidebar
   - Or go directly: https://manage.gocardless.com/settings/api

3. **Find "Redirect URIs" Section:**
   - Scroll down to find **"Redirect URIs"** or **"OAuth Redirect URIs"**
   - This is usually below your Client ID

4. **Add the Redirect URI:**
   - Click **"Add"** or **"Add Redirect URI"** button
   - Paste the exact URL you copied (from Step 1)
   - **CRITICAL:** Make sure it matches EXACTLY:
     - ✅ No trailing slash (NOT `/gocardless-callback/`)
     - ✅ Correct protocol (`https://` for production, `http://` for localhost)
     - ✅ Correct hostname (exactly as shown)
     - ✅ Correct path (`/gocardless-callback`)

5. **Click "Save" or "Add"**

---

### Step 3: Verify Environment Match

**Check Your Environment:**
- **Sandbox (Testing):** Use sandbox Client ID → Add sandbox redirect URIs
- **Live (Production):** Use live Client ID → Add production redirect URIs

**Mismatch will cause the error!**

---

### Step 4: Test Connection

1. **Wait 1-2 minutes** for changes to propagate
2. **Clear browser cache** or hard refresh (Cmd+Shift+R)
3. **Try connecting again** from Settings → GoCardless section
4. **Check console** for any errors

---

## Common Mistakes to Avoid

❌ **DON'T add:**
- `https://solowipe.co.uk/gocardless-callback/` (trailing slash)
- `http://solowipe.co.uk/gocardless-callback` (wrong protocol for production)
- `https://www.solowipe.co.uk/gocardless-callback` (www vs non-www mismatch)
- `http://localhost/gocardless-callback` (missing port)

✅ **DO add:**
- `https://solowipe.co.uk/gocardless-callback` (exact match, no trailing slash)
- `http://localhost:5173/gocardless-callback` (with correct port)

---

## Multiple Environments

If you're testing in both development and production, add **BOTH** URIs:

1. `http://localhost:5173/gocardless-callback` (development)
2. `https://solowipe.co.uk/gocardless-callback` (production)

GoCardless allows multiple redirect URIs per client.

---

## Still Not Working?

### Check 1: Verify Exact Match
- Copy redirect URI from browser console
- Compare character-by-character with GoCardless Dashboard
- Check for hidden characters or spaces

### Check 2: Environment Mismatch
- Sandbox Client ID → Must use sandbox redirect URIs
- Live Client ID → Must use production redirect URIs

### Check 3: Port Number
- Development server might be on different port
- Check your terminal for the actual port (e.g., `localhost:5173`)
- Add redirect URI with correct port

### Check 4: Wait for Propagation
- Changes can take 1-2 minutes to propagate
- Try again after waiting

---

## Need Help?

1. **Enable Debug Mode:**
   - Click bug icon in GoCardless section
   - Check debug logs for detailed information

2. **Check Browser Console:**
   - Look for `[GC-CLIENT]` logs
   - Find the exact redirect URI being sent

3. **Check Supabase Logs:**
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for `gocardless-connect` function logs

---

## Summary

**The fix is simple:**
1. Find the redirect URI (from console or debug mode)
2. Add it to GoCardless Dashboard → Settings → API → Redirect URIs
3. Make sure it matches EXACTLY (no trailing slash, correct protocol, correct hostname)
4. Ensure environment matches (sandbox vs live)

**That's it!** Once the redirect URI is registered, the connection will work.

