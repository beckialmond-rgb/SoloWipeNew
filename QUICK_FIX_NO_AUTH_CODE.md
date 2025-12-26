# Quick Fix: "No authorization code received from GoCardless"

## 🎯 Most Likely Cause
The redirect URI isn't registered in your GoCardless **Sandbox** Dashboard.

---

## ✅ 3-Step Fix (Sandbox Testing)

### Step 1: Find Your Redirect URI

**Option A - From the App:**
1. Go to **Settings → GoCardless** in your app
2. Look at the yellow warning box - it shows the redirect URI
3. Copy that exact URL

**Option B - From Browser Console:**
1. Open browser console (F12)
2. Click "Connect GoCardless"
3. Look for: `[GC-CLIENT] Hardcoded redirect URL: [URL]`
4. Copy that exact URL

**Common redirect URIs:**
- Production: `https://solowipe.co.uk/gocardless-callback`
- Development: `http://localhost:5173/gocardless-callback` (or your port)

### Step 2: Add to GoCardless Sandbox Dashboard

1. **Go to Sandbox Dashboard:**
   - Visit: **https://manage-sandbox.gocardless.com/settings/api**
   - ⚠️ **NOT** `manage.gocardless.com` (that's live/production)
   - Login with your **sandbox account**

2. **Find "Redirect URIs" Section:**
   - Scroll down to find "Redirect URIs" or "OAuth Redirect URIs"

3. **Add Your Redirect URI:**
   - Click "Add" or "Add Redirect URI"
   - Paste the exact URL you copied
   - **Must match EXACTLY:**
     - ✅ No trailing slash (NOT `/gocardless-callback/`)
     - ✅ Correct protocol (`https://` for production, `http://` for localhost)
     - ✅ Correct domain
     - ✅ Correct path (`/gocardless-callback`)

4. **Save and wait 1-2 minutes**

### Step 3: Verify Supabase Configuration

1. **Go to Supabase Dashboard:**
   - Edge Functions → Secrets

2. **Check these settings:**
   - `GOCARDLESS_ENVIRONMENT` = `sandbox` (for testing)
   - `GOCARDLESS_CLIENT_ID` = Your **sandbox** Client ID
   - `GOCARDLESS_CLIENT_SECRET` = Your **sandbox** Client Secret

3. **Verify Client ID matches:**
   - The Client ID in Supabase should match the one in GoCardless Sandbox Dashboard

---

## 🔍 Troubleshooting

### Check Browser URL When Error Appears

Look at the URL bar - do you see:
- `?error=redirect_uri_mismatch` → Redirect URI not registered
- No parameters at all → User cancelled or redirect URI issue
- `?code=...` → Should work, but code is being lost somewhere

### Check Browser Console

Open console (F12) and look for:
```
[GC-CALLBACK-PAGE] Code from URL: MISSING
[GC-CALLBACK-PAGE] Error from URL: [error code]
```

### Try Again

1. Clear browser cache (Cmd+Shift+R)
2. Go to Settings → GoCardless
3. Click "Connect GoCardless"
4. **Complete authorization** (don't cancel!)
5. Should work now ✅

---

## ⚠️ Common Mistakes

❌ **Wrong Dashboard:**
- Using `manage.gocardless.com` instead of `manage-sandbox.gocardless.com`
- Redirect URI added to live dashboard instead of sandbox

❌ **Environment Mismatch:**
- Using live Client ID but testing with sandbox account
- `GOCARDLESS_ENVIRONMENT` set to `live` but testing sandbox

❌ **Redirect URI Typos:**
- Trailing slash: `/gocardless-callback/` (wrong)
- Wrong protocol: `http://` for production
- Wrong domain: `localhost` when testing production

---

## 📋 Quick Checklist

- [ ] Found redirect URI from app/console
- [ ] Opened **sandbox** dashboard (`manage-sandbox.gocardless.com`)
- [ ] Added redirect URI (exact match, no trailing slash)
- [ ] Verified `GOCARDLESS_ENVIRONMENT=sandbox` in Supabase
- [ ] Verified using sandbox Client ID
- [ ] Waited 1-2 minutes
- [ ] Cleared browser cache
- [ ] Tried connecting again
- [ ] Completed authorization (didn't cancel)
- [ ] Connection successful ✅

---

## 🚨 Still Not Working?

**Check these:**

1. **What URL are you testing on?**
   - `localhost:5173` → Need redirect URI for `http://localhost:5173/gocardless-callback`
   - `solowipe.co.uk` → Need redirect URI for `https://solowipe.co.uk/gocardless-callback`

2. **What environment are you using?**
   - Sandbox account → Must use sandbox dashboard and sandbox credentials
   - Live account → Must use live dashboard and live credentials

3. **Check Supabase Edge Function logs:**
   - Supabase Dashboard → Edge Functions → gocardless-connect → Logs
   - Look for errors when you click "Connect"

---

**For more detailed troubleshooting, see:**
- `FIX_GOCARDLESS_SANDBOX_NO_CODE.md` (detailed sandbox guide)
- `FIX_GOCARDLESS_NO_CODE_ERROR.md` (general troubleshooting)

