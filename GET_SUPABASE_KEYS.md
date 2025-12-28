# How to Get Your Supabase Keys

## 🔍 Your .env File is Empty

Your `.env` file has the variables but no values. You need to get them from Supabase.

---

## ✅ Step-by-Step: Get Your Supabase Keys

### Step 1: Go to Supabase Dashboard

1. Visit: https://app.supabase.com/
2. Sign in to your account
3. Select your project (or create a new one if you don't have one)

### Step 2: Get Your Project Credentials

1. In your Supabase project, go to:
   - **Settings** (gear icon in left sidebar)
   - Click **API** (under Project Settings)

2. You'll see two tabs:
   - **Publishable Keys** (new format)
   - **Legacy** (old format)

### Step 3: Copy the Values

**From "Publishable Keys" tab:**
- **Project URL** → Copy this (looks like: `https://xxxxx.supabase.co`)
- **Publishable key** → Copy this (starts with `sb_publishable_...`)

**OR from "Legacy" tab:**
- **Project URL** → Copy this
- **anon public** key → Copy this (starts with `eyJ...`)

---

## 📋 What You Need for Netlify

You need to add these to Netlify:

### Required:
1. **VITE_SUPABASE_URL**
   - Value: Your Project URL (from Supabase)
   - Example: `https://owqjyaiptexqwafzmcwy.supabase.co`

2. **VITE_SUPABASE_ANON_KEY** OR **VITE_SUPABASE_PUBLISHABLE_KEY**
   - Value: Your anon/publishable key (from Supabase)
   - Either format works:
     - Legacy: `eyJ...` (use with `VITE_SUPABASE_ANON_KEY`)
     - New: `sb_publishable_...` (use with `VITE_SUPABASE_PUBLISHABLE_KEY`)

### Optional:
3. **VITE_SUPABASE_PROJECT_ID**
   - Value: The project ID from your URL
   - Example: If URL is `https://owqjyaiptexqwafzmcwy.supabase.co`, the ID is `owqjyaiptexqwafzmcwy`

---

## 🚀 Quick Steps

1. **Go to Supabase:** https://app.supabase.com/
2. **Select your project**
3. **Settings → API**
4. **Copy:**
   - Project URL
   - Publishable key (or anon key from Legacy tab)
5. **Add to Netlify:**
   - Netlify Dashboard → Your Site
   - Site settings → Environment variables
   - Add `VITE_SUPABASE_URL` = (your URL)
   - Add `VITE_SUPABASE_PUBLISHABLE_KEY` = (your key) OR `VITE_SUPABASE_ANON_KEY` = (your key)
6. **Redeploy** (Trigger deploy → Deploy site)

---

## 🆘 Don't Have a Supabase Project?

If you don't have a Supabase project yet:

1. Go to: https://app.supabase.com/
2. Click **"New Project"**
3. Fill in:
   - Name: "SoloWipe" (or your choice)
   - Database password: Create a strong password
   - Region: Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup
6. Then follow steps above to get your keys

---

## ✅ After Getting Keys

1. Add them to Netlify (Site settings → Environment variables)
2. **Redeploy** your site
3. Your app should work!

---

**Go to Supabase Dashboard and get your keys - that's what's missing!** 🔑





