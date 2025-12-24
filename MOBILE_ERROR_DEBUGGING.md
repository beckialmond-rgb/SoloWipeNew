# Mobile Error Debugging Guide

## Current Status
The error handler has been improved to:
- ✅ Wait for React to mount before showing errors
- ✅ Filter out non-critical errors (images, fonts, etc.)
- ✅ Only show error screen after multiple critical errors
- ✅ Provide detailed error logging

## If You're Still Seeing "Error Loading Application"

### Step 1: Check Browser Console
On mobile, you can access the console via:
- **iOS Safari**: Connect to Mac, use Safari → Develop → [Your Device] → [Your Site]
- **Android Chrome**: Use Chrome DevTools remote debugging
- **Or**: Use a desktop browser's mobile emulation

Look for these logs:
```
[main] Device info: {...}
[main] React app mounted successfully
[Global Error Handler] ...
```

### Step 2: Common Causes

#### 1. **Network/Chunk Loading Errors**
**Symptoms:**
- Console shows "ChunkLoadError" or "Failed to fetch dynamically imported module"
- App works on desktop but not mobile

**Solution:**
- Check network connection on mobile
- Clear browser cache
- Try hard refresh (hold reload button → "Empty Cache and Hard Reload")

#### 2. **Supabase Environment Variables Missing**
**Symptoms:**
- Console shows "Supabase env vars missing"
- Error about VITE_SUPABASE_URL

**Solution:**
- Verify environment variables are set in your hosting platform (Netlify, etc.)
- Check that variables start with `VITE_` prefix
- Redeploy after adding variables

#### 3. **Storage Quota Exceeded**
**Symptoms:**
- Console shows "QuotaExceededError"
- App works initially then fails

**Solution:**
- Clear browser storage
- The app now automatically falls back to localStorage if IndexedDB fails

#### 4. **Module Loading Issues**
**Symptoms:**
- Console shows import/module errors
- "Cannot find module" errors

**Solution:**
- Clear browser cache
- Check if all files are being served correctly
- Verify build completed successfully

### Step 3: Diagnostic Information

The app now logs detailed information. Check console for:

```javascript
[main] Device info: {
  userAgent: "...",
  platform: "...",
  isMobile: true/false,
  isIOS: true/false,
  isAndroid: true/false,
  storageAvailable: {
    localStorage: true/false,
    sessionStorage: true/false,
    indexedDB: true/false
  }
}
```

### Step 4: Quick Fixes to Try

1. **Clear Browser Cache**
   - iOS Safari: Settings → Safari → Clear History and Website Data
   - Android Chrome: Settings → Privacy → Clear browsing data

2. **Try Different Browser**
   - Test in Chrome, Firefox, Safari
   - Helps identify browser-specific issues

3. **Check Network**
   - Try on WiFi vs mobile data
   - Check if site is accessible on mobile network

4. **Disable Extensions**
   - Some browser extensions can interfere
   - Try in incognito/private mode

5. **Check Console for Specific Errors**
   - Look for the exact error message
   - Check error stack trace
   - Note which file/line the error occurs at

### Step 5: Report Back

If the error persists, please provide:
1. **Browser console logs** (especially `[Global Error Handler]` logs)
2. **Device info** (from `[main] Device info:` log)
3. **Error message** (exact text)
4. **Error stack trace** (if available)
5. **When it happens** (immediately on load, after interaction, etc.)

## What Changed

### Before
- Error handler showed error screen immediately for ANY error
- No distinction between critical and non-critical errors
- No wait time for React to mount

### After
- Error handler waits for React to mount
- Filters out non-critical errors (images, fonts, etc.)
- Only shows error after multiple critical errors
- Better error logging with device information
- Graceful fallback to localStorage if IndexedDB fails

## Testing Checklist

- [ ] App loads on mobile device
- [ ] No premature error screen
- [ ] Console shows device info
- [ ] Console shows "React app mounted successfully"
- [ ] App functions normally
- [ ] Storage works (with fallback if needed)

