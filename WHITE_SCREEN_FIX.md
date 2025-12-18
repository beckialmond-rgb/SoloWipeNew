# White Screen Fix - Complete Solution

## Root Cause
The white screen is caused by Radix UI trying to access React's `forwardRef` before React is fully loaded. This happens due to chunk loading order issues in production builds.

## Solution Applied

### 1. Bundling Strategy Fix
- **Changed**: React, React DOM, Scheduler, and ALL Radix UI packages are now bundled together in a single `react-vendor` chunk
- **Why**: This ensures React is always available when Radix UI initializes
- **File**: `vite.config.ts`

### 2. React Availability Check
- **Added**: Pre-flight check in `main.tsx` to verify React is loaded before app initialization
- **Why**: Catches module loading issues early with clear error messages
- **File**: `src/main.tsx`

### 3. Meta Tag Fix
- **Fixed**: Added `mobile-web-app-capable` meta tag (deprecated warning resolved)
- **File**: `index.html`

### 4. Environment Variable Validation
- **Added**: Clear error messages if Supabase env vars are missing
- **File**: `src/integrations/supabase/client.ts`

## Deployment Steps

1. **Commit and push changes:**
   ```bash
   git add vite.config.ts src/main.tsx index.html
   git commit -m "Fix: Bundle React and Radix UI together to prevent forwardRef errors"
   git push
   ```

2. **Wait for Netlify rebuild** (automatic)

3. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear site data in browser settings

4. **Verify Netlify environment variables are set:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

## If Still Getting White Screen

1. **Check browser console** (F12) for specific errors
2. **Check Netlify build logs** - ensure build succeeded
3. **Verify environment variables** are set in Netlify
4. **Try incognito/private window** to rule out cache issues
5. **Check network tab** - ensure all JS chunks are loading (200 status)

## Expected Behavior After Fix

- ✅ No `forwardRef` errors
- ✅ React loads before Radix UI
- ✅ App renders correctly
- ✅ No white screen
- ✅ Clear error messages if env vars are missing

## Technical Details

The fix works by:
1. Bundling React and Radix UI in the same chunk (`react-vendor`)
2. Ensuring proper module resolution order
3. Adding runtime checks to catch issues early
4. Providing clear error messages for debugging
