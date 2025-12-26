# GoCardless OAuth Redirect Issue - Diagnostic Summary

## 🔍 Root Cause Analysis

### The Problem
After a window cleaner authorizes GoCardless, the redirect back into the app fails because the `redirect_uri` used in the OAuth authorization request does not EXACTLY match the `redirect_uri` used in the token exchange request.

### Why It's Wrong

1. **Redirect URI Source Mismatch**:
   - **OAuth Authorization Request** (in `gocardless-connect`): Uses `redirectUrl` sent from client
   - **Token Exchange Request** (in `gocardless-callback`): Uses `redirectUrl` from client's localStorage (which can be lost/cleared/mismatched)
   - **GoCardless Requirement**: These MUST be identical, character-for-character

2. **Fragile localStorage Dependency**:
   - The callback function relies on `redirectUrl` stored in localStorage
   - localStorage can be cleared by browser, extensions, or user actions
   - If localStorage is lost, the callback constructs a fallback redirect_uri, which may not match the original

3. **No Single Source of Truth**:
   - The redirect_uri is constructed in multiple places with slightly different logic
   - No guarantee that the same value is used in both authorization and token exchange

4. **State Parameter Not Utilized**:
   - The state parameter currently only contains `userId` and `timestamp`
   - It should also contain `redirect_uri` to ensure consistency

### Critical Flow Points

```
Client (GoCardlessSection.tsx)
  ↓ constructs redirectUrl
  ↓ stores in localStorage
  ↓ sends to gocardless-connect Edge Function
  ↓
gocardless-connect/index.ts
  ↓ uses redirectUrl in OAuth authorization URL
  ↓ sends to GoCardless
  ↓
GoCardless
  ↓ redirects back to redirectUrl with code
  ↓
Client (GoCardlessCallback.tsx)
  ↓ retrieves redirectUrl from localStorage (may be missing!)
  ↓ sends to gocardless-callback Edge Function
  ↓
gocardless-callback/index.ts
  ↓ uses redirectUrl for token exchange
  ❌ FAILS if redirectUrl doesn't match exactly!
```

## ✅ How We Will Fix It

### Solution Strategy

1. **Store redirect_uri in State Parameter**:
   - Include `redirect_uri` in the state parameter sent to GoCardless
   - This ensures it's always available, even if localStorage is lost
   - State parameter is returned by GoCardless in the callback URL

2. **Extract redirect_uri from State in Callback**:
   - Parse the state parameter to extract `redirect_uri`
   - Use this EXACT value for the token exchange
   - Fallback to localStorage only if state is missing (backwards compatibility)

3. **Single Source of Truth**:
   - The redirect_uri is determined once in the client
   - Stored in state parameter
   - Used consistently in both authorization and token exchange

4. **Comprehensive Logging**:
   - Log the redirect_uri at every step
   - Log state parameter contents
   - Log token exchange request details
   - Enable easy debugging

5. **Environment Separation**:
   - Ensure sandbox and live environments use correct endpoints
   - Validate redirect_uri matches environment (https in production)
   - Clear error messages for environment mismatches

### Implementation Changes

1. **gocardless-connect/index.ts**:
   - Include `redirect_uri` in state parameter: `{ userId, redirectUri, timestamp }`
   - Add comprehensive logging of redirect_uri

2. **gocardless-callback/index.ts**:
   - Extract `redirect_uri` from state parameter (from callback URL)
   - Use state's redirect_uri for token exchange (primary)
   - Fallback to request body's redirectUrl (backwards compatibility)
   - Add validation that redirect_uri matches expected pattern
   - Enhanced error logging with redirect_uri details

3. **GoCardlessCallback.tsx**:
   - Extract state parameter from callback URL
   - Pass state parameter to callback Edge Function
   - Handle redirect_uri from state as primary source

4. **GoCardlessSection.tsx**:
   - No changes needed (already constructs redirect_uri correctly)

### Benefits

- ✅ **Deterministic**: redirect_uri always matches between authorization and token exchange
- ✅ **Resilient**: Works even if localStorage is cleared
- ✅ **Traceable**: Comprehensive logging at every step
- ✅ **Secure**: Validates redirect_uri against trusted domains
- ✅ **Backwards Compatible**: Falls back to localStorage if state is missing

## 📋 Required Configuration

### Environment Variables (Supabase Edge Functions)
- `GOCARDLESS_CLIENT_ID` - Must match GoCardless Dashboard
- `GOCARDLESS_CLIENT_SECRET` - Must match GoCardless Dashboard
- `GOCARDLESS_ENVIRONMENT` - Must be `sandbox` or `live`
- `GOCARDLESS_WEBHOOK_SECRET` - For webhook verification (optional for OAuth)

### GoCardless Dashboard Configuration

**Sandbox Environment:**
- Dashboard: https://manage-sandbox.gocardless.com/settings/api
- Redirect URI: `https://solowipe.co.uk/gocardless-callback` (or `http://localhost:PORT/gocardless-callback` for local dev)

**Live Environment:**
- Dashboard: https://manage.gocardless.com/settings/api
- Redirect URI: `https://solowipe.co.uk/gocardless-callback`

**Critical Requirements:**
- Redirect URI must match EXACTLY (no trailing slash, correct protocol, correct domain)
- Environment must match (sandbox Client ID → sandbox Dashboard, live Client ID → live Dashboard)
- Redirect URI must be registered in the SAME environment as the Client ID

## 🧪 Testing Plan

### Sandbox Environment
1. Set `GOCARDLESS_ENVIRONMENT=sandbox` in Supabase
2. Register sandbox redirect URI in sandbox dashboard
3. Test OAuth flow from Settings → GoCardless → Connect
4. Verify redirect back to app succeeds
5. Check Edge Function logs for redirect_uri values
6. Verify tokens stored in database

### Live Environment
1. Set `GOCARDLESS_ENVIRONMENT=live` in Supabase
2. Register production redirect URI in live dashboard
3. Test OAuth flow from production URL
4. Verify redirect back to app succeeds
5. Check Edge Function logs
6. Verify tokens stored in database

### Edge Cases to Test
1. localStorage cleared during OAuth flow (should still work via state)
2. State parameter missing (should fallback to localStorage)
3. Redirect URI mismatch (should show clear error)
4. Environment mismatch (sandbox vs live, should show clear error)
5. Invalid authorization code (should show clear error)
6. Network errors during token exchange (should retry gracefully)

