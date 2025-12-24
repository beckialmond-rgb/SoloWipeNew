# Quick Fix: GoCardless CORS Error

## The Problem
The edge function code is fixed, but Supabase is still running the old version. You need to deploy the updated code.

## Quick Solution (3 Steps)

### Step 1: Get the Updated Code

The updated code is in this file:
```
/Users/rebeccaalmond/Downloads/solowipe-main/supabase/functions/gocardless-connect/index.ts
```

**Open this file and copy ALL the code (Cmd+A, then Cmd+C)**

---

### Step 2: Deploy via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Sign in if needed
   - Select your project (should be `owqjyaiptexqwafzmcwy`)

2. **Navigate to Edge Functions**
   - In the left sidebar, click **"Edge Functions"**
   - You should see a list including `gocardless-connect`

3. **Edit the Function**
   - Click on **`gocardless-connect`** in the list
   - Look for an **"Edit"** button or **code icon** (usually in the top right)
   - This opens the code editor

4. **Replace the Code**
   - Select ALL existing code in the editor (Cmd+A)
   - Delete it
   - Paste the NEW code you copied in Step 1
   - Click **"Deploy"** or **"Save"** button (usually at the top right)
   - Wait 10-30 seconds for deployment to complete

5. **Verify**
   - You should see a success message or the function status change to "Deployed"
   - The timestamp should update to show it was just deployed

---

### Step 3: Test

1. **Hard refresh your browser**
   - Mac: Cmd+Shift+R
   - Windows: Ctrl+Shift+R

2. **Try connecting GoCardless again**
   - The CORS error should be gone
   - Check browser console - no more CORS errors

---

## What the Fix Does

The updated code:
- ✅ Returns proper `204` status for OPTIONS requests (fixes CORS preflight)
- ✅ Includes `Access-Control-Allow-Methods` header
- ✅ Handles requests from any port (8080, 3000, etc.)

---

## If You Can't Find the Function

If `gocardless-connect` doesn't appear in the Edge Functions list:

1. **Create a new function:**
   - Click **"Create Function"** or **"New Function"**
   - Name it: `gocardless-connect`
   - Paste the code from the file
   - Deploy

2. **Or verify it exists:**
   - Check if it's under a different name
   - Look in the function logs to see if requests are coming through

---

## If It Still Doesn't Work

1. **Check Function Logs:**
   - Edge Functions → `gocardless-connect` → "Logs" tab
   - Look for errors or see if OPTIONS requests are being received

2. **Verify Secrets:**
   - Project Settings → Edge Functions → Secrets
   - Ensure these are set:
     - `GOCARDLESS_CLIENT_ID`
     - `GOCARDLESS_CLIENT_SECRET`
     - `GOCARDLESS_ENVIRONMENT` (should be `sandbox`)

3. **Try a Different Browser:**
   - Sometimes browser cache can cause issues
   - Try in an incognito/private window

4. **Contact Support:**
   - If still not working after deployment, there may be a Supabase configuration issue
   - Check Supabase status page: https://status.supabase.com

