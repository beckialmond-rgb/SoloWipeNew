# How to Deploy the GoCardless Connect Edge Function

## The Problem
The CORS error occurs because the edge function on Supabase hasn't been updated with the new code yet. The code is fixed locally, but needs to be deployed.

## Step-by-Step Deployment Guide

### Option 1: Deploy via Supabase Dashboard (Easiest - Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy
   - Log in if needed

2. **Navigate to Edge Functions**
   - Click on **"Edge Functions"** in the left sidebar
   - You should see a list of functions including `gocardless-connect`

3. **Edit the Function**
   - Find `gocardless-connect` in the list
   - Click on it to open the function details
   - Look for an **"Edit"** button or **"View Code"** option
   - If there's a code editor, click it

4. **Copy the Updated Code**
   - Open the file: `/Users/rebeccaalmond/Downloads/solowipe-main/supabase/functions/gocardless-connect/index.ts`
   - Copy ALL the code (Cmd+A, Cmd+C on Mac)

5. **Paste and Deploy**
   - Paste the code into the Supabase code editor
   - Click **"Deploy"** or **"Save"** button
   - Wait for deployment to complete (usually 10-30 seconds)

6. **Verify Deployment**
   - The function should show "Deployed" status
   - Try connecting GoCardless again in your app

---

### Option 2: Deploy via Supabase CLI (If You Have It Installed)

If you have the Supabase CLI installed, you can deploy from the terminal:

```bash
# Navigate to project directory
cd /Users/rebeccaalmond/Downloads/solowipe-main

# Deploy the function
supabase functions deploy gocardless-connect

# You'll be prompted to log in to Supabase if not already logged in
```

**To check if you have Supabase CLI:**
```bash
which supabase
# If it shows a path, you have it installed
# If it says "command not found", use Option 1 instead
```

---

## What Was Fixed?

The updated code includes:

1. **Explicit 204 status for OPTIONS requests:**
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response(null, { 
       status: 204,  // ← Added explicit status
       headers: corsHeaders 
     });
   }
   ```

2. **Added Access-Control-Allow-Methods header:**
   ```typescript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
     'Access-Control-Allow-Methods': 'POST, OPTIONS',  // ← Added this
   };
   ```

3. **Fixed redirect URL to use current origin:**
   ```typescript
   // In GoCardlessSection.tsx
   const redirectUrl = isProduction 
     ? 'https://solowipe.co.uk/settings?gocardless=callback'
     : `${window.location.origin}/settings?gocardless=callback`;  // ← Now works on any port
   ```

---

## After Deployment

1. **Refresh your browser** (hard refresh: Cmd+Shift+R)
2. **Try connecting GoCardless again**
3. **Check the browser console** - the CORS error should be gone
4. **Check Supabase logs** - Go to Edge Functions → gocardless-connect → Logs to see if requests are coming through

---

## If It Still Doesn't Work

1. **Check Function Logs:**
   - Supabase Dashboard → Edge Functions → gocardless-connect → Logs
   - Look for any error messages

2. **Verify Secrets Are Set:**
   - Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Ensure `GOCARDLESS_CLIENT_ID` is set
   - Ensure `GOCARDLESS_CLIENT_SECRET` is set
   - Ensure `GOCARDLESS_ENVIRONMENT` is set (usually `sandbox`)

3. **Clear Browser Cache:**
   - Hard refresh (Cmd+Shift+R)
   - Or clear browser cache completely

4. **Check Function Status:**
   - Make sure the function shows as "Active" or "Deployed"
   - If it shows an error, check the logs

