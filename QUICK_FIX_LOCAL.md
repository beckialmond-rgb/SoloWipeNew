# Quick Fix for Local Development

## Issue: App Not Loading in Browser or Mobile

### Step 1: Stop All Running Servers

```bash
pkill -f vite
```

### Step 2: Check Environment Variables

Make sure your `.env` file has:
```
VITE_SUPABASE_URL=https://owqjyaiptexqwafzmcwy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF
```

Or:
```
VITE_SUPABASE_URL=https://owqjyaiptexqwafzmcwy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (your anon key)
```

### Step 3: Start Dev Server Fresh

```bash
npm run dev
```

**Look for this output:**
```
➜  Local:   http://localhost:8080/
➜  Network: http://192.168.4.24:8080/
```

### Step 4: Test in Browser

1. **On your MacBook:**
   - Open: `http://localhost:8080`
   - Open browser console (F12 or Cmd+Option+I)
   - Check for errors

2. **On Mobile (same WiFi):**
   - Open: `http://192.168.4.24:8080`
   - Check browser console if possible

### Step 5: Check Console Logs

**You should see:**
```
[Pre-Load] Starting app initialization...
[main] App starting...
[main] Environment: { mode: 'development', ... }
[main] Device info: { ... }
```

**If you see errors, share them!**

## Common Issues

### "Cannot GET /" or 404
- Server isn't running
- Wrong port
- Solution: Restart `npm run dev`

### White Screen / Nothing Loads
- Check browser console for JavaScript errors
- Look for `[Pre-Load]` or `[main]` logs
- Share the error messages

### "Supabase not configured"
- Check `.env` file has correct variables
- Restart dev server after changing `.env`
- Variables must start with `VITE_`

### Connection Refused (Mobile)
- Check both devices on same WiFi
- Check firewall settings
- Try: `http://192.168.4.24:8080` (your IP)

## Quick Test

1. **Test simple page:**
   - Go to: `http://localhost:8080/test-simple.html`
   - Should show "Test Page"
   - If this works, server is running

2. **Test main app:**
   - Go to: `http://localhost:8080`
   - Should load the app
   - Check console for errors

## Still Not Working?

**Share:**
1. What you see in the browser (blank screen? error message?)
2. Browser console errors (F12 → Console tab)
3. Terminal output from `npm run dev`

