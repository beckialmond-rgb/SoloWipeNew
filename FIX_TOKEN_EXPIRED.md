# Fix: GoCardless Access Token Expired

## 🔍 Problem Identified

The error logs show:
```
Access token not active
Error code: 401
Reason: access_token_not_active
```

**This means:** Your GoCardless access token is expired/invalid, even though the connection shows as "active" in Settings.

## ✅ Solution: Reconnect GoCardless

### Step 1: Go to Settings
1. Open the app
2. Navigate to **Settings** (bottom nav)
3. Scroll to **GoCardless** section

### Step 2: Reconnect GoCardless
1. Click **"Disconnect"** or **"Reconnect"** button
2. If you see "Connected", click it to disconnect first
3. Then click **"Connect GoCardless"**
4. Complete the OAuth flow:
   - Authorize the app
   - You'll be redirected back
   - The connection will be re-established

### Step 3: Verify Connection
1. Settings should show **"Connected"** with green checkmark
2. Try the invite again - it should work now

## 🔄 Why This Happens

- GoCardless access tokens can expire
- Tokens may be revoked in GoCardless Dashboard
- OAuth refresh tokens may not be working
- Database may show connection as active but token is invalid

## ✅ After Reconnecting

1. The new token will be stored in the database
2. Direct Debit invites will work again
3. Payment collection will work
4. All GoCardless features will function

## 🚨 If Reconnection Fails

If you can't reconnect:

1. **Check GoCardless Dashboard:**
   - Go to: https://manage.gocardless.com/
   - Settings → Connected Apps
   - Remove SoloWipe if it exists
   - Try connecting again from the app

2. **Check Supabase Secrets:**
   - Verify `GOCARDLESS_CLIENT_ID` is correct
   - Verify `GOCARDLESS_CLIENT_SECRET` is correct
   - Verify `GOCARDLESS_ENVIRONMENT` is `sandbox` (or `live` for production)

3. **Check Redirect URLs:**
   - In GoCardless Dashboard → Settings → OAuth
   - Ensure these redirect URLs are registered:
     - `https://solowipe.co.uk/gocardless-callback` (production)
     - `http://localhost:8080/gocardless-callback` (development)

## 📝 Quick Fix

**Just go to Settings → GoCardless → Reconnect**

The improved error handling will now show:
> **"GoCardless connection expired. Please reconnect in Settings."**

This makes it clear what you need to do!

