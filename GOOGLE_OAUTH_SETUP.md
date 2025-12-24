# Google OAuth Setup Guide

## Google OAuth Client ID

Your Google OAuth Client ID:
```
729472025234-m4h030jt2df7slr1ks8k7661thcsc3dr.apps.googleusercontent.com
```

## Step 1: Get Google OAuth Client Secret

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create a new one)

2. **Navigate to OAuth Credentials**
   - Go to: **APIs & Services** → **Credentials**
   - Or: https://console.cloud.google.com/apis/credentials

3. **Find Your OAuth 2.0 Client**
   - Look for the Client ID: `729472025234-m4h030jt2df7slr1ks8k7661thcsc3dr.apps.googleusercontent.com`
   - Click on it to view details

4. **Copy the Client Secret**
   - You'll see a "Client secret" field
   - Click "Show" to reveal it
   - Copy this value (you'll need it for Step 2)

## Step 2: Configure Google OAuth in Supabase

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com/
   - Select your project: `owqjyaiptexqwafzmcwy`

2. **Navigate to Authentication Settings**
   - Go to: **Authentication** → **Providers**
   - Or: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/auth/providers

3. **Enable Google Provider**
   - Find "Google" in the list of providers
   - Toggle it to **Enabled**

4. **Enter OAuth Credentials**
   - **Client ID (for OAuth)**: `729472025234-m4h030jt2df7slr1ks8k7661thcsc3dr.apps.googleusercontent.com`
   - **Client Secret (for OAuth)**: Paste the Client Secret from Step 1
   - Click **Save**

## Step 3: Configure Redirect URLs in Supabase

1. **Go to URL Configuration**
   - In Supabase Dashboard: **Authentication** → **URL Configuration**
   - Or: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/auth/url-configuration

2. **Add Redirect URLs**
   Add these URLs to the "Redirect URLs" list:
   ```
   http://localhost:5173/
   http://localhost:5173
   https://solowipe.co.uk/
   https://solowipe.co.uk
   ```
   
   **Important:**
   - Include both with and without trailing slash
   - Use `http://` for local development
   - Use `https://` for production
   - No query parameters needed (Supabase handles that)

3. **Site URL**
   - Set **Site URL** to your production domain:
     ```
     https://solowipe.co.uk
     ```

## Step 4: Configure Authorized Redirect URIs in Google Cloud Console

**⚠️ CRITICAL STEP - This fixes the "redirect_uri_mismatch" error!**

1. **Go back to Google Cloud Console**
   - Navigate to: **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID: `729472025234-m4h030jt2df7slr1ks8k7661thcsc3dr.apps.googleusercontent.com`

2. **Add Authorized Redirect URIs**
   - Scroll to **"Authorized redirect URIs"** section
   - Click **"+ ADD URI"** button
   - Add this EXACT URL (copy-paste to avoid typos):
     ```
     https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback
     ```
   
   **⚠️ IMPORTANT:** 
   - Must match EXACTLY (no trailing slash, correct protocol)
   - This is Supabase's OAuth callback endpoint
   - Your app redirects to this, and Supabase then redirects to your app
   - See `GOOGLE_OAUTH_REDIRECT_URI_FIX.md` for detailed troubleshooting

3. **Add Authorized JavaScript Origins** (if required)
   - Scroll to **"Authorized JavaScript origins"** section
   - Click **"+ ADD URI"** button
   - Add:
     ```
     https://solowipe.co.uk
     http://localhost:5173
     ```

4. **Save Changes**
   - Click **Save** at the bottom
   - Wait 1-2 minutes for changes to propagate

## Step 5: Test Google Sign-In

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Open the app**
   - Go to: http://localhost:5173/auth

3. **Click "Sign in with Google"**
   - You should be redirected to Google's sign-in page
   - After signing in, you should be redirected back to your app
   - You should be logged in and redirected to the dashboard

## Troubleshooting

### Error: "Redirect URI mismatch"
- **In Supabase:** Check that your redirect URLs are added correctly (with and without trailing slash)
- **In Google Cloud Console:** Verify the authorized redirect URI includes: `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback`

### Error: "Invalid client"
- Verify the Client ID and Client Secret are correct in Supabase
- Make sure there are no extra spaces when copying/pasting

### Error: "OAuth consent screen not configured"
- Go to Google Cloud Console → **APIs & Services** → **OAuth consent screen**
- Complete the OAuth consent screen setup (app name, support email, etc.)

### Sign-in works but user isn't created
- Check Supabase logs for any database errors
- Verify the `profiles` table has the correct RLS policies
- Check that the profile creation trigger is working

## Verification Checklist

- [ ] Google OAuth Client ID copied: `729472025234-m4h030jt2df7slr1ks8k7661thcsc3dr.apps.googleusercontent.com`
- [ ] Google OAuth Client Secret obtained from Google Cloud Console
- [ ] Google provider enabled in Supabase Dashboard
- [ ] Client ID and Client Secret entered in Supabase
- [ ] Redirect URLs added in Supabase (localhost and production)
- [ ] Authorized redirect URI added in Google Cloud Console: `https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback`
- [ ] OAuth consent screen configured in Google Cloud Console
- [ ] Tested Google sign-in in development
- [ ] Tested Google sign-in in production

## Additional Notes

- The app automatically handles OAuth callbacks through Supabase
- No additional code changes needed - the fixes in `useAuth.tsx` and `Auth.tsx` handle the OAuth flow
- Users will be automatically redirected to `/dashboard` after successful sign-in
- OAuth users will have their profile created automatically via database triggers

