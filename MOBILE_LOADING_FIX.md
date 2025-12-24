# Mobile Loading Fix - Comprehensive Changes

## Changes Made

### 1. **QueryPersister Error Handling** (`src/lib/queryPersister.ts`)
- Wrapped persister creation in try-catch
- Added error handling to all storage operations
- Falls back to no-op persister if creation fails
- Prevents module load failures from storage issues

### 2. **Pre-Load Diagnostics** (`index.html`)
- Added script that runs BEFORE module loads
- Tracks module loading status
- Catches module loading errors
- Shows error if module doesn't start loading within 5 seconds

### 3. **Enhanced Error Handling** (`src/main.tsx`)
- Better error messages with troubleshooting steps
- Render timeout detection
- More detailed error logging
- Automatic loading fallback hiding

### 4. **Smarter Error Filtering** (`index.html`)
- Only shows error screen for critical errors
- Waits for React to mount before showing errors
- Filters out non-critical resource errors

## Testing Steps

### Step 1: Check Browser Console
On mobile, access console via:
- **iOS Safari**: Connect to Mac → Safari → Develop → [Device] → [Site]
- **Android Chrome**: Chrome → Menu → More tools → Remote devices
- **Or**: Use desktop browser's mobile emulation (F12 → Toggle device toolbar)

### Step 2: Look for These Logs

**If module loads:**
```
[Pre-Load] Starting app initialization...
[Pre-Load] Module script loaded successfully
[main] App starting...
[main] Device info: {...}
[main] React app mounted successfully
```

**If module fails:**
```
[Pre-Load] Module script failed to load: [error]
```

**If React doesn't mount:**
```
[App] React failed to mount within 15000ms
```

### Step 3: Common Issues

#### Issue: Module Not Loading
**Symptoms:**
- Console shows `[Pre-Load] Module script failed to load`
- No `[main]` logs appear

**Possible Causes:**
1. **Network/CORS Issue**
   - Check if `/src/main.tsx` is accessible
   - Verify CORS headers on server
   - Check network tab in DevTools

2. **Build Issue**
   - Verify build completed successfully
   - Check if files are in `dist/` folder
   - Ensure Vite dev server is running (if in dev mode)

3. **Path Issue**
   - Verify `base` path in `vite.config.ts`
   - Check if assets are being served from correct path

#### Issue: React Not Mounting
**Symptoms:**
- Console shows `[main] App starting...` but not `[main] React app mounted successfully`
- Error after 15 seconds

**Possible Causes:**
1. **Import Error**
   - Check console for import/module errors
   - Look for "Cannot find module" errors
   - Verify all dependencies are installed

2. **Supabase Configuration**
   - Check for `[supabase] initialization error` in console
   - Verify environment variables are set
   - Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

3. **Storage Error**
   - Check for `[Storage]` or `[QueryPersister]` errors
   - Should auto-fallback to localStorage now

#### Issue: Error Screen Shows Immediately
**Symptoms:**
- Error screen appears right away
- No loading spinner

**Possible Causes:**
1. **Critical JavaScript Error**
   - Check console for error details
   - Look for stack trace
   - Check which file/line the error occurs at

2. **Multiple Critical Errors**
   - Error handler now requires 3+ critical errors before showing
   - Check console for error count

## Quick Fixes

### 1. Clear Everything
```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().then(dbs => {
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});
location.reload();
```

### 2. Check Network
- Verify site is accessible on mobile network
- Try WiFi vs mobile data
- Check if HTTPS is required

### 3. Check Build
```bash
npm run build
# Check dist/ folder exists
# Check for build errors
```

### 4. Verify Environment Variables
- Check Netlify/hosting platform settings
- Verify `VITE_SUPABASE_URL` is set
- Verify `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` is set
- Redeploy after adding variables

## Diagnostic Information to Collect

If the issue persists, please provide:

1. **Console Logs** (especially):
   - `[Pre-Load]` logs
   - `[main]` logs
   - `[Global Error Handler]` logs
   - Any error messages with stack traces

2. **Device Information**:
   - Browser and version
   - Device model
   - OS version
   - Network type (WiFi/mobile data)

3. **Error Details**:
   - Exact error message
   - When it occurs (immediately, after X seconds, etc.)
   - Screenshot of error screen

4. **Network Tab**:
   - Check if `main.tsx` loads (status code)
   - Check for failed requests
   - Check for CORS errors

## What Should Happen Now

1. **Module loads** → `[Pre-Load] Module script loaded successfully`
2. **App starts** → `[main] App starting...`
3. **React mounts** → `[main] React app mounted successfully`
4. **Loading spinner hides** → App UI appears

If any step fails, the error handler will:
- Log detailed information
- Wait for React to mount (if possible)
- Show helpful error message with troubleshooting steps

## Next Steps

1. **Deploy these changes**
2. **Test on mobile device**
3. **Check console logs** (use remote debugging)
4. **Report back** with console logs if issue persists

The improved error handling should now:
- ✅ Prevent premature error screens
- ✅ Provide better diagnostics
- ✅ Handle storage failures gracefully
- ✅ Give actionable error messages

