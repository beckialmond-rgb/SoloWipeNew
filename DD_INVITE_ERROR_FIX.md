# Direct Debit Invite Error Fix

## ✅ Fixes Applied

### 1. **Enhanced Error Handling** (`CustomerDetailModal.tsx`)
- Added detailed logging for debugging
- Specific error messages for different failure types:
  - Network/connection errors
  - Function not found (404)
  - Authentication errors (401)
  - GoCardless connection expired
  - Generic errors with user-friendly messages

### 2. **CORS Preflight Fix** (`gocardless-create-mandate/index.ts`)
- Added proper OPTIONS handler with status 200
- Added `Access-Control-Max-Age` header for caching
- Ensures preflight requests are handled correctly

### 3. **Better Error Messages**
- Network errors: "Unable to connect to server. Please check your internet connection."
- Function not found: "Service temporarily unavailable. Please try again later."
- Auth errors: "Please log in again and try."
- GoCardless not connected: "GoCardless is not connected. Please connect in Settings."

---

## 🔍 Troubleshooting Steps

### If you still see "Failed to send request to the edge function":

1. **Check if function is deployed:**
   ```bash
   cd /Users/rebeccaalmond/Downloads/solowipe-main
   npx supabase functions list
   ```
   Look for `gocardless-create-mandate` in the list.

2. **Redeploy the function:**
   ```bash
   npx supabase functions deploy gocardless-create-mandate
   ```

3. **Check browser console:**
   - Open DevTools (F12)
   - Look for detailed error logs starting with `[DD Invite]`
   - Check Network tab for the actual HTTP error

4. **Verify GoCardless connection:**
   - Go to Settings
   - Check if GoCardless is connected
   - If not, reconnect it

5. **Check network connectivity:**
   - Ensure you have internet connection
   - Try refreshing the page
   - Check if other Supabase functions work

---

## 📋 Common Error Scenarios

### Error: "Failed to send request"
**Cause:** Network issue or function not deployed
**Fix:** 
- Check internet connection
- Redeploy function: `npx supabase functions deploy gocardless-create-mandate`

### Error: "Function not available" / 404
**Cause:** Function not deployed or wrong name
**Fix:** Deploy the function

### Error: "GoCardless not connected"
**Cause:** GoCardless account not connected
**Fix:** Go to Settings → Connect GoCardless

### Error: "Connection expired"
**Cause:** GoCardless token expired
**Fix:** Reconnect GoCardless in Settings

### Error: "Unauthorized" / 401
**Cause:** User not logged in or session expired
**Fix:** Log out and log back in

---

## 🚀 Next Steps

1. **Redeploy the function** (if not already deployed):
   ```bash
   npx supabase functions deploy gocardless-create-mandate
   ```

2. **Test the invite flow:**
   - Open a customer detail modal
   - Click "Invite to Direct Debit"
   - Check browser console for detailed logs
   - Verify SMS opens with link

3. **If errors persist:**
   - Check browser console for `[DD Invite]` logs
   - Share the error details for further debugging

---

## 📝 Error Logging

The code now logs detailed information:
- Request parameters
- Error types and messages
- Network status
- Function response

All logs are prefixed with `[DD Invite]` for easy filtering in console.

