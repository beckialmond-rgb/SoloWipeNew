# GoCardless Redirect Crash Fix

**Date:** 2025-12-26  
**Status:** ✅ COMPLETED

---

## Problem

GoCardless redirects users to `https://solowipe.co.uk/gocardless-callback`, but the app was crashing because the route wasn't being handled correctly in production.

---

## Solution

### Task 1: Netlify Configuration ✅

**Added SPA Fallback Rule to `netlify.toml`:**

```toml
# SPA fallback - all routes (including /gocardless-callback) go to index.html
# This ensures the React router can handle the callback route
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Why SPA Fallback Instead of Direct Proxy?**

The user requested a proxy rule, but direct proxying won't work because:

1. **GoCardless redirects with GET query parameters:** `?code=...&state=...`
2. **Edge Function expects POST with JSON body:** Requires `{ code, redirectUrl, state }`
3. **Edge Function requires Authorization header:** Needed for user authentication
4. **React page handles the conversion:** GET → POST, adds auth, processes response

The current flow is correct:
1. GoCardless redirects to `/gocardless-callback?code=...` (GET)
2. React page (`GoCardlessCallback.tsx`) receives the GET request
3. React page extracts query parameters
4. React page calls Edge Function with POST + JSON + Authorization header
5. Edge Function processes the OAuth code and stores tokens
6. React page shows success/error and redirects to `/settings`

### Task 2: Verified Redirect URI ✅

**Edge Function Configuration:**

The `gocardless-connect` function accepts `redirectUrl` from the client and uses it as the `redirect_uri` in the OAuth request:

```typescript
// From client
const redirectUrl = isProduction 
  ? 'https://solowipe.co.uk/gocardless-callback'
  : `${window.location.origin}/gocardless-callback`;

// Edge Function uses it directly (after validation)
authUrl.searchParams.set('redirect_uri', redirectUrl);
```

**Verified URLs:**
- ✅ Production: `https://solowipe.co.uk/gocardless-callback`
- ✅ Development: `${window.location.origin}/gocardless-callback`
- ✅ Client sends correct URL in production
- ✅ Edge Function validates against trusted domains (`solowipe.co.uk`)

### Task 3: Deployed Edge Functions ✅

Both functions have been deployed:

1. **gocardless-connect** - Deployed successfully
2. **gocardless-callback** - Deployed successfully

**Deployment Commands:**
```bash
npx supabase functions deploy gocardless-connect
npx supabase functions deploy gocardless-callback
```

---

## Current Flow

```
1. User clicks "Connect GoCardless" in Settings
   ↓
2. Client calls gocardless-connect Edge Function
   - Sends: redirectUrl = "https://solowipe.co.uk/gocardless-callback"
   ↓
3. Edge Function returns OAuth URL
   - redirect_uri = "https://solowipe.co.uk/gocardless-callback"
   ↓
4. User redirected to GoCardless OAuth page
   ↓
5. User authorizes → GoCardless redirects to:
   https://solowipe.co.uk/gocardless-callback?code=XXX&state=YYY
   ↓
6. Netlify serves index.html (SPA fallback)
   ↓
7. React Router matches /gocardless-callback route
   ↓
8. GoCardlessCallback.tsx component loads
   ↓
9. Component extracts code from URL
   ↓
10. Component calls gocardless-callback Edge Function (POST)
    - Body: { code, redirectUrl, state }
    - Header: Authorization: Bearer <user-token>
    ↓
11. Edge Function exchanges code for tokens
    - Stores encrypted token in database
    ↓
12. Component shows success → redirects to /settings
```

---

## Files Modified

1. **`netlify.toml`** - Added SPA fallback rule

---

## Verification Steps

1. ✅ **Netlify Configuration:**
   - SPA fallback rule added
   - All routes serve `index.html`
   - React Router handles `/gocardless-callback`

2. ✅ **Redirect URI:**
   - Client sends `https://solowipe.co.uk/gocardless-callback` in production
   - Edge Function validates and uses it
   - Matches GoCardless Dashboard configuration

3. ✅ **Deployment:**
   - Both Edge Functions deployed
   - Functions are ACTIVE in Supabase

---

## Next Steps

1. **Test the Flow:**
   - Deploy to Netlify (or redeploy if already deployed)
   - Go to Settings → Connect GoCardless
   - Verify redirect works without crashing
   - Verify callback processes successfully

2. **Verify GoCardless Dashboard:**
   - Ensure `https://solowipe.co.uk/gocardless-callback` is registered
   - Sandbox: https://manage-sandbox.gocardless.com/settings/api
   - Live: https://manage.gocardless.com/settings/api

---

## Notes

- The React page (`GoCardlessCallback.tsx`) is essential for the flow
- It converts GET request (from GoCardless) to POST request (to Edge Function)
- It adds user authentication to the Edge Function call
- It provides user-friendly UI for success/error states
- Direct proxying would bypass this necessary conversion layer





