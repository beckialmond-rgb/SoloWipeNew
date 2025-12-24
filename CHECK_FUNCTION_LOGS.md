# Debug Steps for GoCardless CORS Error

## Critical: Check Function Logs

The CORS error persists, which suggests either:
1. The function isn't deploying correctly
2. The function is erroring before reaching the OPTIONS handler
3. There's a runtime error

## Step 1: Check Supabase Function Logs

1. Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/edge-functions
2. Click on `gocardless-connect`
3. Go to the **"Logs"** tab
4. Try connecting GoCardless again from your app
5. **Look for:**
   - Any error messages
   - Whether you see "OPTIONS preflight request received" (if we added that log)
   - Any stack traces or runtime errors

## Step 2: Test the Function Directly

Open a terminal and run this curl command to test the OPTIONS request:

```bash
curl -X OPTIONS \
  https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-connect \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  -v
```

**What to look for:**
- HTTP status code (should be 200)
- CORS headers in the response
- Any error messages

## Step 3: Verify Function Deployment

1. In Supabase Dashboard → Edge Functions → `gocardless-connect`
2. Click on **"Code"** tab
3. **Verify the code matches** what's in `GOCARDLESS_FUNCTION_CODE_FINAL.txt`
4. Specifically check lines 54-57 should be:
   ```typescript
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
   ```

## Step 4: Check for Syntax Errors

If there are syntax errors, the function won't deploy correctly. Check:
- All brackets are closed
- No typos in function names
- All imports are correct

## Step 5: Alternative - Check if Function Exists

The error might indicate the function doesn't exist. Verify:
- Function name is exactly `gocardless-connect` (no typos)
- The function shows as "Active" or "Deployed" in the dashboard
- The function URL matches: `https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-connect`

## What to Share

If it still doesn't work after checking logs, please share:
1. What you see in the Supabase function logs when you try to connect
2. The output of the curl command above
3. A screenshot of the function code in Supabase (lines 53-60)

