# GoCardless Redirect Loop Debugging - Diagnostic Enhancements

## Overview
Enhanced logging and diagnostics have been added to debug the GoCardless redirect loop failure. The following diagnostics address all four areas requested:

---

## 1. URI Exactness Check ✅

### `gocardless-connect/index.ts`
**Added comprehensive logging for the redirect_uri being sent:**
- Redirect URI being sent (full URL)
- Redirect URI length
- Trailing slash detection
- Protocol (http vs https)
- Hostname
- Pathname
- Search params

**Console output includes:**
```
=== URI EXACTNESS CHECK ===
Redirect URI being sent: http://localhost:8080/settings?gocardless=callback
Redirect URI length: 49
Redirect URI has trailing slash: false
Redirect URI protocol: http:
Redirect URI hostname: localhost
Redirect URI pathname: /settings
Redirect URI search: ?gocardless=callback
⚠️ VERIFY: This redirect_uri MUST exactly match what is registered in GoCardless Dashboard
⚠️ VERIFY: No trailing slash differences, http vs https, www vs non-www
```

### `GoCardlessSection.tsx`
**Added client-side logging for redirect URL construction:**
- Current hostname and port
- Environment detection (production vs development)
- Constructed redirect URL
- Critical warnings about exact matching

**Console output includes:**
```
[GC-CLIENT] === REDIRECT URL CONSTRUCTION ===
Current hostname: localhost
Current port: 8080
Current origin: http://localhost:8080
Is production: false
Constructed redirect URL: http://localhost:8080/settings?gocardless=callback
⚠️ CRITICAL: This URL MUST exactly match what is registered in GoCardless Dashboard
```

---

## 2. Environment Handling ✅

### `gocardless-connect/index.ts`
**Enhanced environment logging:**
- Environment (sandbox vs live)
- Client ID (first 8 chars for security)
- OAuth base URL based on environment

### `gocardless-callback/index.ts`
**Added environment verification section:**
```
[GC-CALLBACK] === ENVIRONMENT CHECK ===
Environment: sandbox
Client ID (first 8 chars): xxxxxxxx...
Client Secret exists: true
⚠️ VERIFY: Environment matches between connect and callback
⚠️ VERIFY: Sandbox Client ID with Sandbox redirect_uri
⚠️ VERIFY: Production Client ID with Production redirect_uri
```

**Critical check:** Ensures the same environment (sandbox/live) is used in both the connect and callback functions.

---

## 3. Token/State Verification ✅

### `gocardless-callback/index.ts`
**Enhanced token exchange logging:**
- Full token exchange URL
- Redirect URI being used (with exactness warnings)
- Request body details (sanitized)
- Detailed error diagnostics when exchange fails

**Console output includes:**
```
[GC-CALLBACK] === TOKEN EXCHANGE REQUEST ===
Token exchange URL: https://connect-sandbox.gocardless.com/oauth/access_token
Using redirect_uri: http://localhost:8080/settings?gocardless=callback
⚠️ CRITICAL: redirect_uri MUST exactly match what was sent in authorize request
⚠️ CRITICAL: Check for trailing slash, http vs https, www vs non-www
```

**Error handling includes common causes:**
```
⚠️ COMMON CAUSES:
1. redirect_uri mismatch (check trailing slash, http vs https)
2. Environment mismatch (sandbox vs production)
3. Authorization code already used or expired
4. Client ID/Secret mismatch with environment
```

### `Settings.tsx`
**Added callback URL parameter logging:**
- Full URL that GoCardless redirected to
- All URL parameters (code, state, error, error_description)
- Comparison with saved localStorage values
- Error parameter detection (if GoCardless rejected the request)

**Console output includes:**
```
[Settings] === GOCARDLESS CALLBACK DIAGNOSTICS ===
Current URL: http://localhost:8080/settings?gocardless=callback&code=xxx&state=yyy
Full URL (for debugging redirect loop): http://localhost:8080/settings?gocardless=callback&code=xxx&state=yyy
Code from URL: xxx...
State from URL: yyy
Error from URL (if any): null
⚠️ CRITICAL: This is the exact URL GoCardless redirected to
⚠️ CRITICAL: Check if error parameter exists (indicates GoCardless rejection)
```

---

## 4. Logging ✅

### Enhanced Logging Throughout

#### `gocardless-connect/index.ts`
- Initial request logging with timestamp
- Full OAuth URL generation with complete breakdown
- Redirect URL that will be used by GoCardless

#### `gocardless-callback/index.ts`
- Request received timestamp
- User authentication status
- Profile check (idempotency)
- Token exchange request details
- Token exchange response (success/failure)
- Profile update verification

#### `GoCardlessSection.tsx`
- Redirect URL construction
- OAuth URL received from server
- State storage confirmation

#### `Settings.tsx`
- Callback trigger detection
- URL parameter extraction
- Error parameter detection (with early exit)
- Callback response handling

---

## How to Use These Diagnostics

### Step 1: Check Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the "Console" tab
3. Clear the console
4. Click "Connect GoCardless"

### Step 2: Review Connect Logs
Look for `[GC-CLIENT]` and `[GC-CONNECT]` logs:
- **Verify the redirect URL** matches exactly what's in GoCardless Dashboard
- **Check environment** (sandbox vs live)
- **Note the full OAuth URL** being generated

### Step 3: Review GoCardless Redirect
After GoCardless redirects back:
- **Check the full URL** in the browser address bar
- **Review `[Settings]` logs** for the exact URL GoCardless returned
- **Check for error parameters** (`?error=xxx&error_description=yyy`)

### Step 4: Review Callback Logs
In Supabase Edge Function logs:
1. Go to Supabase Dashboard → Edge Functions → `gocardless-callback` → Logs
2. Look for `[GC-CALLBACK]` logs
3. **Compare redirect_uri** used in token exchange with the one sent in authorize request
4. **Check error messages** for specific failure reasons

### Step 5: Verify GoCardless Dashboard
1. Go to GoCardless Dashboard → Settings → API
2. **Compare the registered Redirect URIs** with what's in the logs
3. **Ensure exact match** (no trailing slash, correct protocol, correct domain)

---

## Common Issues to Check

### 1. Redirect URI Mismatch
**Symptom:** "redirect_uri does not match" error
**Check:**
- Trailing slash: `http://localhost:8080/settings` vs `http://localhost:8080/settings/`
- Protocol: `http://` vs `https://`
- www prefix: `www.solowipe.co.uk` vs `solowipe.co.uk`
- Port number: `localhost:8080` vs `localhost:3000`

### 2. Environment Mismatch
**Symptom:** "Invalid client" or authentication errors
**Check:**
- Sandbox Client ID used with sandbox redirect_uri
- Production Client ID used with production redirect_uri
- Environment variable `GOCARDLESS_ENVIRONMENT` matches the Client ID

### 3. Authorization Code Issues
**Symptom:** "Code already used" or "Invalid code"
**Check:**
- Code is only used once (don't retry the same callback)
- Code hasn't expired (should be used immediately)
- Code matches the redirect_uri it was issued for

### 4. Redirect Loop
**Symptom:** Page keeps redirecting between GoCardless and your app
**Check:**
- Callback handler clears URL params immediately
- No automatic retry logic triggering
- Success path doesn't trigger another redirect

---

## Next Steps

1. **Deploy the updated functions** to Supabase:
   - Copy code from `supabase/functions/gocardless-connect/index.ts`
   - Copy code from `supabase/functions/gocardless-callback/index.ts`
   - Deploy both functions

2. **Test the connection flow** and review all console logs

3. **Compare the logged redirect_uri** with GoCardless Dashboard settings

4. **Share the logs** if the issue persists - the detailed diagnostics will pinpoint the exact failure point

