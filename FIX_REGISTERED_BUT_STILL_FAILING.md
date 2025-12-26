# Fix: Redirect URI Registered But Still Failing

## 🔍 The Problem

You've registered the redirect URI in GoCardless Dashboard, but you're still getting "No authorization code" error.

**This usually means there's a MISMATCH** between what's being sent and what's registered.

## ⚡ Quick Diagnostic

### Step 1: Find Exact Redirect URI Being Sent

**Option A: Browser Console**
1. Open browser console (F12)
2. Click "Connect GoCardless"
3. Look for: `[GC-CLIENT] Hardcoded redirect URL: ...`
4. **Copy that EXACT value**

**Option B: Supabase Logs**
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click `gocardless-connect`
3. Check **most recent** logs (from last few minutes)
4. Look for: `Using dynamic redirect_uri: ...`
5. **Copy that EXACT value**

### Step 2: Compare with GoCardless Dashboard

1. Go to GoCardless Dashboard → Settings → API → Redirect URIs
2. **List ALL registered redirect URIs**
3. Compare **character-by-character** with what you copied

### Step 3: Common Mismatches

Even small differences cause failure:

❌ **Trailing Slash:**
- Sent: `https://solowipe.co.uk/gocardless-callback`
- Registered: `https://solowipe.co.uk/gocardless-callback/` ← Extra slash

❌ **Protocol:**
- Sent: `https://solowipe.co.uk/gocardless-callback`
- Registered: `http://solowipe.co.uk/gocardless-callback` ← http vs https

❌ **Domain:**
- Sent: `https://solowipe.co.uk/gocardless-callback`
- Registered: `https://www.solowipe.co.uk/gocardless-callback` ← www

❌ **Port (for localhost):**
- Sent: `http://localhost:5173/gocardless-callback`
- Registered: `http://localhost:3000/gocardless-callback` ← Different port

❌ **Environment:**
- Using sandbox Client ID but checking live dashboard
- Using live Client ID but checking sandbox dashboard

## 🔧 About Localhost URI

**Question: Should I remove localhost redirect URI?**

**Answer:** No, you can keep both registered:
- Production: `https://solowipe.co.uk/gocardless-callback`
- Local: `http://localhost:5173/gocardless-callback` (or your port)

GoCardless allows multiple redirect URIs. **Only remove localhost if:**
- You're 100% sure you're testing on production URL (`solowipe.co.uk`)
- And you'll never test locally again

**However**, if you're testing on production, make sure the **production URI is registered**, not just localhost.

## ✅ Fix Steps

### Step 1: Get Exact URI Being Sent

Run this in browser console (on your app):

```javascript
const currentHostname = window.location.hostname;
const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
const redirectUrl = isProduction 
  ? 'https://solowipe.co.uk/gocardless-callback'
  : `${window.location.origin}/gocardless-callback`;
console.log('Redirect URI that will be sent:', redirectUrl);
```

### Step 2: Verify in Dashboard

1. Go to correct GoCardless Dashboard (sandbox or live, based on your environment)
2. Settings → API → Redirect URIs
3. Find the URI from Step 1
4. Compare character-by-character
5. If different, update it to match exactly

### Step 3: If Still Not Working

1. **Remove the redirect URI** from GoCardless Dashboard
2. **Wait 1 minute**
3. **Add it back** using the EXACT value from Step 1
4. **Wait 1-2 minutes**
5. **Clear browser cache**
6. **Test again**

## 🎯 Most Likely Issue

Based on your setup, the most likely issue is:

1. **You're testing on production** (`solowipe.co.uk`) but only have localhost registered
2. **OR** there's a small mismatch (trailing slash, protocol, etc.)

**Fix:** Make sure the exact production URI (`https://solowipe.co.uk/gocardless-callback`) is registered, matching character-for-character with what's being sent.

