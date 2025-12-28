# Quick Fix: GoCardless Redirect URI Error

## 🚨 The Error

**"The provided redirect_uri does not match the one for the client_id"**  
**HTTP Error: 400**

This means the redirect URI your app is sending doesn't match what's registered in GoCardless Dashboard.

---

## ✅ Quick Fix (3 Minutes)

### Step 1: Find Your Exact Redirect URI

**Option A: Check Browser Console**
1. Open browser console (F12 or Cmd+Option+I)
2. Click "Connect GoCardless" in the app
3. Look for: `[GC-CLIENT] Hardcoded redirect URL: [URL HERE]`
4. Copy that **exact** URL

**Option B: Check in Settings**
1. Go to Settings → GoCardless section
2. Before clicking "Connect", you should see the redirect URI displayed
3. Copy that exact URL

**Option C: Calculate It**
- **Production:** `https://solowipe.co.uk/gocardless-callback`
- **Development:** `http://localhost:8080/gocardless-callback` (or your dev port)

### Step 2: Add to GoCardless Dashboard

1. **Go to GoCardless Dashboard:**
   - **Sandbox:** https://manage-sandbox.gocardless.com/settings/api
   - **Live:** https://manage.gocardless.com/settings/api
   - Login to your account

2. **Find "Redirect URIs" Section:**
   - Scroll down to find **"Redirect URIs"** or **"OAuth Redirect URIs"**
   - Usually below your Client ID

3. **Add the Redirect URI:**
   - Click **"Add"** or **"Add Redirect URI"** button
   - Paste the **exact** URL from Step 1
   - **CRITICAL:** Must match EXACTLY:
     - ✅ No trailing slash (NOT `/gocardless-callback/`)
     - ✅ Correct protocol (`https://` for production, `http://` for localhost)
     - ✅ Correct domain (exactly as shown)
     - ✅ Correct path (`/gocardless-callback`)

4. **Click "Save" or "Add"**

5. **Wait 1-2 minutes** for changes to propagate

### Step 3: Test Again

1. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
2. Try connecting GoCardless again
3. Should work now! ✅

---

## 🔍 What Redirect URI Should You Add?

### For Production (solowipe.co.uk):
```
https://solowipe.co.uk/gocardless-callback
```

### For Development (localhost):
```
http://localhost:8080/gocardless-callback
```
*(Replace `8080` with your actual dev server port if different)*

### For Netlify (if using):
```
https://solowipe.netlify.app/gocardless-callback
```

**You can add multiple redirect URIs** - GoCardless allows this.

---

## ⚠️ Common Mistakes

❌ **DON'T add:**
- `https://solowipe.co.uk/gocardless-callback/` (trailing slash)
- `http://solowipe.co.uk/gocardless-callback` (wrong protocol for production)
- `https://www.solowipe.co.uk/gocardless-callback` (www vs non-www mismatch)
- `https://solowipe.co.uk/gocardless-callback?param=value` (query parameters)

✅ **DO add:**
- `https://solowipe.co.uk/gocardless-callback` (exact match, no trailing slash)
- `http://localhost:8080/gocardless-callback` (for development)

---

## 🔍 Verify What's Being Sent

**Check browser console for:**
```
[GC-CLIENT] Hardcoded redirect URL: https://solowipe.co.uk/gocardless-callback
```

**This is the exact URL you need to register in GoCardless Dashboard.**

---

## 📋 Checklist

- [ ] Found exact redirect URI (from console or Settings)
- [ ] Opened GoCardless Dashboard → Settings → API
- [ ] Found "Redirect URIs" section
- [ ] Added redirect URI (exact match, no trailing slash)
- [ ] Saved changes
- [ ] Waited 1-2 minutes
- [ ] Cleared browser cache
- [ ] Tested connection again
- [ ] Connection successful ✅

---

## 🚨 Still Not Working?

### Check These:

1. **Environment Mismatch:**
   - Using **Sandbox Client ID**? → Add redirect URI in **Sandbox Dashboard**
   - Using **Live Client ID**? → Add redirect URI in **Live Dashboard**
   - They're separate!

2. **Exact Match:**
   - Copy the URL from console logs
   - Paste it exactly (character for character)
   - Check for trailing slashes, protocol, port number

3. **Propagation Delay:**
   - Wait 2-5 minutes after adding
   - Try again

4. **Multiple Environments:**
   - If testing on both localhost and production, add both URIs
   - GoCardless allows multiple redirect URIs

---

## 💡 Pro Tip

**The app shows the redirect URI in Settings:**
- Go to Settings → GoCardless section
- Before clicking "Connect", you'll see the redirect URI
- Copy that exact URL and add it to GoCardless Dashboard

This ensures you're using the exact URL the app is sending!





