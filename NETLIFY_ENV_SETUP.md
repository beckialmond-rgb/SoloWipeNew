# Netlify Environment Variables Setup

## ⚠️ White Screen Fix

If you're seeing a white screen on Netlify, it's likely because the environment variables are missing.

## Required Environment Variables

Add these in **Netlify Dashboard** → **Site settings** → **Environment variables**:

### 1. VITE_SUPABASE_URL
- **Value**: `https://owqjyaiptexqwafzmcwy.supabase.co`
- **Description**: Your Supabase project URL

### 2. VITE_SUPABASE_PUBLISHABLE_KEY
- **Value**: `sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF`
- **Description**: Your Supabase publishable (anon) key

### 3. VITE_SUPABASE_PROJECT_ID
- **Value**: `owqjyaiptexqwafzmcwy`
- **Description**: Your Supabase project ID

## Steps to Add:

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add each variable above (one at a time)
6. Click **Save**
7. **Redeploy** your site (go to Deploys → Trigger deploy → Deploy site)

## After Adding Variables:

1. **Redeploy** your site (important!)
2. Check browser console (F12) for any errors
3. The white screen should be resolved

## Troubleshooting:

- **Still white screen?** Check browser console (F12 → Console tab) for error messages
- **Build failing?** Check Netlify build logs
- **Variables not working?** Make sure they start with `VITE_` prefix
- **Need to clear cache?** Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
