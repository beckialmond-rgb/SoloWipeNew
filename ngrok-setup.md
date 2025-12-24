# ngrok Setup for GoCardless Mobile Connection

## ✅ ngrok Installed

ngrok has been installed to: `~/bin/ngrok`

## 🚀 Next Steps

### Step 1: Get Your ngrok URL

ngrok is starting. To get your URL, you have two options:

**Option A: Web Interface (Easiest)**
1. Open your browser
2. Go to: http://localhost:4040
3. You'll see your ngrok URL (looks like: `https://abc123.ngrok.io`)

**Option B: Command Line**
```bash
curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"' | head -1
```

### Step 2: Register in GoCardless Dashboard

1. **Copy your ngrok URL** (from Step 1)
2. **Add `/gocardless-callback`** to the end
   - Example: `https://abc123.ngrok.io/gocardless-callback`
3. **Go to GoCardless Dashboard:**
   - Visit: https://manage-sandbox.gocardless.com/ (sandbox) or https://manage.gocardless.com/ (live)
   - Settings → API → Redirect URIs
   - Click "Add redirect URI"
   - Paste: `https://[your-ngrok-id].ngrok.io/gocardless-callback`
   - Save

### Step 3: Access App via ngrok on Mobile

1. **On your mobile device**, open the ngrok URL in your browser:
   - `https://[your-ngrok-id].ngrok.io`
2. **The app will automatically use the correct redirect URI**
3. **Try connecting GoCardless** - it should work now! ✅

## 📝 Important Notes

- **Free ngrok URLs change** each time you restart ngrok
- If you restart ngrok, you'll need to register the new URL in GoCardless
- **HTTPS is required** - ngrok provides this automatically
- **One URL works for all devices** (laptop, mobile, etc.)

## 🔄 Restarting ngrok

If you need to restart ngrok:

```bash
# Stop current ngrok (Ctrl+C if running in terminal)
# Then start again:
~/bin/ngrok http 8081
```

## ✅ Success Checklist

- [ ] ngrok is running (check http://localhost:4040)
- [ ] Got ngrok URL (e.g., `https://abc123.ngrok.io`)
- [ ] Registered in GoCardless: `https://abc123.ngrok.io/gocardless-callback`
- [ ] Accessed app via ngrok URL on mobile
- [ ] Tried connecting GoCardless
- [ ] Connection successful! ✅

---

**Need Help?** Check the ngrok web interface at http://localhost:4040 for your URL and connection status.

