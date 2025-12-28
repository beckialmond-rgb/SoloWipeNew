# Quick Fix: No Authorization Code

## 🚨 Problem

You're seeing "No authorization code in URL" - this means GoCardless didn't redirect with the `code` parameter.

## ⚡ Quick Fix (Most Common Issue)

**99% of the time, this is because the redirect URI is not registered in GoCardless Dashboard.**

### Step 1: Find Your Redirect URI

Open your browser console (F12) and look for:
```
[GC-CLIENT] Hardcoded redirect URL: https://solowipe.co.uk/gocardless-callback
```

Or check Supabase logs:
- Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
- Click `gocardless-connect`
- Check logs for: `Using dynamic redirect_uri: ...`

### Step 2: Register in GoCardless Dashboard

**If using SANDBOX:**
1. Go to: https://manage-sandbox.gocardless.com/settings/api
2. Find "Redirect URIs" section
3. Click "Add" or "Add Redirect URI"
4. Paste: `https://solowipe.co.uk/gocardless-callback` (or your exact URI from Step 1)
5. Make sure: NO trailing slash, correct protocol (https)
6. Save

**If using LIVE:**
1. Go to: https://manage.gocardless.com/settings/api
2. Find "Redirect URIs" section
3. Click "Add" or "Add Redirect URI"
4. Paste: `https://solowipe.co.uk/gocardless-callback` (or your exact URI from Step 1)
5. Make sure: NO trailing slash, correct protocol (https)
6. Save

### Step 3: Verify Environment Match

Check your Supabase environment:
- Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/settings/functions
- Check `GOCARDLESS_ENVIRONMENT` value
- **If `sandbox`** → Use sandbox dashboard
- **If `live`** → Use live dashboard

The Client ID and Redirect URIs must be in the SAME environment!

### Step 4: Test

1. Wait 1-2 minutes after adding redirect URI
2. Clear browser cache (Cmd+Shift+R)
3. Try OAuth flow again
4. Should now work! ✅

## 🔍 Still Not Working?

See [DEBUG_NO_AUTH_CODE.md](./DEBUG_NO_AUTH_CODE.md) for detailed troubleshooting.





