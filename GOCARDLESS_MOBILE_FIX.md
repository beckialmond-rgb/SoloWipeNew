# Fix: GoCardless Connection Fails on Mobile

**Issue:** Connection works on laptop but fails on mobile device  
**Error:** "The provided redirect_uri does not match the one for the client_id"

---

## 🔍 Root Cause

On mobile devices, the redirect URI uses your device's **IP address** instead of `localhost`:

- **Laptop:** `http://localhost:8081/gocardless-callback`
- **Mobile:** `http://192.168.1.100:8081/gocardless-callback` (your device's IP)

GoCardless requires an **exact match**, so you need to register **both** redirect URIs if testing on multiple devices.

---

## ✅ Solution: Register Mobile Redirect URI

### Step 1: Find Your Mobile Redirect URI

**In the app (on mobile):**
1. Go to Settings → GoCardless section
2. Look at the warning box - it shows the exact redirect URI
3. It will look like: `http://192.168.1.XXX:8081/gocardless-callback`

**Or check browser console:**
1. Open DevTools on mobile (if possible) or use remote debugging
2. Look for: `[GC-CLIENT] Hardcoded redirect URL: ...`

### Step 2: Register in GoCardless Dashboard

1. **Go to GoCardless Dashboard:**
   - Visit: https://manage-sandbox.gocardless.com/ (sandbox) or https://manage.gocardless.com/ (live)
   - Login to your account

2. **Navigate to API Settings:**
   - Settings → API → Redirect URIs

3. **Add Mobile Redirect URI:**
   - Click "Add redirect URI" or "+"
   - Paste the exact mobile redirect URI (e.g., `http://192.168.1.100:8081/gocardless-callback`)
   - Save

4. **Keep Laptop URI Registered:**
   - Make sure `http://localhost:8081/gocardless-callback` is still registered
   - You can have multiple redirect URIs registered

### Step 3: Test Connection

1. On mobile device, go to Settings → GoCardless
2. Click "Connect GoCardless"
3. Should work now! ✅

---

## 📱 Mobile-Specific Notes

### IP Address Changes

**Important:** Your mobile device's IP address may change if:
- You disconnect/reconnect to WiFi
- Your router assigns a new IP
- You switch networks

**If connection fails after IP change:**
1. Check the new redirect URI in Settings → GoCardless
2. Register the new IP address in GoCardless Dashboard
3. Or use a static IP for your mobile device

### Multiple Devices

If testing on multiple devices, register **all** redirect URIs:
- ✅ `http://localhost:8081/gocardless-callback` (laptop)
- ✅ `http://192.168.1.100:8081/gocardless-callback` (mobile device 1)
- ✅ `http://192.168.1.101:8081/gocardless-callback` (mobile device 2)

GoCardless allows multiple redirect URIs per client.

---

## 🔧 Alternative Solutions

### Option 1: Use Same Network IP for All Devices

If all devices are on the same network, you could:
1. Use your laptop's IP address for all devices
2. Access the app via `http://[laptop-ip]:8081` on mobile
3. Register only one redirect URI: `http://[laptop-ip]:8081/gocardless-callback`

### Option 2: Use Production Domain

For production, use the production domain which works on all devices:
- `https://solowipe.co.uk/gocardless-callback`

This works on any device without IP address issues.

### Option 3: Use ngrok or Similar Tunnel

For development, use a tunnel service:
1. Set up ngrok: `ngrok http 8081`
2. Use the ngrok URL: `https://xxxx.ngrok.io/gocardless-callback`
3. Register this URL in GoCardless
4. Works on all devices

---

## 📋 Quick Checklist

- [ ] Found mobile redirect URI (check Settings → GoCardless)
- [ ] Registered mobile redirect URI in GoCardless Dashboard
- [ ] Kept laptop redirect URI registered
- [ ] Tried connecting on mobile
- [ ] Connection successful ✅

---

## 🚨 Still Not Working?

### Check These:

1. **IP Address Changed:**
   - Mobile IP may have changed
   - Check Settings → GoCardless for current redirect URI
   - Register the new IP if different

2. **Environment Mismatch:**
   - Make sure you're using the correct GoCardless environment
   - Sandbox Client ID → Sandbox Dashboard
   - Live Client ID → Live Dashboard

3. **Network Issues:**
   - Make sure mobile device can reach the dev server
   - Check firewall settings
   - Verify port 8081 is accessible

4. **Multiple Networks:**
   - If mobile is on different network, IP will be different
   - Register the IP for the network you're using

---

## ✅ Success Indicators

When it works:
1. Click "Connect GoCardless" on mobile
2. Redirected to GoCardless login (not error page)
3. After login, redirected back to app
4. See "GoCardless connected!" message
5. Settings shows "Connected" status

---

**Need Help?** Check the browser console on mobile (if possible) for `[GC-CLIENT]` logs showing the exact redirect URI being used.

