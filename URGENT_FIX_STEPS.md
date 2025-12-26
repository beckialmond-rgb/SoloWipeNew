# ⚠️ URGENT: Fix "No Authorization Code" Error

## The Issue

Redirect URI is registered but still failing. This means there's a **mismatch** between what's sent and what's registered.

## 🔍 Step 1: Find EXACT Redirect URI Being Sent

### Option A: Browser Console (Easiest)

1. Open your browser console (F12)
2. Go to your app (where you'll click "Connect GoCardless")
3. Copy and paste this entire script:

```javascript
(function() {
  const currentHostname = window.location.hostname;
  const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
  const redirectUrl = isProduction 
    ? 'https://solowipe.co.uk/gocardless-callback'
    : `${window.location.origin}/gocardless-callback`;
  console.log('🔍 REDIRECT URI THAT WILL BE SENT:', redirectUrl);
  return redirectUrl;
})();
```

4. Press Enter
5. **Copy the exact redirect URI** shown in console

### Option B: Check Browser Console When Connecting

1. Open browser console (F12)
2. Click "Connect GoCardless"
3. Look for: `[GC-CLIENT] Hardcoded redirect URL: ...`
4. **Copy that exact value**

### Option C: Supabase Logs

1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click `gocardless-connect`
3. Check **most recent** logs (from last few minutes)
4. Look for: `Using dynamic redirect_uri: ...`
5. **Copy that exact value**

## ✅ Step 2: Verify in GoCardless Dashboard

1. Go to correct GoCardless Dashboard:
   - **Sandbox**: https://manage-sandbox.gocardless.com/settings/api
   - **Live**: https://manage.gocardless.com/settings/api

2. Scroll to "Redirect URIs" section

3. **Compare character-by-character:**
   - What you copied from Step 1
   - What's registered in dashboard

4. **Common mismatches to check:**
   - ❌ Trailing slash: `/gocardless-callback/` vs `/gocardless-callback`
   - ❌ Protocol: `http://` vs `https://`
   - ❌ Domain: `www.solowipe.co.uk` vs `solowipe.co.uk`
   - ❌ Port (localhost): `:3000` vs `:5173` vs `:8080`

## 🔧 Step 3: About Localhost URI

**Answer: Keep both registered!**

You can have BOTH registered:
- `https://solowipe.co.uk/gocardless-callback` (production)
- `http://localhost:5173/gocardless-callback` (local dev, replace 5173 with your port)

**GoCardless allows multiple redirect URIs.** Only remove localhost if:
- You're 100% testing on production
- AND you'll never test locally again

**However**, if you're testing on production URL (`solowipe.co.uk`), make sure the **production URI is registered**, not just localhost.

## ✅ Step 4: Fix the Mismatch

If there's a mismatch:

1. **Update the redirect URI in GoCardless Dashboard** to match exactly what's being sent
2. **OR remove and re-add it** using the exact value from Step 1
3. **Wait 1-2 minutes** for changes to propagate
4. **Clear browser cache** (Cmd+Shift+R)
5. **Test again**

## 🎯 Most Likely Scenarios

### Scenario 1: Testing on Production
- You're on `solowipe.co.uk`
- App sends: `https://solowipe.co.uk/gocardless-callback`
- Only localhost is registered ❌
- **Fix:** Register production URI

### Scenario 2: Small Mismatch
- App sends: `https://solowipe.co.uk/gocardless-callback`
- Dashboard has: `https://solowipe.co.uk/gocardless-callback/` (trailing slash) ❌
- **Fix:** Remove trailing slash

### Scenario 3: Environment Mismatch
- Using sandbox Client ID
- But checking live dashboard ❌
- **Fix:** Check correct dashboard for your environment

## 📋 Quick Checklist

- [ ] Found exact redirect URI being sent (from console/logs)
- [ ] Verified it's registered in GoCardless Dashboard (character-for-character)
- [ ] Checked for trailing slash mismatch
- [ ] Checked for protocol mismatch (http vs https)
- [ ] Checked for domain mismatch (www vs non-www)
- [ ] Verified correct dashboard (sandbox vs live based on environment)
- [ ] Updated/added redirect URI to match exactly
- [ ] Waited 1-2 minutes after updating
- [ ] Cleared browser cache
- [ ] Tested again

---

**The key is: the redirect URI sent must match EXACTLY (character-for-character) what's registered in GoCardless Dashboard.**

