# How to Redeploy the Edge Function (Fixes CORS Error)

The CORS error you're seeing means the Edge Function needs to be redeployed with the fix.

## Option 1: Using Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Click "Edge Functions" in the left sidebar**

3. **Find `gocardless-callback` in the list**

4. **Click the three dots (...) next to the function name**

5. **Click "Redeploy"**

6. **Wait for it to finish** (you'll see a success message)

---

## Option 2: Using Supabase CLI (If you have it set up)

```bash
# Make sure you're in the project directory
cd /path/to/solowipe-main

# Redeploy just the callback function
supabase functions deploy gocardless-callback

# OR redeploy all functions
supabase functions deploy
```

---

## How to Verify It's Deployed

1. After redeploying, wait 30-60 seconds
2. Go back to your app
3. Try connecting GoCardless again
4. The CORS error should be gone

---

## Still Getting CORS Error?

- Wait 1-2 minutes after redeploying (propagation delay)
- Clear your browser cache (Cmd+Shift+R or Ctrl+Shift+R)
- Try in an incognito/private window
- Check the function logs in Supabase Dashboard to see if it's actually running

