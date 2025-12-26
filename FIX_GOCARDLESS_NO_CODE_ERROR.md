# Fix: "No authorization code received from GoCardless"

## 🚨 The Error

**"No authorization code received from GoCardless. Please try connecting again."**

This means GoCardless redirected back to your app, but the URL doesn't contain an authorization code.

---

## 🔍 Why This Happens

This error occurs when:
1. ❌ **User cancelled** the GoCardless authorization
2. ❌ **Redirect URI mismatch** - GoCardless doesn't send code if URI doesn't match
3. ❌ **GoCardless returned an error** (but error parameter was lost)
4. ❌ **URL was stripped** of query parameters
5. ❌ **Sandbox vs Live mismatch** - using wrong environment

---

## ✅ Quick Fix Steps

### Step 1: Check the Browser URL

When you see the error, **check the URL bar**:

**Good (should have code):**
```
https://solowipe.co.uk/gocardless-callback?code=abc123...&state=xyz...
```

**Bad (no code - what you're seeing):**
```
https://solowipe.co.uk/gocardless-callback
https://solowipe.co.uk/gocardless-callback?error=...
```

### Step 2: Check Browser Console

**Open browser console (F12)** and look for:

```
[GC-CALLBACK-PAGE] Code from URL: MISSING
[GC-CALLBACK-PAGE] Error from URL: [error code]
```

**Check what it says:**
- If there's an `error` parameter → That's the real issue
- If no error and no code → User cancelled or redirect URI issue

### Step 3: Verify Redirect URI (Most Common Cause)

**Even if you don't see a redirect URI error, check this:**

1. **Go to GoCardless Sandbox Dashboard:**
   - https://manage-sandbox.gocardless.com/settings/api
   - Login with your **sandbox account**

2. **Check Redirect URIs:**
   - Find "Redirect URIs" section
   - Verify your redirect URI is registered
   - **For sandbox testing:** Should be your test URL

3. **The redirect URI should be:**
   - **Production:** `https://solowipe.co.uk/gocardless-callback`
   - **Development:** `http://localhost:8080/gocardless-callback` (or your port)
   - **Sandbox testing:** Use your actual test URL

4. **Make sure it matches EXACTLY:**
   - ✅ No trailing slash
   - ✅ Correct protocol
   - ✅ Correct domain/URL
   - ✅ Correct path

### Step 4: Verify You're Using Sandbox Dashboard

**If testing with sandbox account:**

1. **Check you're using Sandbox GoCardless:**
   - Dashboard URL should be: `https://manage-sandbox.gocardless.com`
   - NOT: `https://manage.gocardless.com` (that's live)

2. **Check Supabase Edge Function:**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Verify `GOCARDLESS_ENVIRONMENT` is set to `sandbox`
   - Verify you're using **sandbox Client ID** and **sandbox Client Secret**

3. **Verify Client ID matches:**
   - Supabase secrets should use sandbox credentials
   - GoCardless Dashboard should show sandbox redirect URIs

---

## 🔍 Detailed Troubleshooting

### Issue 1: User Cancelled Authorization

**Symptoms:**
- No code in URL
- No error in URL
- URL just shows callback route with no parameters

**Fix:**
- This is normal - user clicked "Cancel" in GoCardless
- Just try connecting again

### Issue 2: Redirect URI Mismatch (Most Common)

**Symptoms:**
- No code in URL
- May have error parameter like `error=redirect_uri_mismatch`

**Fix:**
1. Check browser console for redirect URI logs
2. Copy the exact redirect URI being sent
3. Add it to GoCardless Dashboard (sandbox if testing)
4. Wait 1-2 minutes
5. Try again

### Issue 3: Sandbox vs Live Environment Mismatch

**Symptoms:**
- Works sometimes, fails other times
- Using sandbox account but live credentials (or vice versa)

**Fix:**
1. Verify `GOCARDLESS_ENVIRONMENT` in Supabase is `sandbox`
2. Verify using sandbox Client ID and Secret
3. Verify redirect URI is in **sandbox** dashboard
4. Make sure you're testing with sandbox GoCardless account

### Issue 4: URL Parameters Stripped

**Symptoms:**
- Code might have been in URL but got stripped
- Router might be removing query parameters

**Fix:**
- Check if your router is configured correctly
- The callback route should preserve query parameters
- Check browser console for full URL before navigation

---

## 🧪 Testing Steps

### Step 1: Check What's in the URL

1. When you see the error, **don't navigate away**
2. **Look at the URL bar** - what parameters do you see?
3. **Open browser console** - check the logs

### Step 2: Check Console Logs

**Look for these logs:**

```
[GC-CALLBACK-PAGE] === CALLBACK HANDLER STARTED ===
[GC-CALLBACK-PAGE] Code from URL: [code or MISSING]
[GC-CALLBACK-PAGE] Error from URL: [error or null]
[GC-CALLBACK-PAGE] State from URL: [state or null]
```

**What to look for:**
- If `Error from URL` has a value → That's the real issue
- If `Code from URL: MISSING` and no error → User cancelled or redirect URI issue

### Step 3: Try the Connection Flow Again

1. **Go to Settings → GoCardless**
2. **Click "Connect GoCardless"**
3. **Complete the authorization** (don't cancel)
4. **Watch the redirect** - check URL bar when redirected back
5. **Check console** for what parameters were received

---

## 📋 Common Scenarios

### Scenario 1: User Cancelled

**What happened:**
- User clicked "Connect GoCardless"
- Redirected to GoCardless
- User clicked "Cancel" or closed the window
- GoCardless redirects back without code

**Fix:**
- This is expected behavior
- User needs to complete authorization

### Scenario 2: Redirect URI Not Registered

**What happened:**
- User clicked "Connect GoCardless"
- Redirected to GoCardless
- GoCardless sees redirect URI doesn't match
- GoCardless redirects back without code (or with error)

**Fix:**
1. Check what redirect URI is being sent (console logs)
2. Add it to GoCardless Dashboard
3. Make sure you're using the right dashboard (sandbox vs live)

### Scenario 3: Wrong Environment

**What happened:**
- Using sandbox GoCardless account
- But redirect URI registered in live dashboard (or vice versa)
- GoCardless doesn't recognize the URI

**Fix:**
1. Verify you're in sandbox dashboard: `manage-sandbox.gocardless.com`
2. Add redirect URI to **sandbox** dashboard
3. Verify Supabase has `GOCARDLESS_ENVIRONMENT=sandbox`

---

## ✅ Quick Checklist

- [ ] Checked browser URL for query parameters
- [ ] Checked browser console for error messages
- [ ] Verified redirect URI is in GoCardless Dashboard
- [ ] Verified using correct dashboard (sandbox vs live)
- [ ] Verified `GOCARDLESS_ENVIRONMENT` is set correctly
- [ ] Verified using correct Client ID (sandbox vs live)
- [ ] Tried connection flow again
- [ ] Completed authorization (didn't cancel)
- [ ] Checked URL bar when redirected back

---

## 🎯 Most Likely Fix

**If you're testing with a sandbox account:**

1. **Go to Sandbox Dashboard:**
   - https://manage-sandbox.gocardless.com/settings/api

2. **Add Redirect URI:**
   - Check what redirect URI the app is using (console or Settings page)
   - Add it to **sandbox** dashboard (not live)

3. **Verify Environment:**
   - Supabase Edge Function → Secrets
   - `GOCARDLESS_ENVIRONMENT` = `sandbox`
   - Using sandbox Client ID and Secret

4. **Try Again:**
   - Wait 1-2 minutes after adding redirect URI
   - Try connecting again
   - Complete the authorization (don't cancel)

---

## 💡 Debug Tips

**Enable Debug Mode:**
1. Go to Settings → GoCardless
2. Click the bug icon (🐛) to enable debug mode
3. Check the debug logs for detailed information

**Check Full URL:**
- Before the page redirects, check what the full URL is
- Copy it from the address bar
- Look for `?code=...` parameter

**Network Tab:**
- Open DevTools → Network tab
- Try connecting again
- Look for the callback request
- Check what parameters were in the URL

