# Production OAuth Setup - Complete Guide

## 🎯 Current Status

- **Site URL:** `localhost` ❌ (needs to be `https://solowipe.co.uk`)
- **Redirect URLs:** Only `solowipe.netlify.app` ❌ (needs `solowipe.co.uk`)

## ✅ Production Configuration Steps

### Step 1: Update Supabase Site URL

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your **production project**

2. **Navigate to Authentication:**
   - Click "Authentication" in left sidebar
   - Click "URL Configuration"

3. **Update Site URL:**
   - Find "Site URL" field
   - **Current:** `http://localhost:8080` (or similar)
   - **Change to:** `https://solowipe.co.uk`
   - ✅ Use `https://` (required for production)
   - ✅ No trailing slash
   - Click "Save"

### Step 2: Add Production Redirect URLs

**In the same "URL Configuration" page:**

1. **Find "Redirect URLs" section**

2. **Add Primary Production URLs:**
   - Click "Add URL"
   - Add: `https://solowipe.co.uk/dashboard`
   - Click "Add URL" again
   - Add: `https://solowipe.co.uk/*`
   - These are your **primary** production URLs

3. **Keep Netlify URLs (as fallback):**
   - You already have: `solowipe.netlify.app`
   - Make sure these are also added:
     - `https://solowipe.netlify.app/dashboard`
     - `https://solowipe.netlify.app/*`
   - These serve as fallback if custom domain has issues

4. **Remove Localhost (if present):**
   - Remove any `http://localhost:8080` URLs
   - These are for development only

5. **Click "Save"**

### Step 3: Configure Google Provider

**Still in Authentication settings:**

1. **Go to "Providers" → "Google"**

2. **Verify Provider Settings:**
   - ✅ Google provider is **Enabled**
   - ✅ Client ID is set (from Google Cloud Console)
   - ✅ Client Secret is set (from Google Cloud Console)

3. **Nonce Checks - Production Decision:**

   **Option A: Secure (Recommended)**
   - ⚠️ **Disable** "Skip nonce checks" (more secure)
   - Test OAuth on desktop and mobile
   - If it works, keep it disabled ✅
   
   **Option B: Mobile Compatibility**
   - ✅ **Enable** "Skip nonce checks" (if mobile OAuth fails)
   - Less secure but ensures mobile works
   - Document this in security notes

   **Recommendation:**
   - Start with nonce checks **enabled** (secure)
   - Test thoroughly on mobile
   - Only disable if mobile OAuth fails
   - Document the decision

### Step 4: Verify Google Cloud Console

**Make sure Google Cloud Console has:**

1. **Authorized Redirect URI:**
   - `https://[your-project-id].supabase.co/auth/v1/callback`
   - This is the Supabase callback URL
   - **Same for all environments** (dev, staging, production)

2. **OAuth Consent Screen:**
   - App should be **Published** (not in "Testing" mode)
   - Or test users added if still in testing
   - Production domain verified: `solowipe.co.uk`

---

## 📋 Complete Production Checklist

### Supabase Configuration

- [ ] Site URL: `https://solowipe.co.uk` (not localhost)
- [ ] Redirect URL: `https://solowipe.co.uk/dashboard`
- [ ] Redirect URL: `https://solowipe.co.uk/*`
- [ ] Redirect URL: `https://solowipe.netlify.app/dashboard` (fallback)
- [ ] Redirect URL: `https://solowipe.netlify.app/*` (fallback)
- [ ] Localhost URLs removed (if present)
- [ ] Google provider enabled
- [ ] Google Client ID configured
- [ ] Google Client Secret configured
- [ ] Nonce checks configured (enabled for security, disabled if mobile breaks)

### Google Cloud Console

- [ ] Redirect URI: `https://[project-id].supabase.co/auth/v1/callback`
- [ ] OAuth consent screen published (or test users added)
- [ ] Production domain verified: `solowipe.co.uk`
- [ ] Scopes configured correctly

### Testing

- [ ] Test OAuth on desktop: `https://solowipe.co.uk`
- [ ] Test OAuth on mobile: `https://solowipe.co.uk`
- [ ] Test OAuth on Netlify URL: `https://solowipe.netlify.app` (fallback)
- [ ] Verify redirects to dashboard (not landing page)
- [ ] Verify user is logged in after OAuth
- [ ] Check Supabase Auth Logs for any errors
- [ ] Test both new sign-ups and existing user logins

---

## 🔍 Finding Your Supabase Project ID

**To find your Supabase project ID:**

1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → API
4. Look for "Project URL" - it will be: `https://[project-id].supabase.co`
5. The callback URL is: `https://[project-id].supabase.co/auth/v1/callback`

**Example:**
- Project URL: `https://owqjyaiptexqwafzmcwy.supabase.co`
- Callback URL: `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback`

---

## 🚨 Important Notes

### Site URL vs Redirect URLs

- **Site URL:** The main domain of your app (used for email links, password resets, etc.)
- **Redirect URLs:** Allowed URLs where OAuth can redirect back to your app
- **Both must use HTTPS** in production

### Multiple Domains

**You have two domains:**
1. **Primary:** `solowipe.co.uk` (custom domain)
2. **Fallback:** `solowipe.netlify.app` (Netlify subdomain)

**Best Practice:**
- Set **Site URL** to primary: `https://solowipe.co.uk`
- Add **both** to redirect URLs (primary + fallback)
- This ensures OAuth works on both domains

### Development vs Production

**For Production:**
- ✅ Use `https://solowipe.co.uk` as Site URL
- ✅ Add production redirect URLs
- ❌ Remove localhost URLs
- ✅ Use production Google OAuth credentials

**For Development:**
- Use separate Supabase project, OR
- Keep localhost URLs in a separate environment
- Use test/sandbox credentials

---

## ✅ After Configuration

### Test OAuth Flow:

1. **Desktop Test:**
   - Go to: `https://solowipe.co.uk`
   - Click "Sign in with Google"
   - Should redirect to Google
   - After authentication, should redirect to dashboard
   - Should be logged in ✅

2. **Mobile Test:**
   - Go to: `https://solowipe.co.uk`
   - Click "Sign in with Google"
   - Should redirect to Google
   - After authentication, should redirect to dashboard
   - Should be logged in ✅

3. **Netlify Fallback Test:**
   - Go to: `https://solowipe.netlify.app`
   - Click "Sign in with Google"
   - Should also work (using fallback URLs) ✅

### Check Logs:

1. **Supabase Auth Logs:**
   - Dashboard → Logs → Auth Logs
   - Look for successful OAuth callbacks
   - Check for any errors

2. **Browser Console:**
   - Check for: `[OAuth] Redirect URL: https://solowipe.co.uk/dashboard`
   - Check for: `[Auth State Change] { event: 'SIGNED_IN' }`
   - No error messages

---

## 🎯 Quick Reference

### Supabase URLs to Configure:

**Site URL:**
```
https://solowipe.co.uk
```

**Redirect URLs (add all):**
```
https://solowipe.co.uk/dashboard
https://solowipe.co.uk/*
https://solowipe.netlify.app/dashboard
https://solowipe.netlify.app/*
```

### Google Cloud Console:

**Redirect URI (only one needed):**
```
https://[your-project-id].supabase.co/auth/v1/callback
```

**Example:**
```
https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback
```

This is the same for all environments because Supabase handles the redirect.

---

## 🔒 Security Best Practices

### For Production:

1. **HTTPS Only:**
   - All URLs must use `https://`
   - Never use `http://` in production

2. **Nonce Checks:**
   - Ideally keep nonce checks **enabled** (more secure)
   - Only disable if mobile OAuth fails
   - Document the decision

3. **Domain Verification:**
   - Verify `solowipe.co.uk` in Google Cloud Console
   - Ensure OAuth consent screen shows correct domain

4. **Secrets Management:**
   - Google Client Secret stored securely in Supabase
   - Never exposed in client-side code
   - Rotate secrets periodically

---

## 📝 Summary

**What to Change:**

1. ✅ Site URL: `localhost` → `https://solowipe.co.uk`
2. ✅ Add redirect URLs: `https://solowipe.co.uk/dashboard` and `/*`
3. ✅ Keep Netlify URLs as fallback
4. ✅ Remove localhost URLs
5. ✅ Configure nonce checks (prefer enabled for security)

**Result:**
- OAuth works on production domain
- OAuth works on Netlify fallback
- Secure configuration
- Mobile compatible





