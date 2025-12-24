# GoCardless Fix - Simple Checklist

## ✅ Step 1: Supabase - Redeploy Edge Function (2 minutes)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in and select your project

2. **Navigate to Edge Functions**
   - Click **"Edge Functions"** in the left sidebar
   - Or go directly to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/functions

3. **Find and Redeploy `gocardless-callback`**
   - Find the function named **`gocardless-callback`**
   - Click the **"..."** menu (three dots)
   - Click **"Redeploy"**
   - Wait for it to finish (usually 30-60 seconds)

**Alternative: If redeploy button doesn't exist**
- You can also redeploy via CLI:
  ```bash
  supabase functions deploy gocardless-callback
  ```

---

## ✅ Step 2: GoCardless - Add Redirect URI (3 minutes)

1. **Go to GoCardless Dashboard**
   - Visit: https://manage.gocardless.com/
   - Sign in to your account

2. **Navigate to API Settings**
   - Click **"Settings"** in the top menu
   - Click **"API"** in the left sidebar
   - Or go directly to: https://manage.gocardless.com/settings/api

3. **Find "Redirect URLs" Section**
   - Scroll down to find **"Redirect URLs"** or **"OAuth Redirect URIs"**
   - This is usually near the top, below your Client ID

4. **Add the Redirect URI**
   - Click **"Add"** or **"+"** button
   - Add this EXACT URL (for local development):
     ```
     http://localhost:8080/gocardless-callback
     ```
   - If you're testing on production, also add:
     ```
     https://solowipe.co.uk/gocardless-callback
     ```
   - **Important:** 
     - NO trailing slash (not `/gocardless-callback/`)
     - Exact protocol (`http://` for localhost, `https://` for production)
     - Exact port if using localhost

5. **Save**
   - Click **"Save"** or **"Update"**
   - Wait 1-2 minutes for changes to take effect

---

## ✅ Step 3: Supabase - Verify Secrets (1 minute)

1. **Go to Supabase Dashboard**
   - Navigate to: **Edge Functions** → **Secrets**
   - Or: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions

2. **Check these secrets exist:**
   - ✅ `GOCARDLESS_CLIENT_ID` (should start with `crh-`)
   - ✅ `GOCARDLESS_CLIENT_SECRET` (should start with `sec-`)
   - ✅ `GOCARDLESS_ENVIRONMENT` (should be `sandbox` or `live`)

3. **If any are missing:**
   - Click **"Add new secret"**
   - Add the missing ones
   - Get values from GoCardless Dashboard → Settings → API

---

## ✅ Step 4: Test Connection

1. **Go to your app**
   - Navigate to Settings page
   - Find "GoCardless Direct Debit" section

2. **Click "Connect GoCardless"**
   - Complete the authorization on GoCardless
   - You should be redirected back and see "Connection Successful"

3. **If it still fails:**
   - Check browser console (F12) for errors
   - Verify the redirect URI in GoCardless matches EXACTLY what you added
   - Make sure you're using the correct environment (sandbox vs live)

---

## 🔍 Quick Verification

### In GoCardless Dashboard:
- ✅ Redirect URI is: `http://localhost:8080/gocardless-callback` (for dev)
- ✅ No trailing slash
- ✅ Correct protocol (http vs https)
- ✅ Client ID matches what's in Supabase secrets

### In Supabase:
- ✅ `gocardless-callback` function is deployed (green status)
- ✅ All 3 secrets are set
- ✅ Environment matches your GoCardless environment

---

## ❓ Common Issues

**"Redirect URI mismatch"**
- Double-check the URL in GoCardless Dashboard matches EXACTLY
- No trailing slash, correct protocol, correct port

**"CORS error"**
- Make sure you redeployed the Edge Function (Step 1)

**"Unauthorized" or "No authorization header"**
- Check you're logged into your app
- Try logging out and back in

**Still not working?**
- Wait 2-3 minutes after making changes (propagation delay)
- Clear browser cache
- Try in an incognito/private window

