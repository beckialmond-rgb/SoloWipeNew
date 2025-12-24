# ⚠️ URGENT: Google OAuth Redirect URI Mismatch Fix

## The Error

**Error Message:** "Access blocked: This app's request is invalid"  
**Error Code:** `400: redirect_uri_mismatch`

This error occurs because the redirect URI that Supabase is sending to Google doesn't match what's registered in your Google Cloud Console.

---

## ✅ Quick Fix (2 minutes)

### Step 1: Go to Google Cloud Console

1. **Visit Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Navigate to OAuth Credentials**
   - Go to: **APIs & Services** → **Credentials**
   - Or directly: https://console.cloud.google.com/apis/credentials

3. **Find Your OAuth 2.0 Client**
   - Look for Client ID: `729472025234-m4h030jt2df7slr1ks8k7661thcsc3dr.apps.googleusercontent.com`
   - Click on it to edit

### Step 2: Add the Supabase Callback URL

1. **Scroll to "Authorized redirect URIs"**
   - Find the section labeled **"Authorized redirect URIs"**
   - Click **"+ ADD URI"** button

2. **Add This EXACT URL:**
   ```
   https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback
   ```
   
   **⚠️ CRITICAL:** The URL must match EXACTLY:
   - ✅ Use `https://` (not `http://`)
   - ✅ Use `owqjyaiptexqwafzmcwy.supabase.co` (your Supabase project domain)
   - ✅ Use `/auth/v1/callback` (exact path)
   - ✅ NO trailing slash (NOT `/auth/v1/callback/`)
   - ✅ NO query parameters

3. **Click "Save"**
   - Wait 1-2 minutes for changes to propagate

### Step 3: Verify It's Added

- The URI should appear in your list of authorized redirect URIs
- Make sure there are no typos
- Make sure it matches exactly: `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback`

---

## Why This Happens

When you click "Sign in with Google" in your app:

1. Your app calls Supabase's `signInWithOAuth('google')`
2. Supabase redirects to Google with redirect URI: `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback`
3. Google checks if this URI is in your authorized list
4. If it's NOT in the list → **Error 400: redirect_uri_mismatch**
5. If it IS in the list → Google redirects back to Supabase
6. Supabase processes the OAuth callback and redirects to your app

---

## Additional Configuration (If Needed)

### Authorized JavaScript Origins

If Google asks for "Authorized JavaScript origins", add:
```
https://solowipe.co.uk
http://localhost:5173
```

### OAuth Consent Screen

If you see "OAuth consent screen not configured":
1. Go to: **APIs & Services** → **OAuth consent screen**
2. Fill in:
   - **App name**: SoloWipe (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
3. Click **Save and Continue**
4. Add scopes if needed (usually not required for basic sign-in)
5. Add test users if your app is in testing mode

---

## Test After Fixing

1. **Wait 1-2 minutes** for Google to update
2. **Go to your app**: http://localhost:5173/auth (or your production URL)
3. **Click "Sign in with Google"**
4. **You should now be redirected to Google sign-in** (not the error page)
5. **After signing in**, you should be redirected back to your app and logged in

---

## Common Mistakes to Avoid

❌ **Wrong:** `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback/` (trailing slash)  
✅ **Correct:** `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback`

❌ **Wrong:** `http://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback` (wrong protocol)  
✅ **Correct:** `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback`

❌ **Wrong:** `https://solowipe.co.uk/auth/v1/callback` (your app URL, not Supabase)  
✅ **Correct:** `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback` (Supabase callback)

---

## Verification Checklist

- [ ] Opened Google Cloud Console → Credentials
- [ ] Found OAuth Client ID: `729472025234-m4h030jt2df7slr1ks8k7661thcsc3dr.apps.googleusercontent.com`
- [ ] Added redirect URI: `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback`
- [ ] Verified no trailing slash
- [ ] Verified using `https://` protocol
- [ ] Clicked "Save"
- [ ] Waited 1-2 minutes
- [ ] Tested Google sign-in in app
- [ ] Sign-in now works! ✅

---

## Still Not Working?

1. **Check Supabase Configuration:**
   - Go to Supabase Dashboard → Authentication → Providers → Google
   - Verify Client ID and Client Secret are entered correctly
   - Make sure Google provider is **Enabled**

2. **Check Browser Console:**
   - Open browser console (F12)
   - Look for any error messages
   - Check network tab for failed requests

3. **Verify Redirect URI in Google Cloud Console:**
   - Make sure the URI appears in the list
   - Try removing and re-adding it
   - Make sure you're editing the correct OAuth client

4. **Check OAuth Consent Screen:**
   - Make sure it's configured
   - Add your email as a test user if app is in testing mode

