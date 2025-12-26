# GoCardless OAuth Fix - Complete Implementation Guide

## ✅ Fix Summary

This fix permanently resolves the OAuth redirect issue by ensuring the `redirect_uri` used in the OAuth authorization request **exactly matches** the `redirect_uri` used in the token exchange request.

### Key Changes

1. **State Parameter Enhancement**: The `redirect_uri` is now stored in the state parameter sent to GoCardless, ensuring it's always available even if localStorage is cleared.

2. **Deterministic redirect_uri**: The callback function extracts `redirect_uri` from the state parameter (primary source) and uses it for the token exchange, guaranteeing an exact match.

3. **Backwards Compatibility**: Falls back to localStorage if state parameter is missing.

4. **Enhanced Logging**: Comprehensive logging at every step to enable easy debugging.

5. **Better Error Messages**: Clear, actionable error messages for redirect_uri mismatches.

---

## 📋 Required Environment Variables

### Supabase Edge Functions Secrets

Add these secrets in Supabase Dashboard → Edge Functions → Settings → Secrets:

#### 1. GoCardless Credentials

**Sandbox Environment (for testing):**
```
GOCARDLESS_CLIENT_ID=<your-sandbox-client-id>
GOCARDLESS_CLIENT_SECRET=<your-sandbox-client-secret>
GOCARDLESS_ENVIRONMENT=sandbox
GOCARDLESS_WEBHOOK_SECRET=<your-sandbox-webhook-secret>  (optional for OAuth)
```

**Live Environment (for production):**
```
GOCARDLESS_CLIENT_ID=<your-live-client-id>
GOCARDLESS_CLIENT_SECRET=<your-live-client-secret>
GOCARDLESS_ENVIRONMENT=live
GOCARDLESS_WEBHOOK_SECRET=<your-live-webhook-secret>  (optional for OAuth)
```

#### 2. Supabase Service Role Key
```
SERVICE_ROLE_KEY=<your-supabase-service-role-key>
```

#### 3. Auto-Injected Variables (No Need to Add)
These are automatically available in Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

---

## 🔧 GoCardless Dashboard Configuration

### Critical Requirement
The redirect URI **MUST** be registered in the GoCardless Dashboard **before** starting the OAuth flow.

### Sandbox Environment

1. **Go to Sandbox Dashboard**: https://manage-sandbox.gocardless.com/settings/api
2. **Login** to your sandbox account
3. **Navigate to** Settings → API
4. **Find "Redirect URIs"** section
5. **Add Redirect URI**:
   - For production: `https://solowipe.co.uk/gocardless-callback`
   - For local dev: `http://localhost:PORT/gocardless-callback` (replace PORT with your dev server port, e.g., 5173, 8080)

### Live Environment

1. **Go to Live Dashboard**: https://manage.gocardless.com/settings/api
2. **Login** to your live account
3. **Navigate to** Settings → API
4. **Find "Redirect URIs"** section
5. **Add Redirect URI**: `https://solowipe.co.uk/gocardless-callback`

### Redirect URI Requirements

✅ **DO:**
- Use exact URL: `https://solowipe.co.uk/gocardless-callback`
- No trailing slash
- Correct protocol (https for production, http for localhost)
- Match exactly what the app sends

❌ **DON'T:**
- Add trailing slash: `https://solowipe.co.uk/gocardless-callback/` ❌
- Use wrong protocol: `http://solowipe.co.uk/gocardless-callback` ❌ (for production)
- Include query parameters: `https://solowipe.co.uk/gocardless-callback?param=value` ❌
- Use www if app doesn't: `https://www.solowipe.co.uk/gocardless-callback` ❌

### Environment Matching

**CRITICAL:** The Client ID and Redirect URIs must be in the SAME environment:
- Sandbox Client ID → Sandbox Dashboard → Sandbox Redirect URIs
- Live Client ID → Live Dashboard → Live Redirect URIs

---

## 🧪 Testing Plan

### Sandbox Environment Testing

#### Prerequisites
- [ ] `GOCARDLESS_ENVIRONMENT=sandbox` in Supabase secrets
- [ ] Sandbox Client ID and Client Secret configured
- [ ] Redirect URI registered in sandbox dashboard
- [ ] User authenticated in the app

#### Test Steps

1. **Start OAuth Flow**
   - Navigate to Settings → GoCardless section
   - Click "Connect GoCardless"
   - Verify redirect to GoCardless authorization page

2. **Authorize**
   - Complete authorization in GoCardless
   - Verify redirect back to app at `/gocardless-callback?code=...&state=...`

3. **Verify Success**
   - Check that callback page processes successfully
   - Verify redirect to Settings page
   - Check that GoCardless connection status shows as "Connected"
   - Verify token stored in database (check `profiles` table)

4. **Check Logs**
   - Supabase Dashboard → Edge Functions → `gocardless-connect` → Logs
   - Verify redirect_uri logged correctly
   - Verify state parameter contains redirectUri
   - Supabase Dashboard → Edge Functions → `gocardless-callback` → Logs
   - Verify redirect_uri extracted from state
   - Verify token exchange successful

### Live Environment Testing

#### Prerequisites
- [ ] `GOCARDLESS_ENVIRONMENT=live` in Supabase secrets
- [ ] Live Client ID and Client Secret configured
- [ ] Redirect URI registered in live dashboard
- [ ] Testing from production URL (https://solowipe.co.uk)

#### Test Steps

1. Follow same steps as sandbox testing
2. Verify using production URL
3. Check logs for correct environment (live)
4. Verify using live Client ID

### Edge Cases to Test

1. **localStorage Cleared**
   - Clear localStorage during OAuth flow
   - Should still work via state parameter

2. **State Parameter Missing**
   - Simulate missing state (should fallback to localStorage)

3. **Redirect URI Mismatch**
   - Register wrong redirect URI in dashboard
   - Should show clear error message with instructions

4. **Environment Mismatch**
   - Use sandbox Client ID with live redirect URI
   - Should fail with clear error

5. **Network Errors**
   - Simulate network failure during token exchange
   - Should show appropriate error message

---

## 📊 Verification Checklist

### Before Testing

- [ ] All environment variables set in Supabase
- [ ] Redirect URI registered in correct GoCardless Dashboard (sandbox/live)
- [ ] Environment matches (sandbox Client ID → sandbox Dashboard)
- [ ] No trailing slash in redirect URI
- [ ] Correct protocol (https for production)

### After OAuth Flow

- [ ] User redirected to GoCardless authorization page
- [ ] User completes authorization
- [ ] User redirected back to `/gocardless-callback`
- [ ] Callback processes successfully
- [ ] User redirected to Settings
- [ ] GoCardless connection status shows "Connected"
- [ ] Token stored in `profiles.gocardless_access_token_encrypted`
- [ ] Organisation ID stored in `profiles.gocardless_organisation_id`
- [ ] Connection timestamp stored in `profiles.gocardless_connected_at`

### Log Verification

**gocardless-connect logs should show:**
- [ ] Redirect URI used in OAuth request
- [ ] State parameter contains redirectUri
- [ ] Environment (sandbox/live)
- [ ] Client ID (partially masked)

**gocardless-callback logs should show:**
- [ ] State parameter received
- [ ] Redirect URI extracted from state
- [ ] Redirect URI used in token exchange (matches OAuth request)
- [ ] Token exchange successful
- [ ] Token encrypted and stored

---

## 🔍 Troubleshooting

### Error: "Redirect URI mismatch"

**Symptoms:**
- Error message: "The provided redirect_uri does not match the one for the client_id"
- OAuth flow fails at token exchange step

**Causes:**
1. Redirect URI not registered in GoCardless Dashboard
2. Redirect URI has trailing slash or wrong protocol
3. Environment mismatch (sandbox Client ID with live redirect URI or vice versa)

**Solution:**
1. Check browser console for exact redirect URI used
2. Go to GoCardless Dashboard (sandbox or live based on environment)
3. Verify redirect URI is registered exactly as shown in console
4. Ensure no trailing slash, correct protocol, correct domain
5. Ensure environment matches (sandbox → sandbox, live → live)

### Error: "No authorization code"

**Symptoms:**
- Callback page shows "No authorization code received"
- User redirected back to app but no code in URL

**Causes:**
1. User cancelled authorization
2. Redirect URI not registered (GoCardless won't redirect with code)
3. Redirect URI mismatch (different from what was sent)

**Solution:**
1. Verify redirect URI is registered in GoCardless Dashboard
2. Check that redirect URI matches exactly what was sent
3. Try OAuth flow again

### Error: "GoCardless not configured"

**Symptoms:**
- Error message: "GoCardless not configured"
- OAuth flow fails immediately

**Causes:**
- Missing `GOCARDLESS_CLIENT_ID` or `GOCARDLESS_CLIENT_SECRET` in Supabase secrets
- Secrets not set or incorrectly named

**Solution:**
1. Go to Supabase Dashboard → Edge Functions → Settings → Secrets
2. Verify `GOCARDLESS_CLIENT_ID` is set
3. Verify `GOCARDLESS_CLIENT_SECRET` is set
4. Verify `GOCARDLESS_ENVIRONMENT` is set (sandbox or live)
5. Redeploy Edge Functions if secrets were just added

### Error: "Unauthorized"

**Symptoms:**
- Error message: "Unauthorized"
- OAuth flow fails during callback

**Causes:**
- User not authenticated
- Invalid or expired session

**Solution:**
1. Ensure user is logged in
2. Try logging out and logging back in
3. Clear browser cache and cookies
4. Try OAuth flow again

---

## 📝 Code Changes Summary

### Files Modified

1. **supabase/functions/gocardless-connect/index.ts**
   - Stores `redirectUri` in state parameter
   - Enhanced logging

2. **supabase/functions/gocardless-callback/index.ts**
   - Extracts `redirectUri` from state parameter (primary source)
   - Falls back to request body if state missing (backwards compatibility)
   - Enhanced error handling for redirect_uri mismatches
   - Comprehensive logging

3. **src/pages/GoCardlessCallback.tsx**
   - Passes state parameter to callback Edge Function
   - Enhanced error handling for redirect_uri mismatch errors
   - Better user-facing error messages

### Backwards Compatibility

The fix is backwards compatible:
- If state parameter is missing, falls back to `redirectUrl` from request body
- If state parameter is present, uses `redirectUri` from state (ensures exact match)

---

## 🚀 Deployment Steps

1. **Update Edge Functions**
   ```bash
   # Deploy gocardless-connect
   supabase functions deploy gocardless-connect
   
   # Deploy gocardless-callback
   supabase functions deploy gocardless-callback
   ```

2. **Verify Secrets**
   - Check all required secrets are set in Supabase
   - Verify environment matches (sandbox/live)

3. **Verify Dashboard Configuration**
   - Check redirect URI is registered in correct dashboard
   - Verify environment matches

4. **Test**
   - Test OAuth flow in sandbox
   - Test OAuth flow in live (if applicable)
   - Verify logs show correct redirect_uri

5. **Monitor**
   - Monitor Edge Function logs for errors
   - Monitor user reports for connection issues

---

## 📚 Additional Resources

- [GoCardless OAuth Documentation](https://developer.gocardless.com/getting-started/oauth/overview)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Diagnostic Summary](./GOCARDLESS_OAUTH_FIX_DIAGNOSTIC.md)

---

## ✅ Success Criteria

The fix is successful when:
1. ✅ OAuth flow completes without redirect_uri mismatch errors
2. ✅ Tokens are successfully stored in database
3. ✅ Users can connect GoCardless reliably
4. ✅ Logs show redirect_uri matches between authorization and token exchange
5. ✅ Error messages are clear and actionable

---

**Last Updated:** 2025-01-27
**Status:** ✅ Complete and Ready for Testing

