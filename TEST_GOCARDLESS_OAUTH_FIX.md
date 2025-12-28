# Testing the GoCardless OAuth Fix

## ✅ Deployment Status

Both Edge Functions have been successfully deployed:
- ✅ `gocardless-connect` - Deployed
- ✅ `gocardless-callback` - Deployed

**Dashboard:** https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions

---

## 🧪 Quick Test Checklist

### Pre-Test Verification

Before testing, verify:

- [ ] **GoCardless Dashboard Configuration**
  - Sandbox: https://manage-sandbox.gocardless.com/settings/api
  - Live: https://manage.gocardless.com/settings/api
  - Redirect URI registered: `https://solowipe.co.uk/gocardless-callback`
  - No trailing slash
  - Correct protocol (https)
  - Environment matches Client ID (sandbox → sandbox, live → live)

- [ ] **Supabase Secrets**
  - `GOCARDLESS_CLIENT_ID` set
  - `GOCARDLESS_CLIENT_SECRET` set
  - `GOCARDLESS_ENVIRONMENT` set (sandbox or live)
  - `SERVICE_ROLE_KEY` set

---

## 🔬 Testing Steps

### Step 1: Test OAuth Flow

1. **Open your app**
   - Navigate to Settings → GoCardless section
   - Ensure you're logged in

2. **Start Connection**
   - Click "Connect GoCardless" button
   - You should be redirected to GoCardless authorization page

3. **Verify Redirect**
   - Complete authorization in GoCardless
   - You should be redirected back to `/gocardless-callback?code=...&state=...`
   - The callback should process successfully

4. **Check Success**
   - You should be redirected to Settings page
   - GoCardless connection status should show "Connected"
   - No error messages

### Step 2: Verify Logs

Check Edge Function logs in Supabase Dashboard:

**gocardless-connect logs should show:**
```
[GC-CONNECT] State parameter contents: {"userId":"...","redirectUri":"...","timestamp":...}
[GC-CONNECT] State parameter (base64): ...
```

**gocardless-callback logs should show:**
```
[GC-CALLBACK] === CALLBACK PROCESSING START ===
[GC-CALLBACK] Received state parameter: ... (present)
[GC-CALLBACK] State parameter decoded: {"userId":"...","redirectUri":"...","timestamp":...}
[GC-CALLBACK] ✅ Extracted redirect_uri from state parameter: https://solowipe.co.uk/gocardless-callback
[GC-CALLBACK] ✅ Final redirect_uri to use: https://solowipe.co.uk/gocardless-callback
[GC-CALLBACK] === TOKEN EXCHANGE REQUEST ===
[GC-CALLBACK] ✅ Token exchange successful
```

### Step 3: Verify Database

Check that tokens are stored:

1. Go to Supabase Dashboard → Table Editor → `profiles`
2. Find your user's profile
3. Verify:
   - `gocardless_access_token_encrypted` is set (encrypted token)
   - `gocardless_organisation_id` is set
   - `gocardless_connected_at` has a timestamp

---

## ❌ Troubleshooting

### Error: "Redirect URI mismatch"

**Check:**
1. GoCardless Dashboard has exact redirect URI registered
2. No trailing slash in redirect URI
3. Environment matches (sandbox → sandbox, live → live)
4. Check browser console for exact redirect URI being used

**Solution:**
- Verify redirect URI in logs matches dashboard exactly
- Update dashboard if needed

### Error: "No authorization code"

**Check:**
1. Redirect URI is registered in GoCardless Dashboard
2. User completed authorization (didn't cancel)
3. Check callback URL has `code` parameter

**Solution:**
- Try OAuth flow again
- Verify redirect URI is registered

### Error: "GoCardless not configured"

**Check:**
1. Supabase secrets are set
2. `GOCARDLESS_CLIENT_ID` is set
3. `GOCARDLESS_CLIENT_SECRET` is set
4. `GOCARDLESS_ENVIRONMENT` is set

**Solution:**
- Set missing secrets in Supabase Dashboard
- Redeploy functions after adding secrets

---

## 📊 Success Indicators

The fix is working correctly if:

- ✅ OAuth flow completes without redirect_uri mismatch errors
- ✅ User is redirected back to app successfully
- ✅ GoCardless connection status shows "Connected"
- ✅ Tokens are stored in database
- ✅ Logs show redirect_uri extracted from state parameter
- ✅ Logs show redirect_uri matches between authorization and token exchange

---

## 🔄 Testing Multiple Scenarios

### Test 1: Normal Flow
- Complete OAuth flow normally
- Should work without errors

### Test 2: localStorage Cleared
- Start OAuth flow
- Clear localStorage during authorization
- Should still work (uses state parameter)

### Test 3: Multiple Connections
- Disconnect GoCardless
- Reconnect GoCardless
- Should work each time

### Test 4: Error Handling
- Cancel authorization in GoCardless
- Should show appropriate error message
- Should redirect back to Settings

---

## 📝 Test Results Template

Use this template to record test results:

```
Date: ___________
Environment: [Sandbox / Live]
Tester: ___________

✅ Pre-Test Checks:
  [ ] GoCardless Dashboard configured
  [ ] Supabase secrets set
  [ ] Redirect URI registered

✅ Test Results:
  [ ] OAuth flow started successfully
  [ ] Authorization completed
  [ ] Callback processed successfully
  [ ] Connection status shows "Connected"
  [ ] Tokens stored in database
  [ ] Logs show correct redirect_uri flow

❌ Issues Found:
  - 
  - 

✅ Overall Result: [PASS / FAIL]
```

---

## 🆘 Need Help?

If you encounter issues:

1. Check Supabase Dashboard → Edge Functions → Logs
2. Check browser console for client-side errors
3. Verify GoCardless Dashboard configuration
4. Review [GOCARDLESS_OAUTH_FIX_COMPLETE.md](./GOCARDLESS_OAUTH_FIX_COMPLETE.md) for detailed troubleshooting

---

**Last Updated:** 2025-01-27
**Status:** Ready for Testing





