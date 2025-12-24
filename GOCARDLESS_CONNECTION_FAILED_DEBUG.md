# GoCardless Connection Failed - Debugging Guide

## Enhanced Error Handling Applied

I've added comprehensive error logging and more specific error messages to help diagnose the "CONNECTION FAILED" issue.

## What Was Changed

### `src/components/GoCardlessSection.tsx`

1. **Enhanced Error Extraction:**
   - Extracts error message, stack trace, and context
   - Logs full error object with all properties
   - Checks for Supabase function error details

2. **Specific Error Messages:**
   - **CORS/Network errors:** "Network error: Unable to reach GoCardless service..."
   - **Configuration errors:** "GoCardless is not properly configured..."
   - **Redirect URL errors:** Shows the specific redirect URL error
   - **Generic errors:** Shows error details if available

3. **Pre-response Validation:**
   - Checks if function returned data
   - Validates that `data.url` exists
   - Provides specific error messages for each failure case

4. **Comprehensive Logging:**
   - Logs before invoking function
   - Logs after receiving response
   - Logs error details with full context
   - All logs prefixed with `[GC-CLIENT]` for easy filtering

## How to Debug

### Step 1: Check Browser Console

Open your browser's Developer Tools (F12) and look for:

1. **`[GC-CLIENT]` logs** - These show the connection flow
2. **Error messages** - Look for specific error types
3. **Network tab** - Check if the Edge Function request is being made

### Step 2: Check for Specific Error Types

#### CORS Error
**Symptoms:**
- Console shows "CORS policy" error
- Network tab shows OPTIONS request failed

**Solution:**
- Verify Edge Functions are deployed with latest CORS fixes
- Check Supabase Edge Function logs

#### Function Not Found
**Symptoms:**
- Error: "Function not found" or 404
- No logs in Supabase Edge Function logs

**Solution:**
- Verify `gocardless-connect` function exists in Supabase
- Check function name spelling
- Redeploy the function if needed

#### Configuration Error
**Symptoms:**
- Error: "GoCardless not configured"
- Error: "Missing redirect URL"

**Solution:**
- Check Supabase Edge Function secrets:
  - `GOCARDLESS_CLIENT_ID`
  - `GOCARDLESS_CLIENT_SECRET`
  - `GOCARDLESS_ENVIRONMENT`
  - `SERVICE_ROLE_KEY`

#### Redirect URL Error
**Symptoms:**
- Error: "Invalid redirect URL"
- Error mentions redirect_uri mismatch

**Solution:**
- Verify redirect URL in GoCardless Dashboard matches exactly
- Check for trailing slashes, http vs https, port numbers

### Step 3: Check Supabase Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → `gocardless-connect`
3. Click on "Logs" tab
4. Look for:
   - `[GC-CONNECT]` logs
   - Error messages
   - Request received logs

### Step 4: Verify Function Deployment

1. Go to Supabase Dashboard → Edge Functions
2. Find `gocardless-connect`
3. Verify it shows as "Active" or "Deployed"
4. If not, redeploy using the code from `GOCARDLESS_CONNECT_WITH_DIAGNOSTICS.txt`

## Common Issues and Solutions

### Issue: "Failed to send a request to the Edge Function"
**Cause:** CORS preflight failing or function not deployed
**Solution:**
- Check CORS headers in Edge Function
- Verify function is deployed
- Check network tab for OPTIONS request

### Issue: "GoCardless not configured"
**Cause:** Missing secrets in Supabase
**Solution:**
- Add all required secrets in Supabase Dashboard
- Verify secret names match exactly (case-sensitive)

### Issue: "Invalid redirect URL"
**Cause:** Redirect URL doesn't match GoCardless Dashboard
**Solution:**
- Check console logs for the exact redirect URL being sent
- Compare with GoCardless Dashboard → Settings → API → Redirect URIs
- Ensure exact match (no trailing slash, correct protocol, correct port)

### Issue: "No response data"
**Cause:** Function returned but without expected data structure
**Solution:**
- Check Supabase Edge Function logs
- Verify function code is correct
- Check for errors in function execution

## Next Steps

1. **Try connecting again** and watch the browser console
2. **Copy all `[GC-CLIENT]` logs** from the console
3. **Check Supabase Edge Function logs** for `[GC-CONNECT]` messages
4. **Share the error details** - the enhanced logging will show exactly what's failing

The enhanced error handling will now provide much more specific information about what's causing the connection to fail.

