# GoCardless Redirect Loop - Critical Fixes Applied

## Root Cause Analysis

The redirect loop was caused by several critical issues in the callback handler:

### Issue 1: useEffect Infinite Loop
**Problem:** The `useEffect` had `searchParams` in its dependency array, and it called `setSearchParams({})` which changed `searchParams`, causing the effect to re-run infinitely.

**Fix:** 
- Removed `searchParams` from dependency array
- Use `useRef` instead of `useState` for `processingCallback` to prevent re-renders
- Read URL params directly from `window.location.search` BEFORE any state changes

### Issue 2: URL Param Clearing Timing
**Problem:** `setSearchParams({})` was called, but the code continued to read from `searchParams.get()`, which would now be empty, and the effect would re-run because `searchParams` changed.

**Fix:**
- Use `window.history.replaceState` to clear URL immediately
- Read all URL params BEFORE clearing using `new URLSearchParams(window.location.search)`
- Store params in local variables to avoid stale closures

### Issue 3: No Protection Against Re-processing
**Problem:** If the component re-rendered or the effect ran multiple times, the same code could be processed multiple times.

**Fix:**
- Added `processedCodeRef` to track which authorization code has already been processed
- Check both `processingCallbackRef.current` and `processedCodeRef.current === code` before processing
- Clear URL params if they're still present and callback was already processed

### Issue 4: Missing Redirect URL Validation
**Problem:** No validation that the callback URL matches the expected redirect URL.

**Fix:**
- Added redirect URL validation comparing expected vs actual base URLs
- Logs detailed comparison for debugging
- Early exit with clear error message if URLs don't match

## Changes Made

### `src/pages/Settings.tsx`

1. **Changed from `useState` to `useRef`** for processing guard:
   ```typescript
   // Before
   const [processingCallback, setProcessingCallback] = useState(false);
   
   // After
   const processingCallbackRef = useRef(false);
   const processedCodeRef = useRef<string | null>(null);
   ```

2. **Read URL params BEFORE clearing:**
   ```typescript
   // Read from URL directly BEFORE any state changes
   const urlParams = new URLSearchParams(window.location.search);
   const gocardless = urlParams.get('gocardless');
   const code = urlParams.get('code');
   const errorParam = urlParams.get('error');
   // ... etc
   ```

3. **Immediate URL clearing:**
   ```typescript
   // Clear URL params IMMEDIATELY using window.history to prevent re-triggers
   window.history.replaceState({}, '', window.location.pathname);
   setSearchParams({});
   ```

4. **Double guard against re-processing:**
   ```typescript
   if (processingCallbackRef.current || processedCodeRef.current === code) {
     console.log('[Settings] ⚠️ Callback already processed or in progress, skipping');
     // Clear URL params if they're still there
     if (window.location.search.includes('gocardless=callback')) {
       window.history.replaceState({}, '', window.location.pathname);
       setSearchParams({});
     }
     return;
   }
   ```

5. **Redirect URL validation:**
   ```typescript
   // Validate that the callback URL matches the expected redirect URL
   const expectedBaseUrl = redirectUrl.split('?')[0];
   const actualBaseUrl = window.location.origin + window.location.pathname;
   
   if (expectedBaseUrl !== actualBaseUrl) {
     // Early exit with error
   }
   ```

6. **Fixed dependency array:**
   ```typescript
   // Before
   }, [searchParams, setSearchParams, toast, refetchAll, processingCallback]);
   
   // After
   }, [setSearchParams, toast, refetchAll]); // REMOVED searchParams and processingCallback
   ```

## Testing Checklist

After deploying these fixes, verify:

- [ ] No infinite redirect loops
- [ ] Callback processes only once per authorization code
- [ ] URL params are cleared immediately after callback starts
- [ ] Error messages are clear if redirect URL mismatch
- [ ] Console logs show proper diagnostic information
- [ ] Success flow works end-to-end

## Debugging

If issues persist, check console logs for:
1. `[Settings] ⚠️ Callback already processed or in progress` - indicates duplicate prevention is working
2. `[Settings] === REDIRECT URL VALIDATION ===` - shows URL comparison
3. `[Settings] === GOCARDLESS CALLBACK DIAGNOSTICS ===` - shows all callback details

## Next Steps

1. Deploy the updated `Settings.tsx` file
2. Test the GoCardless connection flow
3. Monitor console logs for the diagnostic output
4. If redirect URL mismatch is detected, verify the URL registered in GoCardless Dashboard matches exactly

