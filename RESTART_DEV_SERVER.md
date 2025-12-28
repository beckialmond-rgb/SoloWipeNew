# Restart Development Server

## Quick Restart

### Step 1: Stop Current Server (if running)
Press `Ctrl+C` in the terminal where the dev server is running, or:
```bash
pkill -f vite
```

### Step 2: Start Dev Server
```bash
npm run dev
```

### Step 3: Verify It's Running
You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://192.168.x.x:8080/
```

---

## For Mobile Testing

### Step 1: Find Your IP Address
```bash
# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1

# Look for something like: 192.168.1.50
```

### Step 2: Start Dev Server
```bash
npm run dev
```

### Step 3: Access on Mobile
On your mobile device (same WiFi network):
- Open browser
- Go to: `http://[your-ip]:8080`
- Example: `http://192.168.1.50:8080`

---

## For Google OAuth on Mobile

After restarting, make sure:

1. **Supabase Redirect URLs are configured:**
   - Go to: Supabase Dashboard → Authentication → URL Configuration
   - Add: `http://[your-ip]:8080/dashboard`
   - Add: `http://[your-ip]:8080/*`
   - Save

2. **Test OAuth:**
   - On mobile: `http://[your-ip]:8080`
   - Click "Sign in with Google"
   - Check browser console for redirect URL logs

---

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Then restart
npm run dev
```

### Can't Access on Mobile
1. Check both devices on same WiFi
2. Check firewall settings
3. Verify network URL shows in terminal: `http://[ip]:8080`

### OAuth Not Working
1. Check console logs: `[OAuth] Redirect URL: ...`
2. Verify redirect URL in Supabase matches exactly
3. See `QUICK_FIX_GOOGLE_OAUTH_MOBILE.md` for details

---

## Quick Commands

```bash
# Stop server
pkill -f vite

# Start server
npm run dev

# Check if running
lsof -i:8080
```





