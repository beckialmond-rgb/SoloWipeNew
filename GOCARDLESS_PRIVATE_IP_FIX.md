# Fix: GoCardless "Invalid URL" Error for Private IP Addresses

**Error:** "Invalid URL" when trying to register redirect URI in GoCardless Dashboard  
**Cause:** GoCardless doesn't accept private IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)

---

## 🚫 The Problem

GoCardless has security restrictions that **don't allow private IP addresses** as redirect URIs. This means:
- ❌ `http://192.168.1.100:8081/gocardless-callback` - **NOT ALLOWED**
- ❌ `http://10.0.0.5:8081/gocardless-callback` - **NOT ALLOWED**
- ✅ `http://localhost:8081/gocardless-callback` - **ALLOWED**
- ✅ `https://solowipe.co.uk/gocardless-callback` - **ALLOWED**

---

## ✅ Solutions

### Solution 1: Use ngrok (Recommended for Development)

**ngrok** creates a public HTTPS tunnel to your local server, which GoCardless accepts.

#### Step 1: Install ngrok
```bash
# macOS
brew install ngrok

# Or download from: https://ngrok.com/download
```

#### Step 2: Start ngrok
```bash
ngrok http 8081
```

#### Step 3: Get Your ngrok URL
ngrok will display something like:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:8081
```

#### Step 4: Register in GoCardless
1. Go to GoCardless Dashboard → Settings → API → Redirect URIs
2. Add: `https://abc123.ngrok.io/gocardless-callback`
3. Save

#### Step 5: Update App (if needed)
The app will automatically use `window.location.origin`, so if you access the app via the ngrok URL on mobile, it will use the correct redirect URI.

**Note:** Free ngrok URLs change each time you restart. For a stable URL, use ngrok's paid plan or set up a custom domain.

---

### Solution 2: Access App via Laptop IP on Mobile

Instead of using the mobile device's IP, access the app using your **laptop's IP address** on mobile.

#### Step 1: Find Your Laptop's IP
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

Look for something like: `192.168.1.50`

#### Step 2: Access App on Mobile
On your mobile device, open:
```
http://[laptop-ip]:8081
```
Example: `http://192.168.1.50:8081`

#### Step 3: Register Laptop IP in GoCardless
1. Go to GoCardless Dashboard → Settings → API → Redirect URIs
2. Add: `http://[laptop-ip]:8081/gocardless-callback`
3. Save

**Note:** This still uses a private IP, which GoCardless may reject. If it does, use Solution 1 (ngrok) instead.

---

### Solution 3: Use Production Domain

For production, use your production domain which works on all devices:

1. **Register in GoCardless:**
   - `https://solowipe.co.uk/gocardless-callback`

2. **Access app via production URL:**
   - Works on all devices (laptop, mobile, etc.)
   - No IP address issues

**Note:** Only use this for production/testing production features.

---

### Solution 4: Use localhost on Mobile (Advanced)

Some mobile browsers allow accessing `localhost` if you're on the same network, but this requires special configuration and may not work reliably.

---

## 📋 Recommended Approach

### For Development:
1. **Use ngrok** - Most reliable, works on all devices
2. **Or use laptop IP** - Simpler but may not work if GoCardless rejects private IPs

### For Production:
1. **Use production domain** - `https://solowipe.co.uk/gocardless-callback`
2. **Works on all devices** - No IP address issues

---

## 🔧 Quick Setup: ngrok

### Install ngrok:
```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Start Tunnel:
```bash
ngrok http 8081
```

### Copy the HTTPS URL:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:8081
```

### Register in GoCardless:
```
https://abc123.ngrok.io/gocardless-callback
```

### Access App on Mobile:
Open `https://abc123.ngrok.io` on your mobile device

---

## ⚠️ Important Notes

1. **Free ngrok URLs change:** Each time you restart ngrok, you get a new URL. You'll need to re-register in GoCardless.

2. **ngrok Paid Plan:** For a stable URL, consider ngrok's paid plan with a custom domain.

3. **HTTPS Required:** ngrok provides HTTPS, which GoCardless requires for non-localhost URLs.

4. **Multiple Devices:** With ngrok, one URL works for all devices (laptop, mobile, etc.).

---

## ✅ Success Checklist

- [ ] Installed ngrok (or using production domain)
- [ ] Started ngrok tunnel: `ngrok http 8081`
- [ ] Registered ngrok URL in GoCardless Dashboard
- [ ] Accessed app via ngrok URL on mobile
- [ ] Tried connecting GoCardless on mobile
- [ ] Connection successful ✅

---

## 🚨 Still Not Working?

### Check These:

1. **ngrok URL Changed:**
   - If you restarted ngrok, you got a new URL
   - Register the new URL in GoCardless Dashboard

2. **HTTPS Required:**
   - Make sure you're using the HTTPS ngrok URL (not HTTP)
   - GoCardless requires HTTPS for non-localhost URLs

3. **URL Format:**
   - Must be: `https://[ngrok-id].ngrok.io/gocardless-callback`
   - No trailing slash
   - Exact match required

---

**Need Help?** The app now detects private IP addresses and shows a warning with these solutions when detected.

