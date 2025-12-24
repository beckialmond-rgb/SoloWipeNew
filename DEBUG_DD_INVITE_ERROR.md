# Debugging "Non 2xx Status" Error for Direct Debit Invite

**Error:** "Non 2xx status" when trying to send Direct Debit invite from customer page

---

## 🔍 How to Find the Exact Error

### Method 1: Browser Console (Easiest)

1. **Open your app**
2. **Open DevTools:**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Go to **Console** tab
3. **Try the invite again:**
   - Go to Customers page
   - Open a customer
   - Click "Send Direct Debit Invite"
4. **Look for logs:**
   - Search for `[DD Invite]` in the console
   - Look for:
     - `[DD Invite] Function response:` - Shows what the function returned
     - `[DD Invite] ✓ Found error in...` - Shows where the error was found
     - `[DD Invite] Final extracted error message:` - Shows the actual error
     - `[DD Invite] Full error details:` - Shows complete error information

### Method 2: Supabase Function Logs

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. **Click on `gocardless-create-mandate`**
3. **Click "Logs" tab**
4. **Try the invite again** (to generate fresh logs)
5. **Look for:**
   - `[GC-MANDATE]` logs
   - Error messages
   - Status codes (400, 401, 500, etc.)

---

## 🚨 Common Errors & Fixes

### Error: "GoCardless not connected"
**Status:** 400  
**Cause:** No GoCardless access token in database

**Fix:**
1. Go to Settings → GoCardless
2. Click "Connect GoCardless"
3. Complete OAuth flow
4. Try invite again

---

### Error: "GoCardless connection expired" or "Token expired"
**Status:** 401  
**Cause:** Access token is invalid/expired

**Fix:**
1. Go to Settings → GoCardless
2. Click "Reconnect" (or "Disconnect" then "Connect")
3. Complete OAuth flow
4. Try invite again

**Note:** The Settings page should automatically show "Expired" status if this is the issue.

---

### Error: "Invalid customer ID format"
**Status:** 400  
**Cause:** Customer ID is not a valid UUID

**Fix:**
- This shouldn't happen normally
- Check if customer was created properly
- Try selecting a different customer

---

### Error: "Customer name is required"
**Status:** 400  
**Cause:** Customer has no name

**Fix:**
- Edit the customer and add a name
- Try invite again

---

### Error: "Invalid exit URL" or "Invalid success URL"
**Status:** 400  
**Cause:** Redirect URLs are malformed

**Fix:**
- This is usually a code issue
- Check browser console for the exact URLs being sent
- Contact support if this persists

---

### Error: "Failed to create billing request"
**Status:** 400/500  
**Cause:** GoCardless API error

**Possible reasons:**
- GoCardless account restrictions
- Invalid GoCardless credentials
- GoCardless API issue
- Account not fully set up in GoCardless

**Fix:**
1. Check Supabase function logs for GoCardless error details
2. Verify GoCardless account is active
3. Check GoCardless Dashboard for any restrictions
4. Try again later (could be temporary API issue)

---

### Error: "Failed to create mandate setup flow"
**Status:** 400/500  
**Cause:** GoCardless API error when creating flow

**Fix:**
1. Check Supabase function logs for specific GoCardless error
2. Verify redirect URLs are valid
3. Check GoCardless Dashboard for account status

---

## 📋 Quick Diagnostic Checklist

When you see "Non 2xx status":

1. **Check Browser Console:**
   - [ ] Look for `[DD Invite]` logs
   - [ ] Find the actual error message
   - [ ] Note the status code (400, 401, 500, etc.)

2. **Check GoCardless Connection:**
   - [ ] Go to Settings → GoCardless
   - [ ] Is it showing "Connected" or "Expired"?
   - [ ] If "Expired", reconnect first

3. **Check Customer Data:**
   - [ ] Does customer have a name?
   - [ ] Does customer have a phone number?
   - [ ] Is customer ID valid?

4. **Check Supabase Logs:**
   - [ ] Go to Supabase Dashboard → Functions → `gocardless-create-mandate` → Logs
   - [ ] Look for recent errors
   - [ ] Check for GoCardless API errors

---

## 🔧 Advanced Debugging

### Check Function Response Structure

In browser console, after trying the invite, look for:

```javascript
[DD Invite] Function response: {
  hasData: true/false,
  hasError: true/false,
  dataContent: "...",
  errorContent: "..."
}
```

This shows exactly what the function returned.

### Check Error Extraction

Look for logs like:
- `[DD Invite] ✓ Found error in data.error: ...`
- `[DD Invite] ✓ Found error in context.body.error: ...`
- `[DD Invite] Final extracted error message: ...`

This shows where the error was found and what message was extracted.

### Check Full Error Details

At the end, you'll see:
```javascript
[DD Invite] Full error details: {
  error: ...,
  data: ...,
  extractedMessage: ...,
  serverError: ...,
  errorMessage: ...
}
```

This contains all the error information for debugging.

---

## ✅ After Finding the Error

Once you identify the exact error:

1. **If it's a connection issue:**
   - Reconnect GoCardless in Settings
   - Try again

2. **If it's a GoCardless API error:**
   - Check GoCardless Dashboard
   - Verify account status
   - Check for any restrictions

3. **If it's a data validation error:**
   - Fix the customer data
   - Try again

4. **If it's still unclear:**
   - Copy the full error from console
   - Check Supabase function logs
   - Contact support with the error details

---

## 📝 Error Message Examples

**Good error messages (specific):**
- ✅ "GoCardless connection expired. Please reconnect in Settings."
- ✅ "GoCardless not connected"
- ✅ "Customer name is required"
- ✅ "GoCardless error: Invalid creditor"

**Bad error messages (generic):**
- ❌ "Non 2xx status"
- ❌ "Unknown error"
- ❌ "Failed to create invite"

If you see a generic error, check the browser console for the actual error message.

---

**Need More Help?** Check the browser console logs starting with `[DD Invite]` - they contain detailed information about what went wrong.

