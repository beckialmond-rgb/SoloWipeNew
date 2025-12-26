# Diagnose Redirect URI Mismatch

## 🔍 Problem: Registered But Still Failing

If the redirect URI is registered but you're still getting "No authorization code", there's likely a **mismatch** between what's being sent and what's registered.

## ✅ Diagnostic Steps

### Step 1: Check What Redirect URI Is Being Sent

When you click "Connect GoCardless", check your browser console for:

```
[GC-CLIENT] Hardcoded redirect URL: ...
```

OR check Supabase Edge Function logs:
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click `gocardless-connect`
3. Check **recent** logs (last few minutes)
4. Look for: `Using dynamic redirect_uri: ...`

**Copy that exact value.**

### Step 2: Check What's Registered in GoCardless Dashboard

1. Go to your GoCardless Dashboard (sandbox or live, based on your environment)
2. Settings → API → Redirect URIs
3. **List ALL registered redirect URIs**
4. Compare character-by-character with what's being sent

### Step 3: Common Mismatch Issues

Even if "close", these will cause failure:

1. **Trailing Slash:**
   - Sent: `https://solowipe.co.uk/gocardless-callback`
   - Registered: `https://solowipe.co.uk/gocardless-callback/` ❌ (extra slash)

2. **Protocol Mismatch:**
   - Sent: `https://solowipe.co.uk/gocardless-callback`
   - Registered: `http://solowipe.co.uk/gocardless-callback` ❌ (http vs https)

3. **Domain Mismatch:**
   - Sent: `https://solowipe.co.uk/gocardless-callback`
   - Registered: `https://www.solowipe.co.uk/gocardless-callback` ❌ (www)

4. **Port Mismatch (for localhost):**
   - Sent: `http://localhost:5173/gocardless-callback`
   - Registered: `http://localhost:3000/gocardless-callback` ❌ (different port)

5. **Environment Mismatch:**
   - Using sandbox Client ID but registered in live dashboard ❌
   - Using live Client ID but registered in sandbox dashboard ❌

### Step 4: Check Environment Match

1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/settings/functions
2. Check `GOCARDLESS_ENVIRONMENT` value
3. Verify:
   - If `sandbox` → Using sandbox Client ID AND checking sandbox dashboard
   - If `live` → Using live Client ID AND checking live dashboard

## 🔧 About Localhost Redirect URI

**You can have BOTH registered:**
- Production: `https://solowipe.co.uk/gocardless-callback`
- Local dev: `http://localhost:5173/gocardless-callback` (or your port)

**GoCardless allows multiple redirect URIs** - you don't need to remove localhost unless you're sure you're not using it.

**However**, if you're testing on production (`solowipe.co.uk`), make sure the **production URI is registered**, not just localhost.

## 🧪 Quick Test

Run this in your browser console when you're on the production site:

```javascript
// Check what redirect URI will be used
const isProduction = window.location.hostname === 'solowipe.co.uk' || window.location.hostname === 'www.solowipe.co.uk';
const redirectUrl = isProduction 
  ? 'https://solowipe.co.uk/gocardless-callback'
  : `${window.location.origin}/gocardless-callback`;
console.log('Redirect URI that will be used:', redirectUrl);
```

Then verify this EXACT value is registered in your GoCardless Dashboard.

## 📋 Action Items

1. ✅ Check browser console for exact redirect URI being sent
2. ✅ Check Supabase logs for exact redirect URI
3. ✅ Compare character-by-character with GoCardless Dashboard
4. ✅ Verify environment matches (sandbox → sandbox, live → live)
5. ✅ Verify both production AND localhost are registered (if needed)
6. ✅ Check for trailing slashes, protocol, domain mismatches

## 🆘 Still Not Working?

If it's still not working after verifying exact match:

1. **Check GoCardless Dashboard for errors:**
   - Look for any error messages
   - Verify Client ID matches your environment

2. **Check Supabase Edge Function logs:**
   - Look for any errors in `gocardless-connect`
   - Check if OAuth URL is being generated correctly

3. **Try removing and re-adding the redirect URI:**
   - Remove it from GoCardless Dashboard
   - Wait 1 minute
   - Add it back exactly as shown in logs
   - Wait 1-2 minutes
   - Test again

4. **Check if authorization is being cancelled:**
   - Are you completing the full authorization in GoCardless?
   - Or are you being redirected back before completing?

