# Fix: GoCardless Redirect URI Mismatch Error

**Error:** "The provided redirect_uri does not match the one for the client_id"  
**HTTP Error:** 400 Bad Request

---

## 🔍 Problem

When trying to connect/reconnect GoCardless, you get an error saying the redirect URI doesn't match what's registered in the GoCardless Dashboard.

---

## ✅ Solution: Register the Redirect URI

### Step 1: Get Your Exact Redirect URI

The redirect URI depends on your environment:

**Production (solowipe.co.uk):**
```
https://solowipe.co.uk/gocardless-callback
```

**Development/Local:**
```
http://localhost:5173/gocardless-callback
```
*(Replace `5173` with your actual port if different)*

**Or check in the app:**
- Go to Settings → GoCardless section
- The exact redirect URI is shown in the warning box before you click "Connect"

---

### Step 2: Register in GoCardless Dashboard

1. **Go to GoCardless Dashboard:**
   - Visit: https://manage.gocardless.com/ (or https://manage-sandbox.gocardless.com/ for sandbox)
   - Login to your account

2. **Navigate to API Settings:**
   - Click **Settings** (top right)
   - Click **API** (left sidebar)
   - Scroll to **Redirect URIs** section

3. **Add Your Redirect URI:**
   - Click **"Add redirect URI"** or **"+"** button
   - Paste the EXACT redirect URI from Step 1
   - ⚠️ **CRITICAL:** The URL must match EXACTLY:
     - ✅ Same protocol (`https://` or `http://`)
     - ✅ Same domain (no `www.` if you didn't use it)
     - ✅ Same path (`/gocardless-callback`)
     - ✅ No trailing slash
     - ✅ No query parameters

4. **Save:**
   - Click **Save** or **Add**
   - Wait a few seconds for it to register

---

### Step 3: Verify Registration

**Check the list:**
- Your redirect URI should appear in the list
- Make sure there are no typos
- Make sure it matches exactly what the app is sending

**Common mistakes:**
- ❌ `https://solowipe.co.uk/gocardless-callback/` (trailing slash)
- ❌ `http://solowipe.co.uk/gocardless-callback` (wrong protocol)
- ❌ `https://www.solowipe.co.uk/gocardless-callback` (www vs non-www)
- ✅ `https://solowipe.co.uk/gocardless-callback` (correct)

---

### Step 4: Try Connecting Again

1. Go back to your app
2. Go to Settings → GoCardless
3. Click **"Connect GoCardless"** or **"Reconnect"**
4. It should work now! ✅

---

## 🔍 How to Find Your Exact Redirect URI

### Method 1: Check the App UI
- Settings → GoCardless section
- Look for the warning box with the redirect URI

### Method 2: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Try connecting
4. Look for logs starting with `[GC-CLIENT]`
5. Find: `Redirect URI being sent: ...`

### Method 3: Check Supabase Logs
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click on `gocardless-connect`
3. Click "Logs" tab
4. Look for: `Redirect URI being sent: ...`

---

## 🚨 Still Not Working?

### Check These:

1. **Environment Match:**
   - Are you using **sandbox** or **live**?
   - Make sure the redirect URI is registered in the correct environment
   - Sandbox: https://manage-sandbox.gocardless.com/
   - Live: https://manage.gocardless.com/

2. **Client ID Match:**
   - Make sure you're using the correct Client ID
   - Check Supabase Secrets: `GOCARDLESS_CLIENT_ID`
   - Verify it matches the Client ID in GoCardless Dashboard

3. **Multiple Redirect URIs:**
   - If you have multiple environments (dev, staging, prod)
   - Register ALL redirect URIs you might use
   - GoCardless allows multiple redirect URIs per client

4. **Wait Time:**
   - Sometimes it takes a few seconds for changes to propagate
   - Wait 10-30 seconds after adding the redirect URI
   - Try refreshing the GoCardless Dashboard page

5. **Clear Cache:**
   - Clear browser cache
   - Try in incognito/private mode
   - Try a different browser

---

## 📋 Quick Checklist

- [ ] Identified your exact redirect URI
- [ ] Logged into correct GoCardless environment (sandbox/live)
- [ ] Navigated to Settings → API → Redirect URIs
- [ ] Added redirect URI EXACTLY as shown (no trailing slash, correct protocol)
- [ ] Saved the changes
- [ ] Waited a few seconds
- [ ] Tried connecting again

---

## ✅ Success Indicators

When it works, you should:
1. Click "Connect GoCardless"
2. Be redirected to GoCardless login page (not error page)
3. After login, be redirected back to your app
4. See "GoCardless connected!" success message
5. Settings shows "Connected" status

---

**Need Help?** Check the browser console for detailed logs starting with `[GC-CLIENT]` or `[GC-CONNECT]`.

