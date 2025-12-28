# Fix: "No authorization code received" - Missing localStorage Data

## What Happened

Your console logs show:
- ❌ No authorization code in URL
- ❌ No localStorage data (session token, user ID, redirect URL)
- ❌ No state parameter

**This means:** You navigated directly to `/gocardless-callback` without starting the OAuth flow, OR the localStorage data was cleared.

---

## Quick Fix

### Step 1: Go to Settings

1. Click "Return to Settings" button (or navigate to `/settings`)
2. Scroll to the **GoCardless Direct Debit** section

### Step 2: Start the Connection Properly

1. **Click the "Connect GoCardless" button** (don't navigate directly to the callback URL)
2. You should be redirected to GoCardless OAuth page
3. Complete the authorization
4. GoCardless will redirect you back automatically

---

## Why This Happened

The OAuth flow requires these steps in order:

1. ✅ **Click "Connect GoCardless"** → Stores data in localStorage
2. ✅ **Redirect to GoCardless** → User authorizes
3. ✅ **GoCardless redirects back** → With `?code=...` parameter
4. ✅ **Callback page processes** → Uses localStorage data + code

**If you skip step 1** (navigate directly to callback), there's no localStorage data, so the callback can't complete.

---

## Verification Steps

### Before Clicking "Connect GoCardless"

1. Open browser console (F12)
2. Go to **Application** tab → **Local Storage** → Your domain
3. Clear any existing `gocardless_*` items (optional, but recommended)
4. Go to Settings → GoCardless

### When You Click "Connect GoCardless"

Watch the console for these logs:

```
[GC-CLIENT] === PERSISTENT HANDSHAKE INITIALIZATION ===
[GC-CLIENT] Generated session token: gc_...
[GC-CLIENT] User ID: ...
[GC-CLIENT] Hardcoded redirect URL: https://solowipe.co.uk/gocardless-callback
[GC-CLIENT] === PERSISTENT HANDshake STORED ===
```

**Verify localStorage:**
- Go to **Application** tab → **Local Storage**
- You should see:
  - `gocardless_session_token`
  - `gocardless_user_id`
  - `gocardless_redirect_url`
  - `gocardless_state` (after OAuth URL is received)

### After Authorization

When GoCardless redirects you back, the URL should be:
```
https://solowipe.co.uk/gocardless-callback?code=abc123&state=xyz789
```

**NOT:**
```
https://solowipe.co.uk/gocardless-callback
```

---

## Common Mistakes

### ❌ Mistake 1: Direct Navigation
**Wrong:** Typing `/gocardless-callback` in address bar  
**Right:** Click "Connect GoCardless" button

### ❌ Mistake 2: Clearing localStorage
**Wrong:** Clearing browser data while OAuth flow is in progress  
**Right:** Wait for flow to complete, then clear if needed

### ❌ Mistake 3: Multiple Tabs
**Wrong:** Starting flow in one tab, completing in another  
**Right:** Complete entire flow in same browser tab

### ❌ Mistake 4: Browser Extensions
**Wrong:** Privacy extensions clearing localStorage  
**Right:** Disable extensions temporarily or whitelist your domain

---

## Still Not Working?

### Check 1: Verify localStorage is Working

Run this in browser console:
```javascript
// Test localStorage
localStorage.setItem('test', 'value');
console.log('localStorage test:', localStorage.getItem('test'));
localStorage.removeItem('test');
```

If this doesn't work, your browser may have localStorage disabled.

### Check 2: Verify OAuth Flow Starts

1. Click "Connect GoCardless"
2. Check console for `[GC-CLIENT]` logs
3. You should be redirected to GoCardless OAuth page
4. If not redirected, check for errors in console

### Check 3: Check Redirect URI

1. When redirected to GoCardless, check the URL
2. Look for `redirect_uri` parameter in the URL
3. It should be: `redirect_uri=https%3A%2F%2Fsolowipe.co.uk%2Fgocardless-callback`
4. Verify this matches what's in GoCardless Dashboard

### Check 4: Complete Authorization

1. Make sure you **complete** the authorization on GoCardless page
2. Don't close the tab or cancel
3. Wait for GoCardless to redirect you back

---

## Step-by-Step Correct Flow

1. **Go to:** https://solowipe.co.uk/settings
2. **Scroll to:** GoCardless Direct Debit section
3. **Click:** "Connect GoCardless" button
4. **Wait for:** Redirect to GoCardless OAuth page
5. **Complete:** Authorization on GoCardless page
6. **Wait for:** Automatic redirect back to your app
7. **Result:** Connection successful (or error message if something went wrong)

---

## If localStorage Keeps Getting Cleared

### Possible Causes:

1. **Browser Privacy Mode:** localStorage may be cleared on tab close
2. **Browser Extensions:** Privacy/security extensions clearing data
3. **Browser Settings:** localStorage disabled in browser settings
4. **Multiple Tabs:** Data cleared when opening in new tab

### Solutions:

1. **Use regular browser mode** (not incognito/private)
2. **Disable privacy extensions** temporarily
3. **Check browser settings** for localStorage restrictions
4. **Use same tab** for entire OAuth flow

---

## Quick Test

Run this diagnostic in browser console:

```javascript
// Check if localStorage is available
if (typeof(Storage) !== "undefined") {
  console.log('✅ localStorage is available');
  
  // Check current GoCardless data
  console.log('Session Token:', localStorage.getItem('gocardless_session_token') || 'MISSING');
  console.log('User ID:', localStorage.getItem('gocardless_user_id') || 'MISSING');
  console.log('Redirect URL:', localStorage.getItem('gocardless_redirect_url') || 'MISSING');
  console.log('State:', localStorage.getItem('gocardless_state') || 'MISSING');
} else {
  console.log('❌ localStorage is NOT available');
}
```

---

## Summary

**The fix is simple:** Don't navigate directly to the callback URL. Always start by clicking "Connect GoCardless" from Settings.

The OAuth flow requires:
1. ✅ Starting from Settings page
2. ✅ Clicking "Connect GoCardless" button
3. ✅ Completing authorization on GoCardless
4. ✅ Being redirected back automatically

If you follow these steps, localStorage will be set correctly and the callback will work.





