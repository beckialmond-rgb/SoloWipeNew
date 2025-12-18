# New Supabase Project Setup Guide

## Step 1: Create New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **"New Project"**
3. Fill in:
   - **Name**: Your project name (e.g., "SoloWipe")
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Select your plan
4. Click **"Create new project"**
5. Wait for project to initialize (2-3 minutes)

## Step 2: Get Your Project Credentials

Once project is ready:

1. Go to **Project Settings** → **API**
2. You'll see:

### Publishable Keys Tab:
- **Project URL**: `https://xxxxx.supabase.co`
- **Publishable key**: `sb_publishable_xxxxx` (anon/public key)

### Legacy Tab:
- **anon key**: `eyJ...` (JWT format, same as publishable key)
- **service_role key**: `eyJ...` (JWT format - SECRET!)

3. Copy these values - you'll need them next

## Step 3: Update Configuration Files

After you provide the new credentials, I'll update:
- `.env` file with new keys
- `supabase/config.toml` with new project ID

## Step 4: Set Up Edge Functions Secrets

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add secret:
   - **Name**: `SERVICE_ROLE_KEY`
   - **Value**: Your service_role key from Legacy tab

## Step 5: Update Netlify Environment Variables

1. Go to Netlify Dashboard → Your Site → **Site settings** → **Environment variables**
2. Add/Update:
   - `VITE_SUPABASE_URL` = Your project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Your publishable key
   - `VITE_SUPABASE_PROJECT_ID` = Your project ID (from URL)

## Step 6: Run Database Migrations

If you have existing migrations:
```bash
supabase db push
```

Or apply migrations manually in Supabase Dashboard → SQL Editor

---

**Once you have your new project credentials, share them and I'll update all the configuration files for you!**
