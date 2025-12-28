# Local Mobile Testing Guide

## Quick Setup for Testing on Mobile

### Step 1: Start the Dev Server

```bash
npm run dev
```

The server should start on `http://localhost:8080`

### Step 2: Find Your Computer's IP Address

**On macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for something like: `inet 192.168.1.50`

**On Windows:**
```bash
ipconfig
```

Look for "IPv4 Address" under your network adapter (usually WiFi or Ethernet)

**On Linux:**
```bash
hostname -I
```

### Step 3: Access from Mobile Device

1. **Make sure your mobile device is on the same WiFi network** as your computer

2. **On your mobile device, open a browser and go to:**
   ```
   http://[your-computer-ip]:8080
   ```
   
   Example: `http://192.168.1.50:8080`

3. **The app should load!**

### Step 4: Check Console Logs

On your mobile device:
- **iOS Safari**: Connect to Mac → Safari → Develop → [Your Device] → [Your Site]
- **Android Chrome**: Use Chrome DevTools remote debugging
- Or: Check the terminal where `npm run dev` is running - it shows requests

## Troubleshooting

### Issue: Can't Access from Mobile

**Check:**
1. ✅ Both devices on same WiFi network?
2. ✅ Firewall blocking port 8080?
3. ✅ Dev server shows "Local: http://localhost:8080" and "Network: http://[ip]:8080"?

**Fix Firewall (macOS):**
```bash
# Allow incoming connections on port 8080
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
```

**Or temporarily disable firewall:**
System Preferences → Security & Privacy → Firewall → Turn Off

### Issue: App Loads But Shows Errors

**Check browser console on mobile:**
- Look for `[main]` logs
- Check for any error messages
- The app should work even with some errors (they're handled gracefully)

### Issue: CORS Errors

**These are normal for local development:**
- Some Supabase edge functions may have CORS issues
- The app handles these gracefully
- They won't prevent the app from loading

## Quick Test Checklist

- [ ] Dev server running (`npm run dev`)
- [ ] Found computer's IP address
- [ ] Mobile device on same WiFi
- [ ] Can access `http://[ip]:8080` on mobile
- [ ] App loads (even if some features don't work)
- [ ] Check console for any critical errors

## What to Expect

**The app should:**
- ✅ Load on mobile browser
- ✅ Show the login/signup screen
- ✅ Allow you to navigate around
- ⚠️ Some features may not work if tables don't exist (that's OK for now)

**Console logs you should see:**
```
[Pre-Load] Starting app initialization...
[Pre-Load] Production mode: false
[main] App starting...
[main] Environment: { mode: 'development', ... }
[main] Device info: { isMobile: true, ... }
[main] React app mounted successfully
```

## Next Steps

Once it's working locally:
1. Test all the features you need
2. Fix any issues
3. When ready, deploy to Netlify

The app is now set up to work locally and handle errors gracefully!





