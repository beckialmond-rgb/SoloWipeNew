# White Screen Fix - Comprehensive Plan

## Root Cause Analysis

### Primary Issues Identified:

1. **Circular Dependency Error** (`Cannot access 'E' before initialization`)
   - Still occurring despite chunking changes
   - Likely caused by module initialization order in bundled code
   - Current fix attempts haven't fully resolved it

2. **Supabase Client Initialization**
   - Throws errors if env vars are missing (good - but needs better handling)
   - Errors are caught by ErrorBoundary but might cause white screen before render

3. **Build Configuration**
   - Current config tries single bundle but `inlineDynamicImports: false` may still allow splitting
   - Need to ensure true single-file output

4. **Error Display**
   - ErrorBoundary exists but errors might occur before React renders
   - Need fallback HTML error page

## Fix Strategy

### Phase 1: Ensure Single Bundle (CRITICAL)
- Fix vite config to truly create single bundle
- Enable `inlineDynamicImports: true` to inline all dynamic imports
- This eliminates ALL chunk loading issues

### Phase 2: Graceful Error Handling
- Make Supabase client initialization non-blocking
- Add fallback HTML error page for pre-React errors
- Ensure ErrorBoundary catches everything

### Phase 3: Environment Variable Safety
- Add runtime checks with graceful degradation
- Don't throw errors that prevent app from rendering
- Show user-friendly error messages

### Phase 4: Testing & Verification
- Test with missing env vars
- Test with invalid env vars
- Test with valid env vars
- Verify no white screen in any scenario

## Implementation Order

1. Fix vite config (single bundle)
2. Add HTML fallback error page
3. Make Supabase client initialization safer
4. Add comprehensive error logging
5. Test all scenarios
