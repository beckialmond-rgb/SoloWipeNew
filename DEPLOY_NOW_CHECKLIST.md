# ⚠️ DEPLOY NOW: gocardless-callback Function

## Current Status
❌ **CORS ERROR STILL OCCURRING** - The function has NOT been redeployed yet.

The error message proves it:
```
Access to fetch... blocked by CORS policy: Response to preflight request doesn't pass access control check
```

## CRITICAL ACTION REQUIRED

You **MUST** deploy the `gocardless-callback` function to Supabase for the connection to work.

---

## Step-by-Step Deployment (5 minutes)

### ✅ Step 1: Verify You Have the File
- [ ] Open `GOCARDLESS_CALLBACK_FINAL_DEPLOY.txt`
- [ ] File should have 372 lines
- [ ] First line should be: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";`
- [ ] Last line should be: `});`

### ✅ Step 2: Copy ALL the Code
1. Open `GOCARDLESS_CALLBACK_FINAL_DEPLOY.txt` in a text editor
2. Press **Cmd+A** (Mac) or **Ctrl+A** (Windows) to select ALL
3. Press **Cmd+C** (Mac) or **Ctrl+C** (Windows) to copy
4. **DO NOT** modify anything - copy exactly as-is

### ✅ Step 3: Open Supabase Dashboard
1. Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/edge-functions
2. Login if needed
3. Find `gocardless-callback` in the list
4. Click on `gocardless-callback`

### ✅ Step 4: Replace the Code
1. Click on the **"Code"** tab (top of the page)
2. In the code editor, press **Cmd+A** (Mac) or **Ctrl+A** (Windows) to select ALL existing code
3. Press **Delete** or **Backspace** to delete it
4. Press **Cmd+V** (Mac) or **Ctrl+V** (Windows) to paste the new code
5. **VERIFY** the code looks correct:
   - Should start with `import { serve }`
   - Should have the CORS handler near the top (around line 58-65)
   - Should end with `});`

### ✅ Step 5: Deploy
1. Look for a **"Deploy"** button (usually green, bottom right or top right)
2. Click **"Deploy"**
3. Wait for deployment to complete (usually 10-30 seconds)
4. You should see a success message like "Function deployed successfully"

### ✅ Step 6: Verify Deployment
1. Click on the **"Logs"** tab (next to "Code" tab)
2. Try connecting GoCardless again from your app
3. In the logs, you should see:
   ```
   [CORS] OPTIONS preflight request received
   ```
   If you see this, the CORS fix is working!

---

## How to Verify the Fix is Working

### Before Deployment (Current State):
- ❌ CORS error in browser console
- ❌ No logs showing `[CORS] OPTIONS preflight request received`
- ❌ Connection fails immediately

### After Deployment (Expected):
- ✅ No CORS error in browser console
- ✅ Logs show `[CORS] OPTIONS preflight request received`
- ✅ Logs show `[GC-CALLBACK] Starting callback processing`
- ✅ Connection completes successfully

---

## If Deployment Fails

### Error: "Failed to bundle the function"
- Make sure you copied ALL the code (372 lines)
- Check for extra characters at the start or end
- Try copying again, being careful not to add any extra spaces

### Error: "Function not found"
- Make sure you're editing `gocardless-callback`, not `gocardless-connect`
- Check the function name in Supabase matches exactly

### No "Deploy" Button Visible
- The function might auto-save
- Try refreshing the page
- Look for "Save" or "Update" button instead

---

## Still Having Issues?

1. **Check Supabase Logs:**
   - Go to Edge Functions → `gocardless-callback` → Logs
   - Try connecting GoCardless
   - See if ANY logs appear (even errors prove the function is being called)

2. **Verify Function Status:**
   - In Edge Functions list, check if `gocardless-callback` shows as "Active"
   - If it shows an error, click on it to see details

3. **Clear Browser Cache:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or clear browser cache completely

---

## The Fix is in the Code

The code file `GOCARDLESS_CALLBACK_FINAL_DEPLOY.txt` contains the correct CORS handling:

```typescript
serve(async (req) => {
  // Handle CORS preflight requests - MUST be first
  if (req.method === 'OPTIONS') {
    console.log('[CORS] OPTIONS preflight request received');
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    });
  }
  // ... rest of code
});
```

**This MUST be deployed to Supabase for it to work.**

---

## Summary

1. ✅ Copy code from `GOCARDLESS_CALLBACK_FINAL_DEPLOY.txt`
2. ✅ Paste into Supabase Edge Function `gocardless-callback`
3. ✅ Click "Deploy"
4. ✅ Test connection - CORS error should be gone

**The code is ready. You just need to deploy it.**

