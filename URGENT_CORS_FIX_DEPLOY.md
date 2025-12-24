# ⚠️ URGENT: CORS Fix for gocardless-callback

## The Problem

The callback is working correctly (receiving the authorization code from GoCardless), but the CORS preflight request is **failing** because the deployed `gocardless-callback` function doesn't have the correct CORS handling.

**Error:**
```
Access to fetch at 'https://...supabase.co/functions/v1/gocardless-callback' from origin 'http://localhost:8080' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
```

## The Solution

**You MUST redeploy the `gocardless-callback` function** with the corrected CORS handling.

## Step-by-Step Deployment Instructions

### Step 1: Open the Clean Code File

Open this file in your editor:
```
GOCARDLESS_CALLBACK_FINAL_DEPLOY.txt
```

### Step 2: Copy ALL the Code

1. Select ALL the code in the file (Cmd+A or Ctrl+A)
2. Copy it (Cmd+C or Ctrl+C)
3. **DO NOT modify anything** - copy it exactly as-is

### Step 3: Go to Supabase Dashboard

1. Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/edge-functions
2. Find `gocardless-callback` in the list
3. Click on it

### Step 4: Replace the Code

1. Click on the **"Code"** tab (if not already selected)
2. Select ALL existing code in the editor (Cmd+A or Ctrl+A)
3. Delete it (Backspace or Delete)
4. Paste the new code (Cmd+V or Ctrl+V)
5. **VERIFY** the code looks correct (should start with `import { serve }` and end with `});`)

### Step 5: Deploy

1. Click the **"Deploy"** button (usually green, in the bottom right)
2. Wait for the deployment to complete
3. You should see a success message

### Step 6: Verify Deployment

1. Go to the **"Logs"** tab
2. Try connecting GoCardless again
3. You should see logs like:
   ```
   [CORS] OPTIONS preflight request received
   [GC-CALLBACK] Starting callback processing
   ```

## Critical CORS Fix

The function MUST handle OPTIONS requests FIRST, before any other code:

```typescript
serve(async (req) => {
  console.log(`[${new Date().toISOString()}] Callback request received: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests - MUST be first, before ANY other code
  if (req.method === 'OPTIONS') {
    console.log('[CORS] OPTIONS preflight request received');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }
  
  // ... rest of the code
});
```

## After Deployment

1. **Clear your browser cache** (or hard refresh: Cmd+Shift+R)
2. **Try connecting GoCardless again**
3. The CORS error should be gone
4. The callback should complete successfully

## If It Still Fails

1. Check Supabase Edge Function logs for `[CORS]` messages
2. Verify the function status shows as "Active" or "Deployed"
3. Check that you copied the code correctly (no extra characters)
4. Try deploying again if the first attempt failed

---

**This fix MUST be deployed for the callback to work. The local code is correct, but Supabase needs the updated version.**

