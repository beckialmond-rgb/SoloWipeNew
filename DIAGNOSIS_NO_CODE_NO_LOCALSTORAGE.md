# Diagnosis: No Code + No localStorage

## 🔍 What the Logs Show

```
[GC-CALLBACK-PAGE] Code from URL: MISSING
[GC-CALLBACK-PAGE] Error from URL: null
[GC-CALLBACK-PAGE] State from URL: null
[GC-CALLBACK-PAGE] Session token from localStorage: MISSING
[GC-CALLBACK-PAGE] User ID from localStorage/state: MISSING
```

## 🎯 What This Means

**All these being missing indicates:**

1. **The OAuth flow was never started**, OR
2. **localStorage was cleared** (browser settings, privacy mode, etc.), OR
3. **User navigated directly to `/gocardless-callback`** without clicking "Connect"

## ✅ Most Likely Scenarios

### Scenario 1: User Didn't Start the Connection

**What happened:**
- User navigated directly to `/gocardless-callback` URL
- Or the page was bookmarked/refreshed
- No "Connect GoCardless" button was clicked

**Fix:**
- User needs to go to **Settings → GoCardless**
- Click **"Connect GoCardless"** button
- This will store data in localStorage and redirect to GoCardless

### Scenario 2: localStorage Was Cleared

**What happened:**
- Browser cleared localStorage (privacy mode, browser settings, extension)
- Or user cleared browser data between clicking "Connect" and the callback

**Fix:**
- User needs to try connecting again from Settings
- Make sure browser isn't in private/incognito mode (if that's causing issues)
- Disable browser extensions that might clear localStorage

### Scenario 3: OAuth Flow Never Redirected

**What happened:**
- User clicked "Connect GoCardless"
- Edge function was called
- But redirect to GoCardless never happened
- User somehow ended up on callback page

**Fix:**
- Check browser console for errors when clicking "Connect"
- Check Supabase Edge Function logs (`gocardless-connect`)
- Verify redirect URI is registered in GoCardless Dashboard

## 🔧 Improved Error Handling

The code now checks if localStorage is missing:
- If **both code AND localStorage are missing** → "Connection not started" message
- If **code missing but localStorage exists** → "No authorization code received" (redirect URI issue)

## 📋 Action Steps for User

1. **Go to Settings → GoCardless**
2. **Click "Connect GoCardless" button**
3. **Complete authorization in GoCardless** (don't cancel)
4. **Should redirect back with code**

## 🚨 If It Still Happens After Clicking "Connect"

### Check 1: Browser Console When Clicking "Connect"

Look for:
```
[GC-CLIENT] === PERSISTENT HANDSHAKE INITIALIZATION ===
[GC-CLIENT] Generated session token: ...
[GC-CLIENT] User ID: ...
[GC-CLIENT] Hardcoded redirect URL: ...
[GC-CLIENT] Session token stored in localStorage
```

**If you DON'T see these logs:**
- The `handleConnect` function didn't run
- Check for JavaScript errors
- Check if user is authenticated

### Check 2: Check if localStorage is Being Stored

1. Open browser console (F12)
2. Click "Connect GoCardless"
3. Immediately check localStorage:
   ```javascript
   localStorage.getItem('gocardless_session_token')
   localStorage.getItem('gocardless_user_id')
   localStorage.getItem('gocardless_redirect_url')
   ```

**If these are null/undefined:**
- localStorage is being blocked (privacy mode, extension, settings)
- Or `handleConnect` didn't complete successfully

### Check 3: Check Supabase Edge Function

1. Go to Supabase Dashboard → Edge Functions → `gocardless-connect` → Logs
2. Click "Connect GoCardless" again
3. Check for errors in the logs

**If function fails:**
- Check required secrets are set
- Check function is deployed
- Check for authentication errors

## 💡 Quick Test

**To verify localStorage is working:**

1. Open browser console
2. Run:
   ```javascript
   localStorage.setItem('test', 'value');
   console.log(localStorage.getItem('test'));
   ```
3. Should print `'value'`

**If this doesn't work:**
- Browser is blocking localStorage
- Try different browser
- Check browser privacy settings

