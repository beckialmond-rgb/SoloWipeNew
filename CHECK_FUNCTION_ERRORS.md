# Troubleshooting "Non 2xx Status" Error

## 🔍 What This Means

"Non 2xx status" means the edge function is **reachable and responding**, but it's returning an error status code (like 400, 401, 500, etc.).

## 🚨 Common Causes & Fixes

### 1. **GoCardless Not Connected** (Most Common)
**Error:** 400 - "GoCardless not connected"

**Fix:**
- Go to Settings → GoCardless section
- Click "Connect GoCardless"
- Complete the OAuth flow
- Try invite again

### 2. **GoCardless Token Expired**
**Error:** 401 - "Connection expired"

**Fix:**
- Go to Settings → GoCardless
- Click "Reconnect" or "Disconnect" then "Connect" again
- Complete OAuth flow
- Try invite again

### 3. **Missing Secrets in Supabase**
**Error:** 500 - Various internal errors

**Fix:**
- Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
- Click "Secrets" tab
- Ensure these secrets are set:
  - `SERVICE_ROLE_KEY`
  - `GOCARDLESS_CLIENT_ID`
  - `GOCARDLESS_CLIENT_SECRET`
  - `GOCARDLESS_ENVIRONMENT` (should be `sandbox` or `live`)

### 4. **Invalid Customer Data**
**Error:** 400 - "Invalid customer ID" or "Customer name is required"

**Fix:**
- Ensure customer has a valid ID (UUID format)
- Ensure customer has a name

---

## 📋 How to Find the Exact Error

### Method 1: Browser Console
1. Open your app
2. Open DevTools (F12) → Console tab
3. Try the invite again
4. Look for `[DD Invite]` logs
5. The error details will show the exact problem

### Method 2: Supabase Dashboard Logs
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click on `gocardless-create-mandate`
3. Click "Logs" tab
4. Look for recent errors
5. The logs will show the exact error message

### Method 3: Test Function Directly
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click on `gocardless-create-mandate`
3. Click "Invoke" button
4. Use this test payload:
   ```json
   {
     "customerId": "test-id",
     "customerName": "Test Customer",
     "exitUrl": "https://solowipe.co.uk/customers",
     "successUrl": "https://solowipe.co.uk/customers?mandate=success"
   }
   ```
5. Check the response for error details

---

## ✅ Quick Fixes

### If "GoCardless not connected":
1. Settings → GoCardless → Connect

### If "Connection expired":
1. Settings → GoCardless → Reconnect

### If function returns 500 error:
1. Check Supabase Dashboard → Edge Functions → Logs
2. Look for specific error message
3. Common issues:
   - Missing secrets (add them)
   - Invalid GoCardless credentials (update them)
   - Function code error (check logs)

---

## 🎯 Most Likely Issue

Based on "non 2xx status", the **most common cause** is:
- **GoCardless not connected** or **connection expired**

**Quick check:**
1. Go to Settings
2. Check if GoCardless shows as "Connected"
3. If not, connect it
4. If yes, try reconnecting

---

## 📞 Still Stuck?

1. **Check browser console** for `[DD Invite]` logs
2. **Check Supabase function logs** for the exact error
3. **Share the error message** from console/logs for help

