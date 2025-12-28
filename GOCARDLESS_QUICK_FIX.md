# Quick Fix: "No authorization code received" Error

## The Problem

You're seeing this error because you're navigating **directly** to the callback page (`/gocardless-callback`) without starting the OAuth flow from Settings.

## The Solution (2 Steps)

### Step 1: Click "Return to Settings" Button
Click the blue "Return to Settings" button on the error page.

### Step 2: Start the Connection Properly
1. Scroll to **GoCardless Direct Debit** section
2. Click the **"Connect GoCardless"** button (blue button with external link icon)
3. **DO NOT** type `/gocardless-callback` in the address bar
4. Complete authorization on GoCardless
5. You'll be redirected back automatically

## Why This Happens

The GoCardless OAuth flow requires these steps **in order**:

1. ✅ Click "Connect GoCardless" → Stores data in localStorage
2. ✅ Redirect to GoCardless → You authorize
3. ✅ GoCardless redirects back → With `?code=...` parameter
4. ✅ Callback processes → Uses localStorage + code

**If you skip step 1** (navigate directly), there's no localStorage data, so the callback fails.

## What NOT to Do

❌ **Don't navigate directly to:** `/gocardless-callback`  
❌ **Don't type the URL in address bar**  
❌ **Don't bookmark the callback URL**  
❌ **Don't refresh the callback page**

## What TO Do

✅ **Always start from Settings page**  
✅ **Click "Connect GoCardless" button**  
✅ **Complete authorization on GoCardless**  
✅ **Wait for automatic redirect back**

## Verification

After clicking "Connect GoCardless", check the browser console (F12). You should see:

```
[GC-CLIENT] === PERSISTENT HANDSHAKE INITIALIZATION ===
[GC-CLIENT] Generated session token: gc_...
[GC-CLIENT] Hardcoded redirect URL: https://solowipe.co.uk/gocardless-callback
[GC-CLIENT] === LOCALSTORAGE VERIFICATION ===
[GC-CLIENT] Session token: ✅ Present
[GC-CLIENT] User ID: ✅ Present
[GC-CLIENT] Redirect URL: ✅ Present
```

If you see these logs, the connection flow started correctly.

## Still Having Issues?

1. **Clear browser cache** and try again
2. **Use a regular browser tab** (not incognito/private mode)
3. **Disable browser extensions** temporarily
4. **Check browser console** for any errors
5. **Verify redirect URI** is registered in GoCardless Dashboard:
   - Go to: https://manage.gocardless.com/settings/api
   - Check "Redirect URIs" section
   - Should have: `https://solowipe.co.uk/gocardless-callback`

---

**Remember:** Always start from Settings → Click "Connect GoCardless" button. Never navigate directly to the callback URL.





