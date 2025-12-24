# Restart Dev Server and Test

## Quick Steps

### 1. Start the Dev Server

```bash
npm run dev
```

**Wait for this output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: http://192.168.4.24:8080/
```

### 2. Test in Browser (MacBook)

1. Open browser
2. Go to: `http://localhost:8080`
3. **Open Console** (F12 or Cmd+Option+I)
4. **Look for these logs:**
   ```
   [Pre-Load] Starting app initialization...
   [Pre-Load] Production mode: false
   [main] App starting...
   [main] Environment: { mode: 'development', ... }
   [main] Device info: { ... }
   ```

### 3. What to Check

**If you see a blank/white screen:**
- Check the console for errors
- Look for any red error messages
- Share the error messages you see

**If you see the app loading:**
- Great! It's working
- Some console warnings are OK (they're handled gracefully)

**If you see "Cannot GET /" or connection error:**
- Server isn't running
- Check terminal for errors
- Try restarting: `npm run dev`

### 4. Test on Mobile

1. Make sure mobile is on **same WiFi** as your MacBook
2. Open browser on mobile
3. Go to: `http://192.168.4.24:8080`
4. Should load the app

## Common Console Errors (and what they mean)

### "Supabase not configured"
- **OK** - App will still work with placeholder client
- Check `.env` file has the variables

### "Failed to load resource: 404"
- **OK** - Some tables might not exist yet
- App handles these gracefully

### "CORS policy" errors
- **OK for local dev** - Some edge functions may have CORS issues
- App handles these gracefully

### "ReferenceError" or "TypeError"
- **NOT OK** - Share these errors so I can fix them

## Still Not Working?

**Please share:**
1. What you see in the browser (screenshot or description)
2. Console errors (copy/paste from browser console)
3. Terminal output from `npm run dev`

