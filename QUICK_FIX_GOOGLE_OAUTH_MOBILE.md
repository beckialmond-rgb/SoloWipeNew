# Quick Fix: Google OAuth on Mobile (Local Testing)

## 🎯 The Problem

When testing Google OAuth on mobile locally, it fails because:
- Mobile uses your computer's IP address: `http://192.168.1.XXX:8080`
- Supabase needs this redirect URL registered
- **Nonce validation** can fail on mobile browsers (especially iOS)
- Without proper configuration, OAuth redirect fails

## ✅ Quick Fix (5 Minutes)

### Step 1: Find Your Redirect URL

**On your mobile device:**
1. Open the app: `http://[your-computer-ip]:8080`
2. Open browser console (if possible)
3. Click "Sign in with Google"
4. Check console for: `[OAuth] Redirect URL: http://...`

**Or calculate it:**
```bash
# Find your computer's IP
ifconfig | grep "inet " | grep -v 127.0.0.1
# Look for something like: 192.168.1.50
```

Your redirect URL will be: `http://[your-ip]:8080/dashboard`

### Step 2: Configure Supabase (CRITICAL)

#### A. Add Redirect URLs

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication:**
   - Click "Authentication" in left sidebar
   - Click "URL Configuration"

3. **Add Redirect URLs:**
   - Find "Redirect URLs" section
   - Click "Add URL"
   - Add these URLs (replace `[your-ip]` with your actual IP):
     ```
     http://[your-ip]:8080/dashboard
     http://[your-ip]:8080/*
     ```
   - Example: `http://192.168.1.50:8080/dashboard`
   - Click "Save"

4. **Also add localhost (if not already):**
   ```
   http://localhost:8080/dashboard
   http://localhost:8080/*
   ```

#### B. Enable "Skip Nonce Checks" (IMPORTANT for Mobile)

**This is the key fix for mobile OAuth!**

1. **Still in Authentication settings:**
   - Look for "Provider Settings" or "Google Provider" section
   - Find the **"Skip nonce checks"** option
   - **Check/Enable** this option ✅

2. **What this does:**
   - Allows ID tokens with any nonce to be accepted
   - Less secure, but necessary for mobile browsers (especially iOS)
   - Required when you don't have access to the nonce used to issue the ID token
   - **Safe for development/testing**

3. **When to use:**
   - ✅ **Enable for:** Development, testing, mobile browsers
   - ⚠️ **Consider disabling for:** Production (more secure, but may break mobile)

**Note:** This setting is specifically needed for mobile OAuth flows, especially on iOS Safari.

### Step 3: Test

1. On mobile, open: `http://[your-ip]:8080`
2. Click "Sign in with Google"
3. Should work now! ✅

---

## 🔍 If It Still Doesn't Work

### Check Console Logs

**On mobile browser console, look for:**
- `[OAuth] Current origin: http://...`
- `[OAuth] Redirect URL: http://...`
- Any error messages

### Verify Supabase Configuration

1. **Check Redirect URLs:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Make sure your mobile IP URL is listed
   - Format: `http://[ip]:8080/dashboard` (no trailing slash)

2. **Check Site URL:**
   - Should be set to your app URL
   - For local: `http://localhost:8080` or `http://[your-ip]:8080`

### Common Issues

**Issue: "redirect_uri_mismatch"**
- **Fix:** Make sure the exact redirect URL is in Supabase
- Check for trailing slashes, correct port, correct protocol

**Issue: OAuth starts but doesn't complete**
- **Fix:** Check Supabase Auth Logs for errors
- Verify redirect URL matches exactly

**Issue: Can't access app on mobile**
- **Fix:** Make sure both devices on same WiFi
- Check firewall isn't blocking port 8080
- Verify dev server shows network URL: `http://[ip]:8080`

---

## 🚀 Better Solution: Use ngrok

For a more reliable solution that works on all devices:

### Install ngrok:
```bash
brew install ngrok
```

### Start ngrok:
```bash
# Make sure dev server is running first
npm run dev

# In another terminal
ngrok http 8080
```

### Get ngrok URL:
ngrok will show: `https://abc123.ngrok.io`

### Configure Supabase:
1. Add redirect URL: `https://abc123.ngrok.io/dashboard`
2. Add: `https://abc123.ngrok.io/*`
3. Save

### Access on mobile:
Open: `https://abc123.ngrok.io`

**Benefits:**
- ✅ Works on all devices
- ✅ HTTPS (more secure)
- ✅ No IP address issues
- ✅ Works even if IP changes

**Note:** Free ngrok URLs change each restart. For stable URL, use paid plan.

---

## 📋 Checklist

- [ ] Found computer's IP address
- [ ] Calculated redirect URL: `http://[ip]:8080/dashboard`
- [ ] Added redirect URL to Supabase
- [ ] Added wildcard: `http://[ip]:8080/*`
- [ ] Saved changes in Supabase
- [ ] Tested OAuth on mobile
- [ ] Checked console for errors
- [ ] Verified redirect works

---

## 🎯 Expected Flow

1. Mobile: Open `http://[ip]:8080` ✅
2. Click "Sign in with Google" ✅
3. Redirects to Google ✅
4. Select account ✅
5. Redirects back to `http://[ip]:8080/dashboard` ✅
6. Shows dashboard ✅
7. User logged in ✅

If any step fails, check the error message and refer to troubleshooting above.

---

## 💡 Pro Tip

**For easier testing, use ngrok:**
- One URL works for all devices
- No IP address management
- HTTPS automatically
- More reliable for OAuth

Just remember to update Supabase when ngrok URL changes (free tier).

