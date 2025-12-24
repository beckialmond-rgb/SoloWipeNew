# Mobile OAuth Setup Checklist

## ✅ Quick Setup Steps

### 1. Dev Server Running
- [ ] Dev server started: `npm run dev`
- [ ] See both Local and Network URLs in terminal
- [ ] Network URL shows: `http://192.168.x.x:8080`

### 2. Find Your IP Address
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
- [ ] Found IP address (e.g., `192.168.1.50`)
- [ ] Note it down

### 3. Configure Supabase

#### A. Add Redirect URLs

**Go to:** Supabase Dashboard → Authentication → URL Configuration

**Add these URLs (replace `[your-ip]` with your actual IP):**
- [ ] `http://[your-ip]:8080/dashboard`
- [ ] `http://[your-ip]:8080/*`
- [ ] `http://localhost:8080/dashboard` (if not already)
- [ ] `http://localhost:8080/*` (if not already)
- [ ] Click "Save"

#### B. Enable Skip Nonce Checks (CRITICAL for Mobile)

**Go to:** Supabase Dashboard → Authentication → Providers → Google

**Find:** "Skip nonce checks" option

- [ ] **Enable/Check** "Skip nonce checks" ✅
- [ ] This allows OAuth to work on mobile browsers (especially iOS)
- [ ] Less secure but required for mobile OAuth flows

**Example:**
- `http://192.168.1.50:8080/dashboard`
- `http://192.168.1.50:8080/*`

### 4. Test on Mobile

**On your mobile device:**
- [ ] Connected to same WiFi network
- [ ] Open browser
- [ ] Go to: `http://[your-ip]:8080`
- [ ] App loads successfully
- [ ] Click "Sign in with Google"
- [ ] Check browser console for: `[OAuth] Redirect URL: ...`
- [ ] OAuth flow completes
- [ ] Redirects to dashboard
- [ ] User is logged in ✅

---

## 🔍 Debugging

### Check Console Logs

**On mobile browser console, you should see:**
```
[OAuth] Initiating sign-in with provider: google
[OAuth] Current origin: http://192.168.x.x:8080
[OAuth] Redirect URL: http://192.168.x.x:8080/dashboard
[OAuth] ⚠️ Make sure this redirect URL is registered in Supabase Dashboard → Authentication → URL Configuration
```

**After OAuth callback:**
```
[OAuth Callback] URL params: { error: null, hasCode: true, ... }
[Auth State Change] { event: 'SIGNED_IN', hasUser: true, ... }
```

### Common Issues

**Issue: "redirect_uri_mismatch"**
- ✅ Fix: Add exact redirect URL to Supabase
- Check: Supabase → Authentication → URL Configuration

**Issue: OAuth starts but doesn't complete**
- ✅ Check: Supabase Auth Logs
- ✅ Verify: Redirect URL matches exactly (no trailing slash)

**Issue: Can't access app on mobile**
- ✅ Check: Both devices on same WiFi
- ✅ Check: Firewall not blocking port 8080
- ✅ Verify: Network URL shows in terminal

---

## 🚀 Alternative: Use ngrok (Recommended)

For more reliable testing:

### Install ngrok:
```bash
brew install ngrok
```

### Start ngrok:
```bash
ngrok http 8080
```

### Get ngrok URL:
- Look for: `https://abc123.ngrok.io`

### Configure Supabase:
- Add: `https://[ngrok-id].ngrok.io/dashboard`
- Add: `https://[ngrok-id].ngrok.io/*`
- Save

### Access on mobile:
- Open: `https://[ngrok-id].ngrok.io`
- OAuth will work! ✅

**Benefits:**
- Works on all devices
- HTTPS automatically
- No IP address issues
- More reliable

---

## 📝 Quick Reference

### Your Redirect URLs Should Be:

**For localhost:**
- `http://localhost:8080/dashboard`
- `http://localhost:8080/*`

**For mobile (via IP):**
- `http://[your-ip]:8080/dashboard`
- `http://[your-ip]:8080/*`

**For ngrok:**
- `https://[ngrok-id].ngrok.io/dashboard`
- `https://[ngrok-id].ngrok.io/*`

### Google Cloud Console

**Only one redirect URI needed:**
- `https://[project-id].supabase.co/auth/v1/callback`

This is the same for all environments because Supabase handles the redirect.

---

## ✅ Success Indicators

When it's working, you'll see:
1. ✅ OAuth redirects to Google
2. ✅ Account selection screen appears
3. ✅ After selecting account, redirects back to app
4. ✅ Shows dashboard (not landing page)
5. ✅ User is logged in
6. ✅ Console shows: `[Auth State Change] { event: 'SIGNED_IN' }`

---

## 🆘 Still Not Working?

1. **Check Supabase Logs:**
   - Dashboard → Logs → Auth Logs
   - Look for OAuth callback attempts
   - Check for errors

2. **Verify Redirect URL:**
   - Check console: `[OAuth] Redirect URL: ...`
   - Must match exactly in Supabase
   - No trailing slashes
   - Correct protocol (http/https)
   - Correct port

3. **Test on Desktop First:**
   - Make sure OAuth works on `localhost:8080`
   - Then test on mobile

4. **Use ngrok:**
   - Most reliable solution
   - Works on all devices
   - No IP address issues

