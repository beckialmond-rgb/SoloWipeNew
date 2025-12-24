# Production Supabase Configuration

## Current Issue

- **Site URL:** Set to `localhost` (needs to be production domain: `https://solowipe.co.uk`)
- **Redirect URLs:** Only has `solowipe.netlify.app` (needs proper production URLs)

## ✅ Production Configuration Steps

### Step 1: Update Site URL

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your **production project**

2. **Navigate to Authentication:**
   - Click "Authentication" in left sidebar
   - Click "URL Configuration"

3. **Update Site URL:**
   - Find "Site URL" field
   - Change from: `http://localhost:8080` (or whatever it currently is)
   - Change to: `https://solowipe.co.uk`
   - **Important:** Use `https://` (not `http://`)
   - **Important:** No trailing slash
   - Click "Save"

### Step 2: Add Production Redirect URLs

**In the same "URL Configuration" page:**

1. **Find "Redirect URLs" section**

2. **Add these production URLs (in this order):**
   
   **Primary Production Domain:**
   ```
   https://solowipe.co.uk/dashboard
   https://solowipe.co.uk/*
   ```
   
   **Netlify Fallback (keep existing):**
   ```
   https://solowipe.netlify.app/dashboard
   https://solowipe.netlify.app/*
   ```
   
   **Important Notes:**
   - Use `https://` (not `http://`)
   - No trailing slashes
   - Add both `/dashboard` and `/*` (wildcard) for each domain
   - Keep the netlify.app URLs as fallback

3. **Keep localhost for development (optional):**
   ```
   http://localhost:8080/dashboard
   http://localhost:8080/*
   ```

4. **Click "Save"**

### Step 3: Configure Google Provider

**Still in Authentication settings:**

1. **Go to "Providers" → "Google"**

2. **Verify settings:**
   - ✅ Google provider is **Enabled**
   - ✅ Client ID is set (from Google Cloud Console)
   - ✅ Client Secret is set (from Google Cloud Console)

3. **Nonce Checks (Production Decision):**
   - ⚠️ **For production:** Ideally **disable** "Skip nonce checks" (more secure)
   - ⚠️ **If mobile breaks:** Enable "Skip nonce checks" (less secure but works)
   - **Recommendation:** Test with nonce checks **enabled** first, only disable if mobile fails

### Step 4: Verify Google Cloud Console

**Make sure Google Cloud Console has:**

1. **Authorized Redirect URI:**
   - `https://[your-project-id].supabase.co/auth/v1/callback`
   - This is the Supabase callback URL (same for all environments)

2. **OAuth Consent Screen:**
   - App is published (not in "Testing" mode)
   - Or test users are added if still in testing

---

## 📋 Complete Production Checklist

### Supabase Configuration

- [ ] Site URL set to: `https://solowipe.co.uk`
- [ ] Redirect URL added: `https://solowipe.co.uk/dashboard`
- [ ] Redirect URL added: `https://solowipe.co.uk/*`
- [ ] Redirect URL added: `https://solowipe.netlify.app/dashboard` (if using Netlify)
- [ ] Redirect URL added: `https://solowipe.netlify.app/*` (if using Netlify)
- [ ] Google provider enabled
- [ ] Google Client ID configured
- [ ] Google Client Secret configured
- [ ] Nonce checks configured (enabled for security, disabled if mobile breaks)

### Google Cloud Console

- [ ] Redirect URI: `https://[project-id].supabase.co/auth/v1/callback`
- [ ] OAuth consent screen published (or test users added)
- [ ] Scopes configured correctly

### Testing

- [ ] Test OAuth on desktop: `https://solowipe.co.uk`
- [ ] Test OAuth on mobile: `https://solowipe.co.uk`
- [ ] Verify redirects to dashboard (not landing page)
- [ ] Verify user is logged in after OAuth
- [ ] Check Supabase Auth Logs for any errors

---

## 🔍 Finding Your Supabase Project ID

If you need to find your Supabase project ID for the Google Cloud Console redirect URI:

1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → API
4. Look for "Project URL" - it will be: `https://[project-id].supabase.co`
5. The callback URL is: `https://[project-id].supabase.co/auth/v1/callback`

---

## 🚨 Important Notes

### Site URL vs Redirect URLs

- **Site URL:** The main domain of your app (used for email links, etc.)
- **Redirect URLs:** Allowed URLs where OAuth can redirect back to your app

### Multiple Domains

If you have multiple domains (e.g., `solowipe.co.uk` and `solowipe.netlify.app`):
- Add **both** to redirect URLs
- Set Site URL to your **primary** domain (`solowipe.co.uk`)

### Development vs Production

**Best Practice:**
- Use **separate Supabase projects** for dev and production
- Or use **environment variables** to switch between them
- Keep localhost URLs only in development project

---

## ✅ After Configuration

Once configured, test:

1. **Desktop:**
   - Go to: `https://solowipe.co.uk`
   - Click "Sign in with Google"
   - Should complete successfully
   - Should redirect to dashboard

2. **Mobile:**
   - Go to: `https://solowipe.co.uk`
   - Click "Sign in with Google"
   - Should complete successfully
   - Should redirect to dashboard

3. **Check Logs:**
   - Supabase Dashboard → Logs → Auth Logs
   - Look for successful OAuth callbacks
   - Check for any errors

---

## 🎯 Quick Reference

### Supabase URLs to Configure:

**Site URL:**
```
https://solowipe.co.uk
```

**Redirect URLs:**
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

This is the same for all environments because Supabase handles the redirect.

