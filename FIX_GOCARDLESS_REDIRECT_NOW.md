# Fix GoCardless Redirect URI Error - Quick Steps

## 🚨 The Error You're Seeing

**"The provided redirect_uri does not match the one for the client_id"**  
**HTTP Error: 400**

This means the redirect URI your app is sending doesn't match what's registered in GoCardless Dashboard.

---

## ✅ Quick Fix (2 Minutes)

### Step 1: Find Your Redirect URI

**The app shows it to you!**

1. Go to **Settings** → **GoCardless** section in your app
2. **Before clicking "Connect"**, you'll see a yellow box that says:
   ```
   ⚠️ Before connecting, register this redirect URI in GoCardless:
   ```
3. **Copy the exact URL shown** in that box

**OR check browser console:**
1. Open browser console (F12)
2. Click "Connect GoCardless"
3. Look for: `[GC-CLIENT] Hardcoded redirect URL: [URL]`
4. Copy that exact URL

**Expected URLs:**
- **Production:** `https://solowipe.co.uk/gocardless-callback`
- **Development:** `http://localhost:8080/gocardless-callback` (or your port)

### Step 2: Add to GoCardless Dashboard

1. **Go to GoCardless Dashboard:**
   - **Sandbox:** https://manage-sandbox.gocardless.com/settings/api
   - **Live:** https://manage.gocardless.com/settings/api
   - Login to your account

2. **Find "Redirect URIs" Section:**
   - Scroll down to **"Redirect URIs"** or **"OAuth Redirect URIs"**
   - Usually below your Client ID

3. **Add the Redirect URI:**
   - Click **"Add"** or **"Add Redirect URI"**
   - Paste the **exact** URL you copied
   - **CRITICAL:** Must match EXACTLY:
     - ✅ No trailing slash (NOT `/gocardless-callback/`)
     - ✅ Correct protocol (`https://` for production)
     - ✅ Correct domain
     - ✅ Correct path (`/gocardless-callback`)

4. **Click "Save"**

5. **Wait 1-2 minutes** for changes to take effect

### Step 3: Test Again

1. Clear browser cache (Cmd+Shift+R)
2. Go back to Settings → GoCardless
3. Click "Connect GoCardless"
4. Should work now! ✅

---

## 📋 What URL to Add

### If You're on Production (solowipe.co.uk):
```
https://solowipe.co.uk/gocardless-callback
```

### If You're on Development (localhost):
```
http://localhost:8080/gocardless-callback
```
*(Replace `8080` with your actual port if different)*

### If You're on Netlify:
```
https://solowipe.netlify.app/gocardless-callback
```

**The app shows you the exact URL** - just copy what it says!

---

## ⚠️ Exact Match Required

GoCardless requires an **EXACT match**. Common mistakes:

❌ **DON'T add:**
- `https://solowipe.co.uk/gocardless-callback/` (trailing slash)
- `http://solowipe.co.uk/gocardless-callback` (wrong protocol)
- `https://www.solowipe.co.uk/gocardless-callback` (www vs non-www)

✅ **DO add:**
- `https://solowipe.co.uk/gocardless-callback` (exact match)

---

## 🔍 Verify It's Working

**After adding the redirect URI:**

1. Wait 1-2 minutes
2. Clear browser cache
3. Try connecting again
4. Should redirect to GoCardless authorization page ✅
5. No more error! 🎉

---

## 🚨 Still Not Working?

### Check These:

1. **Environment Match:**
   - Using **Sandbox**? → Add URI in **Sandbox Dashboard**
   - Using **Live**? → Add URI in **Live Dashboard**
   - They're separate!

2. **Exact Match:**
   - Copy the URL from the app (Settings → GoCardless)
   - Paste it exactly (character for character)
   - Check for trailing slashes

3. **Wait Time:**
   - Changes can take 1-2 minutes to propagate
   - Try again after waiting

---

## 💡 The App Shows You the URL!

**Easiest way:**
1. Go to Settings → GoCardless
2. Look at the yellow warning box
3. Copy the URL shown there
4. Add it to GoCardless Dashboard
5. Done! ✅

The app is designed to show you exactly what redirect URI it's using, so you can't get it wrong!

