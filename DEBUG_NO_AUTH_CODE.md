# Debug: No Authorization Code in URL

## 🔍 Problem

The callback page is being hit but GoCardless didn't redirect with the `code` parameter. This means GoCardless rejected the OAuth request or the redirect URI doesn't match.

## ✅ Quick Diagnostic Steps

### Step 1: Check What Redirect URI Was Sent

Check the browser console for logs that show what redirect URI was constructed:

Look for:
```
[GC-CLIENT] === REDIRECT URL CONSTRUCTION ===
[GC-CLIENT] Hardcoded redirect URL: https://solowipe.co.uk/gocardless-callback
```

Or check Supabase Edge Function logs:
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click on `gocardless-connect`
3. Check the logs for the most recent invocation
4. Look for: `Using dynamic redirect_uri: ...`

### Step 2: Verify GoCardless Dashboard Configuration

**For Sandbox Environment:**
1. Go to: https://manage-sandbox.gocardless.com/settings/api
2. Login to your sandbox account
3. Scroll to "Redirect URIs" section
4. Verify the exact redirect URI is registered

**For Live Environment:**
1. Go to: https://manage.gocardless.com/settings/api
2. Login to your live account
3. Scroll to "Redirect URIs" section
4. Verify the exact redirect URI is registered

### Step 3: Check Exact Match Requirements

The redirect URI must match EXACTLY:

✅ **DO:**
- `https://solowipe.co.uk/gocardless-callback` (production)
- `http://localhost:5173/gocardless-callback` (local dev, replace 5173 with your port)

❌ **DON'T:**
- `https://solowipe.co.uk/gocardless-callback/` ❌ (trailing slash)
- `http://solowipe.co.uk/gocardless-callback` ❌ (wrong protocol for production)
- `https://www.solowipe.co.uk/gocardless-callback` ❌ (www vs non-www)

### Step 4: Check Environment Match

**CRITICAL:** The Client ID and Redirect URIs must be in the SAME environment:

- **Sandbox Client ID** → **Sandbox Dashboard** → **Sandbox Redirect URIs**
- **Live Client ID** → **Live Dashboard** → **Live Redirect URIs**

Check your Supabase secrets:
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/settings/functions
2. Check `GOCARDLESS_ENVIRONMENT` value:
   - If `sandbox` → Use sandbox dashboard and sandbox Client ID
   - If `live` → Use live dashboard and live Client ID

### Step 5: Check Full URL in Browser

When you're redirected back to the callback page, check the full URL in your browser:

**Good (has code):**
```
https://solowipe.co.uk/gocardless-callback?code=abc123...&state=xyz...
```

**Bad (no code - your situation):**
```
https://solowipe.co.uk/gocardless-callback
```

If there's no `code` parameter, GoCardless didn't redirect with it, which means:
- Redirect URI not registered, OR
- Redirect URI doesn't match, OR
- User cancelled authorization, OR
- Environment mismatch

## 🔧 Common Fixes

### Fix 1: Register Redirect URI in Dashboard

1. Copy the exact redirect URI from logs (e.g., `https://solowipe.co.uk/gocardless-callback`)
2. Go to correct GoCardless Dashboard (sandbox or live based on environment)
3. Navigate to Settings → API → Redirect URIs
4. Click "Add" or "Add Redirect URI"
5. Paste the exact URI
6. Ensure:
   - No trailing slash
   - Correct protocol (https for production, http for localhost)
   - Correct domain
7. Save

### Fix 2: Check Environment Match

If using sandbox:
- Verify `GOCARDLESS_ENVIRONMENT=sandbox` in Supabase
- Verify using sandbox Client ID
- Verify redirect URI registered in sandbox dashboard

If using live:
- Verify `GOCARDLESS_ENVIRONMENT=live` in Supabase
- Verify using live Client ID
- Verify redirect URI registered in live dashboard

### Fix 3: Wait for Propagation

After adding redirect URI in GoCardless Dashboard:
- Wait 1-2 minutes for changes to propagate
- Clear browser cache
- Try OAuth flow again

## 🧪 Test the Fix

After fixing:

1. **Clear browser cache** (Cmd+Shift+R or Ctrl+Shift+R)
2. **Go to Settings → GoCardless**
3. **Click "Connect GoCardless"**
4. **Complete authorization**
5. **Check callback URL** - should have `?code=...&state=...`

## 📋 Checklist

Before testing again, verify:

- [ ] Redirect URI copied from logs/console
- [ ] Redirect URI registered in correct GoCardless Dashboard (sandbox/live)
- [ ] No trailing slash in redirect URI
- [ ] Correct protocol (https for production)
- [ ] Environment matches (sandbox → sandbox, live → live)
- [ ] Client ID matches environment
- [ ] Waited 1-2 minutes after registering redirect URI
- [ ] Cleared browser cache

## 🔍 Still Not Working?

If it's still not working after following these steps:

1. **Check Edge Function Logs:**
   - Supabase Dashboard → Edge Functions → `gocardless-connect` → Logs
   - Look for the redirect URI that was sent
   - Verify it matches what's in GoCardless Dashboard

2. **Check Browser Console:**
   - Look for `[GC-CLIENT] Hardcoded redirect URL: ...`
   - Copy that exact URL
   - Verify it's registered in GoCardless Dashboard

3. **Check GoCardless Dashboard:**
   - List all registered redirect URIs
   - Compare character-by-character with what was sent
   - Look for:
     - Trailing slashes
     - Protocol differences (http vs https)
     - Domain differences (www vs non-www)
     - Port differences (for localhost)

4. **Try Different Browser:**
   - Sometimes browser extensions interfere
   - Try incognito/private window
   - Try different browser

## 📞 Get More Help

If you need more help, collect this information:

1. **Redirect URI from logs:**
   ```
   [GC-CLIENT] Hardcoded redirect URL: ...
   ```

2. **Redirect URIs registered in GoCardless Dashboard:**
   - List all registered URIs

3. **Environment:**
   - Supabase `GOCARDLESS_ENVIRONMENT` value
   - Which dashboard you're checking (sandbox/live)

4. **Full callback URL:**
   - The complete URL when redirected back (even without code parameter)

5. **Edge Function logs:**
   - From `gocardless-connect` function

