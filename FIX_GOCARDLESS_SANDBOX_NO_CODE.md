# Fix: "No authorization code received" - Sandbox GoCardless

## 🚨 The Error

**"No authorization code received from GoCardless. Please try connecting again."**

This happens when GoCardless redirects back to your app but doesn't include an authorization code in the URL.

---

## ✅ Quick Fix for Sandbox Testing

### Step 1: Check What Redirect URI is Being Sent

**Before clicking "Connect", check:**

1. Go to **Settings → GoCardless** in your app
2. Look at the **yellow warning box** - it shows the exact redirect URI
3. **Copy that exact URL**

**OR check browser console:**
1. Open browser console (F12)
2. Click "Connect GoCardless"
3. Look for: `[GC-CLIENT] Hardcoded redirect URL: [URL]`
4. Copy that exact URL

### Step 2: Add Redirect URI to SANDBOX Dashboard

**IMPORTANT: Use the SANDBOX dashboard, not live!**

1. **Go to GoCardless Sandbox Dashboard:**
   - Visit: **https://manage-sandbox.gocardless.com/settings/api**
   - ⚠️ **NOT** `manage.gocardless.com` (that's live)
   - Login with your **sandbox account**

2. **Find "Redirect URIs" Section:**
   - Scroll down to **"Redirect URIs"** or **"OAuth Redirect URIs"**
   - Usually below your Client ID

3. **Add the Redirect URI:**
   - Click **"Add"** or **"Add Redirect URI"**
   - Paste the exact URL you copied
   - **CRITICAL:** Must match EXACTLY:
     - ✅ No trailing slash
     - ✅ Correct protocol
     - ✅ Correct domain/URL
     - ✅ Correct path (`/gocardless-callback`)

4. **Click "Save"**

5. **Wait 1-2 minutes** for changes to propagate

### Step 3: Verify Supabase Environment

**Make sure Supabase is configured for sandbox:**

1. **Go to Supabase Dashboard:**
   - Edge Functions → Secrets

2. **Check these secrets:**
   - `GOCARDLESS_ENVIRONMENT` = `sandbox` (not `live`)
   - `GOCARDLESS_CLIENT_ID` = Your **sandbox** Client ID
   - `GOCARDLESS_CLIENT_SECRET` = Your **sandbox** Client Secret

3. **Verify Client ID matches:**
   - The Client ID in Supabase should match the one in GoCardless Sandbox Dashboard
   - They must be from the same environment (both sandbox)

### Step 4: Test Again

1. Clear browser cache (Cmd+Shift+R)
2. Go to Settings → GoCardless
3. Click "Connect GoCardless"
4. **Complete the authorization** (don't cancel)
5. Should work now! ✅

---

## 🔍 Debugging Steps

### Step 1: Check Browser URL When Redirected Back

When you see the error, **look at the URL bar**:

**Good (has code):**
```
https://solowipe.co.uk/gocardless-callback?code=abc123...&state=xyz...
```

**Bad (no code - what you're seeing):**
```
https://solowipe.co.uk/gocardless-callback
https://solowipe.co.uk/gocardless-callback?error=redirect_uri_mismatch
```

**Check for error parameter:**
- If URL has `?error=...` → That's the real issue
- If no parameters at all → Redirect URI mismatch or user cancelled

### Step 2: Check Browser Console

**Open console (F12) and look for:**

```
[GC-CALLBACK-PAGE] === CALLBACK HANDLER STARTED ===
[GC-CALLBACK-PAGE] Code from URL: MISSING
[GC-CALLBACK-PAGE] Error from URL: [error code or null]
```

**What to look for:**
- If `Error from URL` has a value → That's the issue to fix
- If `Code from URL: MISSING` and no error → Redirect URI issue

### Step 3: Verify Complete Flow

**Check each step:**

1. **Click "Connect GoCardless"**
   - Should redirect to GoCardless authorization page
   - URL should be: `https://connect-sandbox.gocardless.com/...` (for sandbox)

2. **Authorize in GoCardless**
   - Click "Authorize" or "Connect"
   - Don't cancel!

3. **Redirected Back**
   - Should redirect to your callback URL
   - **Check URL bar** - does it have `?code=...`?

4. **If no code:**
   - Check if there's an `?error=...` parameter
   - Check browser console for error messages

---

## ⚠️ Common Sandbox Issues

### Issue 1: Using Wrong Dashboard

**Problem:**
- Using live dashboard (`manage.gocardless.com`) instead of sandbox (`manage-sandbox.gocardless.com`)
- Redirect URI registered in wrong environment

**Fix:**
1. Use **Sandbox Dashboard:** https://manage-sandbox.gocardless.com
2. Add redirect URI in **sandbox** dashboard
3. Verify Supabase has `GOCARDLESS_ENVIRONMENT=sandbox`

### Issue 2: Environment Mismatch

**Problem:**
- Supabase using live credentials but testing with sandbox account (or vice versa)
- Client ID doesn't match environment

**Fix:**
1. Verify `GOCARDLESS_ENVIRONMENT=sandbox` in Supabase
2. Verify using **sandbox** Client ID in Supabase
3. Verify redirect URI is in **sandbox** dashboard

### Issue 3: Redirect URI Not Registered

**Problem:**
- Redirect URI not added to sandbox dashboard
- Or added to wrong dashboard (live instead of sandbox)

**Fix:**
1. Check what redirect URI app is sending (console logs)
2. Add it to **sandbox** dashboard
3. Make sure it matches exactly

---

## 📋 Sandbox Setup Checklist

### GoCardless Sandbox Dashboard

- [ ] Using sandbox dashboard: `manage-sandbox.gocardless.com`
- [ ] Logged in with sandbox account
- [ ] Found "Redirect URIs" section
- [ ] Added redirect URI (exact match from app)
- [ ] Saved changes
- [ ] Waited 1-2 minutes

### Supabase Configuration

- [ ] `GOCARDLESS_ENVIRONMENT` = `sandbox`
- [ ] `GOCARDLESS_CLIENT_ID` = Sandbox Client ID
- [ ] `GOCARDLESS_CLIENT_SECRET` = Sandbox Client Secret
- [ ] Client ID matches sandbox dashboard

### Testing

- [ ] Cleared browser cache
- [ ] Tried connecting again
- [ ] Completed authorization (didn't cancel)
- [ ] Checked URL bar for code parameter
- [ ] Checked console for error messages
- [ ] Connection successful ✅

---

## 🎯 Most Likely Fix

**For sandbox testing, the most common issue is:**

1. **Redirect URI not in sandbox dashboard**
   - You added it to live dashboard instead
   - Or forgot to add it at all

2. **Solution:**
   - Go to: **https://manage-sandbox.gocardless.com/settings/api**
   - Add redirect URI there
   - Make sure it matches exactly what the app is sending

---

## 💡 Pro Tips

**The app shows you the redirect URI:**
- Settings → GoCardless → Yellow warning box
- Copy that exact URL
- Add it to sandbox dashboard

**Check the authorization URL:**
- When you click "Connect", check where it redirects
- Sandbox should go to: `https://connect-sandbox.gocardless.com/...`
- Live would go to: `https://connect.gocardless.com/...`
- If it goes to live URL but you're testing sandbox → Environment mismatch!

**Double-check environment:**
- Supabase secrets should use sandbox credentials
- GoCardless dashboard should be sandbox
- Testing should use sandbox account

---

## 🚨 Still Not Working?

### Check These:

1. **Full URL when redirected:**
   - Copy the entire URL from address bar
   - Check what parameters it has
   - Share the URL (with sensitive parts redacted)

2. **Console logs:**
   - Copy all `[GC-CALLBACK-PAGE]` logs
   - Check what redirect URI was sent
   - Check what error (if any) was received

3. **Supabase Edge Function logs:**
   - Go to Supabase Dashboard → Edge Functions → gocardless-connect → Logs
   - Check for errors when you click "Connect"

4. **Environment verification:**
   - Confirm `GOCARDLESS_ENVIRONMENT=sandbox` in Supabase
   - Confirm using sandbox Client ID
   - Confirm redirect URI in sandbox dashboard

