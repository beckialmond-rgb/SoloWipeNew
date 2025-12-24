# GoCardless CORS Error - Fix Applied

## Issue
CORS preflight error: "Response to preflight request doesn't pass access control check: It does not have HTTP ok status"

## Fixes Applied

### 1. Updated OPTIONS Handler (gocardless-connect/index.ts)
- Changed OPTIONS response to explicitly return status `204` (No Content)
- Added `Access-Control-Allow-Methods` header to CORS headers

### 2. Updated Redirect URL Logic (GoCardlessSection.tsx)
- Changed from hardcoded `localhost:3000` to use `window.location.origin`
- This allows it to work on any port (8080, 3000, etc.) during development

## Next Steps - Deploy the Edge Function

**The edge function code has been updated but needs to be redeployed:**

### Option 1: Deploy via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Find `gocardless-connect` function
3. Click **"Deploy"** or **"Redeploy"**
4. Upload the updated `supabase/functions/gocardless-connect/index.ts` file

### Option 2: Deploy via CLI (if you have Supabase CLI installed)

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main
supabase functions deploy gocardless-connect
```

### Option 3: Copy/Paste via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions** → **gocardless-connect**
2. Click **"Edit"** or **"View Code"**
3. Copy the updated code from `supabase/functions/gocardless-connect/index.ts`
4. Paste and save

## Changes Made

### File: `supabase/functions/gocardless-connect/index.ts`

**Before:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
```

**After:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }
```

### File: `src/components/GoCardlessSection.tsx`

**Before:**
```typescript
const redirectUrl = isProduction 
  ? 'https://solowipe.co.uk/settings?gocardless=callback'
  : 'http://localhost:3000/settings?gocardless=callback';
```

**After:**
```typescript
const redirectUrl = isProduction 
  ? 'https://solowipe.co.uk/settings?gocardless=callback'
  : `${window.location.origin}/settings?gocardless=callback`;
```

## Testing After Deploy

1. **Verify function is deployed:**
   - Go to Supabase Dashboard → Edge Functions → gocardless-connect
   - Check that it shows the latest deployment

2. **Test the connection:**
   - Refresh your app
   - Try connecting GoCardless again
   - Check browser console for errors
   - The CORS error should be resolved

3. **Verify redirect URL:**
   - The redirect URL should now use your current port (8080)
   - Check the debug logs to confirm the redirect URL is correct

## If Still Having Issues

1. **Check function logs:**
   - Supabase Dashboard → Edge Functions → gocardless-connect → Logs
   - Look for any errors during the OPTIONS request

2. **Verify secrets are set:**
   - Make sure `GOCARDLESS_CLIENT_ID` is set
   - Make sure `GOCARDLESS_CLIENT_SECRET` is set
   - Make sure `GOCARDLESS_ENVIRONMENT` is set

3. **Clear browser cache:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Or clear browser cache completely

