# 🔧 Netlify Environment Variables Setup Guide

## ⚠️ Current Issue

Your live site is showing: **"SoloWipe can't connect to Supabase yet"**

This is because the Supabase environment variables are not set in Netlify.

---

## ✅ Quick Fix Steps

### Step 1: Go to Netlify Dashboard

1. Open [Netlify Dashboard](https://app.netlify.com/)
2. Select your site (SoloWipe)
3. Go to **Site settings** → **Environment variables**

### Step 2: Add Required Variables

Click **"Add a variable"** and add these **one at a time**:

#### Variable 1: `VITE_SUPABASE_URL`
- **Key:** `VITE_SUPABASE_URL`
- **Value:** `https://owqjyaiptexqwafzmcwy.supabase.co`
- **Scopes:** Select **"Production"** and **"Deploy previews"**
- Click **"Save"**

#### Variable 2: `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Key:** `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Value:** `sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF`
- **Scopes:** Select **"Production"** and **"Deploy previews"**
- Click **"Save"**

#### Variable 3 (Optional): `VITE_SUPABASE_PROJECT_ID`
- **Key:** `VITE_SUPABASE_PROJECT_ID`
- **Value:** `owqjyaiptexqwafzmcwy`
- **Scopes:** Select **"Production"** and **"Deploy previews"**
- Click **"Save"**

### Step 3: Redeploy Your Site

**⚠️ IMPORTANT:** After adding variables, you MUST redeploy:

1. Go to **Deploys** tab
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for the build to complete (1-2 minutes)

### Step 4: Verify It Works

1. Visit your live site
2. The error message should be gone
3. You should be able to sign up/login

---

## 📋 Complete Checklist

- [ ] `VITE_SUPABASE_URL` added to Netlify
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` added to Netlify
- [ ] `VITE_SUPABASE_PROJECT_ID` added to Netlify (optional)
- [ ] All variables set for **Production** scope
- [ ] All variables set for **Deploy previews** scope
- [ ] Site redeployed after adding variables
- [ ] Error message no longer appears on live site

---

## 🔍 Where to Find Your Supabase Keys

If you need to verify or get new keys:

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. You'll see:
   - **Project URL** → Use for `VITE_SUPABASE_URL`
   - **anon public** key → Use for `VITE_SUPABASE_PUBLISHABLE_KEY` (if it starts with `sb_publishable_`)
   - **anon public** key → Use for `VITE_SUPABASE_ANON_KEY` (if it starts with `eyJ`)

---

## 🚨 Troubleshooting

### Still seeing the error after redeploy?

1. **Check variable names** - Must be exactly:
   - `VITE_SUPABASE_URL` (not `SUPABASE_URL`)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (not `SUPABASE_KEY`)

2. **Check scopes** - Variables must be set for **Production** scope

3. **Hard refresh** - Clear browser cache:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

4. **Check build logs** - In Netlify → Deploys → Latest deploy → Build log
   - Look for any errors about environment variables

5. **Verify values** - Make sure there are no extra spaces or quotes

---

## 📝 Alternative: Using ANON_KEY Instead

If you prefer to use the legacy format:

Instead of `VITE_SUPABASE_PUBLISHABLE_KEY`, use:
- **Key:** `VITE_SUPABASE_ANON_KEY`
- **Value:** Your anon key (starts with `eyJ...`)

The app supports both formats, so either works!

---

## ✅ Expected Result

After completing these steps:
- ✅ No more "Configuration required" error
- ✅ Sign up/login forms work
- ✅ App connects to Supabase successfully
- ✅ All features work normally

---

**Need help?** Check the build logs in Netlify or browser console (F12) for specific error messages.





