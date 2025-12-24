# Debugging "Non 2xx Status" Error

## 🚨 Issue: Non 2xx status even though GoCardless is connected

## ✅ What I've Fixed

1. **Better error extraction** - Now properly extracts error messages from response body
2. **GoCardless error parsing** - Shows actual GoCardless API error messages
3. **Enhanced logging** - Logs detailed response information

## 🔍 How to Find the Exact Error

### Step 1: Redeploy the Function
The function code has been updated but needs redeployment:

```bash
npx supabase functions deploy gocardless-create-mandate --project-ref owqjyaiptexqwafzmcwy
```

### Step 2: Check Browser Console
1. Open your app
2. Open DevTools (F12) → Console
3. Try the invite again
4. Look for logs starting with `[DD Invite]`
5. The logs will show:
   - Function response details
   - Extracted error message
   - Full error context

### Step 3: Check Supabase Function Logs
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click on `gocardless-create-mandate`
3. Click "Logs" tab
4. Look for recent logs when you tried to invite
5. Look for errors starting with `[GC-MANDATE]`

## 🎯 Common Errors & Fixes

### Error: "GoCardless connection expired"
**Cause:** Access token is invalid/expired  
**Fix:** 
- Settings → GoCardless → Reconnect
- Complete OAuth flow again

### Error: "Failed to create billing request"
**Possible causes:**
- Invalid GoCardless credentials
- GoCardless API issue
- Account restrictions

**Fix:**
- Check Supabase function logs for GoCardless error details
- Verify GoCardless account is active
- Check GoCardless Dashboard for any restrictions

### Error: "Failed to create mandate setup flow"
**Possible causes:**
- Invalid redirect URLs
- GoCardless API error

**Fix:**
- Check function logs for specific GoCardless error
- Verify redirect URLs are valid

## 📋 After Redeploying

Once you redeploy, try the invite again and:

1. **Check browser console** - Look for `[DD Invite]` logs showing the actual error
2. **Check function logs** - Look for `[GC-MANDATE]` errors showing what GoCardless returned
3. **Share the error message** - The improved logging will show the exact problem

The error message should now be much more specific and tell you exactly what's wrong!

