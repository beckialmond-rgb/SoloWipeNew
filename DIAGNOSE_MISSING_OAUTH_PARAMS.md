# Diagnose: GoCardless Redirecting Without Parameters

## 🚨 The Problem

You're being redirected to:
```
https://solowipe.co.uk/gocardless-callback
```

But there are **NO query parameters** (no `?code=...` or `?error=...`).

This means GoCardless IS redirecting back, but **without the OAuth response parameters**.

## 🔍 What This Usually Means

If GoCardless redirects without parameters, it typically indicates:

1. **Redirect URI mismatch** - But then it usually wouldn't redirect at all, OR would redirect with an error
2. **OAuth request issue** - The authorization request might be malformed
3. **GoCardless configuration issue** - Something wrong in GoCardless dashboard
4. **Browser stripping parameters** - Unlikely but possible

## ✅ Diagnostic Steps

### Step 1: Check What's Being Sent to GoCardless

Check Supabase Edge Function logs to see what OAuth URL is being generated:

1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click `gocardless-connect`
3. Check **most recent** logs (from when you clicked "Connect GoCardless")
4. Look for:
   - `Using dynamic redirect_uri: ...`
   - `Full OAuth URL: ...`
   - `State parameter contents: ...`

**Share what redirect_uri is shown in the logs.**

### Step 2: Verify Exact Match in GoCardless Dashboard

1. Copy the exact `redirect_uri` from the logs above
2. Go to GoCardless Dashboard → Settings → API → Redirect URIs
3. Compare **character-by-character** with what's registered

### Step 3: Check OAuth URL Parameters

In the Supabase logs, check the "Full OAuth URL" - it should look like:
```
https://connect-sandbox.gocardless.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=read_write&state=...
```

Verify:
- ✅ `redirect_uri` parameter is present and correct
- ✅ `response_type=code` is present
- ✅ `state` parameter is present

### Step 4: Check GoCardless Authorization Page

When you're redirected to GoCardless authorization page:

1. **Check the URL** - Does it have all the parameters?
2. **Do you see the authorization request?** (permissions, organization name, etc.)
3. **When you click "Allow", what happens?**
   - Immediate redirect back?
   - Any error message?
   - Stay on GoCardless page?

## 🔧 Potential Fixes

### Fix 1: Verify Redirect URI Match

The redirect URI sent MUST match exactly what's registered:

1. Get redirect URI from logs: `Using dynamic redirect_uri: ...`
2. Verify it's registered in GoCardless Dashboard
3. Ensure exact match (no trailing slash, correct protocol, etc.)

### Fix 2: Check Environment Match

1. Check Supabase: `GOCARDLESS_ENVIRONMENT` value
2. Verify you're using correct dashboard:
   - `sandbox` → https://manage-sandbox.gocardless.com
   - `live` → https://manage.gocardless.com

### Fix 3: Try Removing and Re-adding Redirect URI

1. Remove the redirect URI from GoCardless Dashboard
2. Wait 1 minute
3. Add it back using the EXACT value from logs
4. Wait 1-2 minutes
5. Test again

### Fix 4: Check for Multiple Redirect URIs

If you have multiple redirect URIs registered, make sure the one being used is EXACTLY correct.

## 🧪 Quick Test

Try this:

1. **Check browser console** when you click "Connect GoCardless"
2. Look for: `[GC-CLIENT] Hardcoded redirect URL: ...`
3. **Copy that exact value**
4. **Verify it's registered in GoCardless Dashboard**
5. **Compare character-by-character**

## 📋 Information Needed

Please share:

1. **Redirect URI from logs:** `Using dynamic redirect_uri: ...`
2. **Redirect URIs registered in GoCardless Dashboard:** List all of them
3. **Environment:** What's `GOCARDLESS_ENVIRONMENT` set to in Supabase?
4. **Full OAuth URL from logs:** What does the "Full OAuth URL" show?

---

**The fact that you're being redirected but without parameters suggests the redirect URI is registered, but something is wrong with how GoCardless is processing the OAuth response.**

