# GoCardless Webhook 404 Fix

**Date:** 2025-12-26  
**Status:** ✅ RESOLVED

---

## Problem

The GoCardless webhook endpoint was returning HTTP 404, causing webhook health checks to fail.

**Symptoms:**
- OAuth working correctly (orgId + token exist)
- Redirect URI correct
- Webhook health check failing with HTTP 404
- Edge Function route not accessible

---

## Root Cause

The `gocardless-webhook` Edge Function existed in the codebase but **was not deployed** to Supabase.

**Evidence:**
- Function code existed at: `supabase/functions/gocardless-webhook/index.ts`
- Function was configured in: `supabase/config.toml` (with `verify_jwt = false`)
- Function was **missing** from deployed functions list

---

## Solution

### 1. Deployed the Webhook Function

```bash
npx supabase functions deploy gocardless-webhook
```

**Result:**
- ✅ Function deployed successfully
- ✅ Function now appears in deployed functions list as ACTIVE
- ✅ Function ID: `cfe841d9-7eda-42c8-af7a-53724c187c2c`

### 2. Webhook Endpoint Details

**Webhook URL:**
```
https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook
```

**Health Check Endpoint:**
- Method: `GET`
- Response: `200 OK` with JSON `{ status: 'ok', timestamp: ..., message: 'GoCardless webhook endpoint is reachable' }`
- Does NOT require authentication or webhook secret (safe for health checks)

**Webhook Endpoint (POST):**
- Method: `POST`
- Requires: `Webhook-Signature` header with valid HMAC-SHA256 signature
- Requires: `GOCARDLESS_WEBHOOK_SECRET` environment variable in Supabase
- Processes events: mandates, payments, billing_requests

---

## Function Configuration

**Location:** `supabase/functions/gocardless-webhook/index.ts`

**Key Features:**
1. **Health Check Support:** GET requests return 200 OK without authentication
2. **Signature Verification:** POST requests verify GoCardless webhook signatures
3. **Event Processing:** Handles mandate, payment, and billing_request events
4. **CORS Headers:** Allows cross-origin requests (needed for webhooks)

**Config:** `supabase/config.toml`
```toml
[functions.gocardless-webhook]
verify_jwt = false  # Correct - webhooks come from GoCardless, not authenticated users
```

---

## Required Environment Variables

The webhook function requires these Supabase secrets:

1. **Required for POST (webhook events):**
   - `GOCARDLESS_WEBHOOK_SECRET` - Webhook signing secret from GoCardless Dashboard
   - `SERVICE_ROLE_KEY` - Supabase service role key (for database updates)

2. **Auto-injected (no setup needed):**
   - `SUPABASE_URL` - Automatically available
   - `SUPABASE_ANON_KEY` - Automatically available

**Note:** Health checks (GET) work without `GOCARDLESS_WEBHOOK_SECRET`, but actual webhook events (POST) require it.

---

## Verification Steps

### 1. Verify Function is Deployed

```bash
npx supabase functions list | grep webhook
```

Expected output:
```
gocardless-webhook | ACTIVE | ...
```

### 2. Test Health Check

**In Browser:**
```
https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T09:37:58.000Z",
  "message": "GoCardless webhook endpoint is reachable"
}
```

**Via cURL:**
```bash
curl https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook
```

### 3. Check in GoCardless Dashboard

1. Go to: https://manage.gocardless.com/webhooks (or sandbox equivalent)
2. Verify webhook endpoint URL is:
   ```
   https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook
   ```
3. Verify webhook secret matches `GOCARDLESS_WEBHOOK_SECRET` in Supabase

### 4. Test from App

In the app's GoCardless settings page:
1. Click "Check Webhook Health" button
2. Should see: "Connection healthy - Webhook endpoint is reachable"
3. Status should show: ✅ OK

---

## Code References

**Webhook Handler:**
- `supabase/functions/gocardless-webhook/index.ts`

**Health Check Implementation:**
- Lines 52-62: GET endpoint returns 200 OK
- Lines 44-149: Main handler with signature verification

**Client-Side Health Check:**
- `src/components/GoCardlessSection.tsx` (lines 186-240)
- Constructs URL: `${supabaseUrl}/functions/v1/gocardless-webhook`
- Uses `import.meta.env.VITE_SUPABASE_URL`

---

## Next Steps

1. ✅ **COMPLETED:** Deploy webhook function
2. ⚠️ **REQUIRED:** Ensure `GOCARDLESS_WEBHOOK_SECRET` is set in Supabase secrets (for POST requests)
3. ✅ **VERIFY:** Test health check endpoint returns 200 OK
4. ✅ **VERIFY:** Confirm webhook URL in GoCardless Dashboard matches deployed URL

---

## Summary

The webhook 404 error was caused by the function not being deployed. After deployment, the endpoint is now accessible at:

```
https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook
```

Health checks (GET) work immediately. Webhook events (POST) require `GOCARDLESS_WEBHOOK_SECRET` to be configured in Supabase secrets.

