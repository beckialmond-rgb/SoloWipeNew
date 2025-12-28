# 🚨 CRITICAL FIX: No Authorization Code Error

## The Problem

You're getting "No authorization code received from GoCardless" - this means GoCardless is **not redirecting back with the `code` parameter**.

**This happens when the redirect URI is NOT registered in GoCardless Dashboard.**

---

## ✅ STEP-BY-STEP FIX (5 minutes)

### Step 1: Find Your Exact Redirect URI

Your app is using this redirect URI (based on your logs):
```
https://solowipe.co.uk/gocardless-callback
```

**To verify, check your browser console when clicking "Connect GoCardless":**
- Look for: `[GC-CLIENT] Hardcoded redirect URL: ...`
- Or check Supabase logs: Dashboard → Edge Functions → `gocardless-connect` → Logs
- Look for: `Using dynamic redirect_uri: ...`

### Step 2: Go to GoCardless SANDBOX Dashboard

Since your environment is **SANDBOX**, you MUST use the SANDBOX dashboard:

1. **Go to:** https://manage-sandbox.gocardless.com/settings/api
2. **Login** to your sandbox account
3. **If you don't have a sandbox account:**
   - You need to create one at: https://manage-sandbox.gocardless.com/signup
   - Or check if you're using live environment instead

### Step 3: Navigate to Redirect URIs Section

1. Scroll down to find **"Redirect URIs"** or **"OAuth Redirect URIs"** section
2. This is usually below your Client ID

### Step 4: Add the Redirect URI

1. Click **"Add"** or **"Add Redirect URI"** button
2. Paste this EXACT value:
   ```
   https://solowipe.co.uk/gocardless-callback
   ```
3. **CRITICAL - Verify:**
   - ✅ NO trailing slash (NOT `/gocardless-callback/`)
   - ✅ Correct protocol (`https://`)
   - ✅ Correct domain (`solowipe.co.uk` - no www)
   - ✅ Correct path (`/gocardless-callback`)

4. Click **"Save"** or **"Add"**

### Step 5: Verify It's Added

1. Check the list of redirect URIs
2. You should see: `https://solowipe.co.uk/gocardless-callback`
3. Make sure it matches EXACTLY (character for character)

### Step 6: Wait and Test

1. **Wait 1-2 minutes** for changes to propagate
2. **Clear your browser cache** (Cmd+Shift+R or Ctrl+Shift+R)
3. **Go to your app** → Settings → GoCardless
4. **Click "Connect GoCardless"**
5. **Complete authorization**
6. **Should now redirect with code parameter!** ✅

---

## 🔍 If You're Using LIVE Environment

If your `GOCARDLESS_ENVIRONMENT` is set to `live`, use the LIVE dashboard instead:

1. **Go to:** https://manage.gocardless.com/settings/api
2. Follow the same steps above
3. Add the same redirect URI: `https://solowipe.co.uk/gocardless-callback`

---

## ✅ Verification Checklist

Before testing, verify:

- [ ] Redirect URI copied exactly: `https://solowipe.co.uk/gocardless-callback`
- [ ] Registered in correct dashboard (SANDBOX if environment is sandbox, LIVE if environment is live)
- [ ] No trailing slash
- [ ] Correct protocol (https)
- [ ] Correct domain (no www)
- [ ] Saved successfully
- [ ] Waited 1-2 minutes after adding
- [ ] Cleared browser cache

---

## 🧪 How to Verify It's Working

After registering, when you complete authorization, you should be redirected to:

**✅ Good (has code):**
```
https://solowipe.co.uk/gocardless-callback?code=abc123...&state=xyz...
```

**❌ Bad (no code - current issue):**
```
https://solowipe.co.uk/gocardless-callback
```

---

## 🆘 Still Not Working?

### Check 1: Verify Environment Match

1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/settings/functions
2. Check `GOCARDLESS_ENVIRONMENT` value:
   - If `sandbox` → Must use SANDBOX dashboard
   - If `live` → Must use LIVE dashboard
3. Verify Client ID matches environment

### Check 2: Verify Exact Match

Compare character-by-character:
- What's registered in dashboard: `https://solowipe.co.uk/gocardless-callback`
- What's in your logs: `Using dynamic redirect_uri: ...`

They must match EXACTLY.

### Check 3: Check Recent Logs

1. Go to Supabase Dashboard → Edge Functions → `gocardless-connect`
2. Check recent logs (last few minutes)
3. Look for: `Using dynamic redirect_uri: ...`
4. Copy that exact value
5. Verify it matches what's in GoCardless Dashboard

---

## 📞 Quick Diagnostic

Run this in your browser console when testing:

```javascript
// Check what redirect URI was used
localStorage.getItem('gocardless_redirect_url')
```

This should return: `https://solowipe.co.uk/gocardless-callback`

Then verify this EXACT value is in your GoCardless Dashboard.

---

**This is a configuration issue, not a code issue. The redirect URI MUST be registered in GoCardless Dashboard for OAuth to work.**





