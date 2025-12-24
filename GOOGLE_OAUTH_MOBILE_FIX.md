# Fix: Google OAuth Not Working on Mobile (Local Development)

## 🔍 Root Cause

When testing Google OAuth locally on mobile, the redirect URI is different:

- **On laptop (localhost):** `http://localhost:8080/dashboard`
- **On mobile (via IP):** `http://192.168.1.XXX:8080/dashboard` (your computer's IP)

Google OAuth requires the redirect URI to **match exactly** what's registered in Google Cloud Console. Since mobile uses a different URL, OAuth fails.

---

## ✅ Solution Options

### Option 1: Register Mobile Redirect URI (Quick Fix)

#### Step 1: Find Your Mobile Redirect URI

**On your mobile device:**
1. Open the app in browser: `http://[your-computer-ip]:8080`
2. Open browser console (if possible) or check the network tab
3. Look for the redirect URI in console logs when you try OAuth

**Or calculate it:**
- Find your computer's IP address: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Your redirect URI will be: `http://[your-ip]:8080/dashboard`
- Example: `http://192.168.1.50:8080/dashboard`

**Important:** The actual redirect goes through Supabase first, so you also need:
- Supabase callback: `https://[project-id].supabase.co/auth/v1/callback`
- Which then redirects to: `http://[your-ip]:8080/dashboard`

#### Step 2: Configure Supabase Redirect URLs

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication Settings:**
   - Go to: Authentication → URL Configuration
   - Look for "Redirect URLs" section

3. **Add Mobile Redirect URL:**
   - Click "Add URL"
   - Add: `http://[your-computer-ip]:8080/dashboard`
   - Also add: `http://[your-computer-ip]:8080/*` (wildcard for all routes)
   - Save

#### Step 3: Verify Google Cloud Console

The Supabase callback URL should already be registered:
- `https://[project-id].supabase.co/auth/v1/callback`

If not, add it in Google Cloud Console → Credentials → OAuth Client → Authorized redirect URIs.

---

### Option 2: Use ngrok (Recommended for Development)

ngrok creates a public HTTPS URL that works on all devices.

#### Step 1: Install ngrok

```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

#### Step 2: Start ngrok

```bash
# Make sure your dev server is running on port 8080
npm run dev

# In another terminal, start ngrok
ngrok http 8080
```

#### Step 3: Get ngrok URL

ngrok will display:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:8080
```

#### Step 4: Configure Supabase

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add redirect URL: `https://[your-ngrok-id].ngrok.io/dashboard`
3. Also add: `https://[your-ngrok-id].ngrok.io/*` (wildcard)
4. Save

#### Step 5: Access App via ngrok

- On mobile, open: `https://[your-ngrok-id].ngrok.io`
- Google OAuth should work now!

**Note:** Free ngrok URLs change each restart. For a stable URL, use ngrok's paid plan.

---

### Option 3: Use Production Domain (For Testing Production Features)

If you have a production domain:

1. **Configure Supabase:**
   - Add redirect URL: `https://solowipe.co.uk/dashboard`
   - Add: `https://solowipe.co.uk/*` (wildcard)

2. **Access on mobile:**
   - Open: `https://solowipe.co.uk`
   - OAuth will work on any device

---

## 🔍 Debugging Steps

### Step 1: Check What Redirect URI is Being Used

Add this to your code temporarily (or check browser console):

```javascript
// In browser console on mobile
console.log('Current origin:', window.location.origin);
console.log('Expected redirect:', window.location.origin + '/dashboard');
```

### Step 2: Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to: Logs → Auth Logs
3. Look for OAuth callback attempts
4. Check for redirect URI mismatch errors

### Step 3: Check Browser Console on Mobile

**iOS Safari:**
1. Connect iPhone to Mac via USB
2. Mac: Safari → Develop → [Your Device] → [Your Site]
3. Check console for errors

**Android Chrome:**
1. Enable USB debugging
2. Connect to computer
3. Chrome DevTools → Remote Devices
4. Check console for errors

### Step 4: Verify Redirect URI Flow

The OAuth flow is:
1. User clicks "Sign in with Google"
2. Redirects to Google
3. User authenticates
4. Google redirects to: `https://[project-id].supabase.co/auth/v1/callback?code=...`
5. Supabase processes callback
6. Supabase redirects to: `http://[your-origin]/dashboard`

The issue is usually in step 6 - the final redirect URL must be registered in Supabase.

---

## 📋 Quick Checklist

- [ ] Dev server running on port 8080
- [ ] Found computer's IP address (for Option 1)
- [ ] Added redirect URL to Supabase (mobile IP or ngrok URL)
- [ ] Verified Supabase callback URL registered in Google Cloud Console
- [ ] Tested OAuth on mobile device
- [ ] Checked browser console for errors
- [ ] Checked Supabase Auth Logs for errors

---

## 🚨 Common Errors

### Error: "redirect_uri_mismatch"

**Cause:** Redirect URI not registered in Supabase or Google Cloud Console

**Fix:**
1. Check Supabase → Authentication → URL Configuration
2. Add the exact redirect URL being used
3. Verify Google Cloud Console has Supabase callback URL

### Error: OAuth Starts But Doesn't Complete

**Cause:** Mobile can't reach the redirect URL after OAuth

**Fix:**
1. Verify mobile is on same network
2. Check firewall isn't blocking port 8080
3. Try using ngrok for reliable HTTPS tunnel

### Error: "Network Error" or "Connection Refused"

**Cause:** Mobile device can't connect to computer

**Fix:**
1. Verify both devices on same WiFi
2. Check computer's firewall settings
3. Verify dev server is accessible: `http://[ip]:8080` on mobile browser

---

## 💡 Recommended Approach

**For Local Development:**
1. **Use ngrok** - Most reliable, works on all devices
2. **Or register mobile IP** - Quick but may change

**For Production:**
1. **Use production domain** - Works on all devices automatically
2. **Configure in Supabase** - Add production URLs

---

## 📝 Configuration Reference

### Supabase Redirect URLs (Authentication → URL Configuration)

**For localhost development:**
- `http://localhost:8080/*`
- `http://localhost:8080/dashboard`

**For mobile via IP:**
- `http://[your-ip]:8080/*`
- `http://[your-ip]:8080/dashboard`

**For ngrok:**
- `https://[ngrok-id].ngrok.io/*`
- `https://[ngrok-id].ngrok.io/dashboard`

**For production:**
- `https://solowipe.co.uk/*`
- `https://solowipe.co.uk/dashboard`

### Google Cloud Console Redirect URIs

**Only one needed (Supabase callback):**
- `https://[project-id].supabase.co/auth/v1/callback`

This is the same for all environments because Supabase handles the redirect to your app.

---

## ✅ Testing Steps

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Access on mobile:**
   - Via IP: `http://[ip]:8080`
   - Via ngrok: `https://[ngrok-id].ngrok.io`

3. **Try Google OAuth:**
   - Click "Sign in with Google"
   - Should redirect to Google
   - After authentication, should redirect back to dashboard
   - Should see dashboard (not landing page)

4. **Verify in logs:**
   - Check browser console for errors
   - Check Supabase Auth Logs
   - Check terminal for network requests

---

## 🎯 Expected Behavior

**Working Flow:**
1. Click "Sign in with Google" ✅
2. Redirects to Google account selection ✅
3. User selects account ✅
4. Redirects back to app ✅
5. Shows dashboard (not landing page) ✅
6. User is logged in ✅

If any step fails, check the error and refer to the troubleshooting section above.

