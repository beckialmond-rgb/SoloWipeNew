# GoCardless Dashboard Configuration Review

**Review Date:** 2025-01-26  
**Status:** ✅ Mostly Correct (with recommendations)

---

## Current Configuration Analysis

### ✅ Redirect URIs (4/20 configured)

Your current redirect URIs:

1. ✅ **`https://solowipe.co.uk/gocardless-callback`** 
   - **Status:** ✅ CORRECT - This is the current production redirect URI
   - **Used by:** Production code
   - **Action:** Keep this one

2. ⚠️ **`https://solowipe.co.uk/settings?gocardless=callback`**
   - **Status:** ⚠️ OLD FORMAT - No longer used by code
   - **Used by:** Legacy code (removed)
   - **Action:** Can be removed (harmless to keep, but not needed)

3. ✅ **`http://localhost:8080/gocardless-callback`**
   - **Status:** ✅ CORRECT - For local development on port 8080
   - **Used by:** Development/testing
   - **Action:** Keep if you use port 8080

4. ✅ **`http://localhost:8081/gocardless-callback`**
   - **Status:** ✅ CORRECT - For local development on port 8081
   - **Used by:** Development/testing (mobile device testing)
   - **Action:** Keep if you use port 8081

**Recommendation:**
- ✅ Keep all 4 URIs (they're all valid)
- ⚠️ The old `/settings?gocardless=callback` URI is no longer used but won't cause issues
- You can optionally remove the old one to clean up, but it's not necessary

---

### ⚠️ Webhook URL

**Current (from image):**
```
https://eovoluizcnikfkyyctwq.supabase.co/functions/v1/gocardless-w
```

**Expected (should be):**
```
https://eovoluizcnikfkyyctwq.supabase.co/functions/v1/gocardless-webhook
```

**Status:** ⚠️ **URL appears truncated** in the image

**Action Required:**
1. Verify the full webhook URL is: `https://eovoluizcnikfkyyctwq.supabase.co/functions/v1/gocardless-webhook`
2. If it's truncated, update it to the full path
3. The function name must be exactly `gocardless-webhook` (not `gocardless-w`)

**To Verify:**
- Go to GoCardless Dashboard → Webhooks
- Check the full URL in the webhook configuration
- Ensure it ends with `/gocardless-webhook` (not truncated)

---

### ℹ️ Post Onboarding URL

**Current:**
```
https://example.com/gocardless/onboarding_complete
```

**Status:** ℹ️ **Example URL** - This is optional

**Action:**
- This field is optional in GoCardless
- You can leave it as-is (it won't be used)
- Or update it to your actual post-onboarding URL if you have one
- Or remove it if not needed

**If you want to set a real URL:**
- Could be: `https://solowipe.co.uk/settings` (redirects users after onboarding)
- Or: `https://solowipe.co.uk/dashboard` (if you have a dashboard)
- This is optional - your app doesn't currently use this

---

## Configuration Checklist

### ✅ Redirect URIs
- [x] Production URI registered: `https://solowipe.co.uk/gocardless-callback`
- [x] Development URIs registered: `localhost:8080` and `localhost:8081`
- [x] All URIs have no trailing slashes
- [x] All URIs use correct protocol (https for production, http for localhost)

### ⚠️ Webhook URL
- [ ] Verify full URL is: `https://eovoluizcnikfkyyctwq.supabase.co/functions/v1/gocardless-webhook`
- [ ] Check webhook is receiving events (test in GoCardless Dashboard)
- [ ] Verify webhook secret matches `GOCARDLESS_WEBHOOK_SECRET` in Supabase

### ℹ️ Post Onboarding URL
- [ ] Leave as-is (optional) OR
- [ ] Update to real URL if needed OR
- [ ] Remove if not needed

---

## Verification Steps

### 1. Verify Webhook URL

1. Go to GoCardless Dashboard → Webhooks
2. Click on your webhook to view details
3. Verify the full URL is: `https://eovoluizcnikfkyyctwq.supabase.co/functions/v1/gocardless-webhook`
4. If it's truncated or incorrect, update it

### 2. Test Webhook

1. In GoCardless Dashboard → Webhooks
2. Look for a "Test webhook" or "Send test event" button
3. Send a test event
4. Check Supabase Edge Function logs for `gocardless-webhook`
5. Verify the event is received and processed

### 3. Test Redirect URI

1. Go to your app: https://solowipe.co.uk/settings
2. Click "Connect GoCardless"
3. Verify you're redirected to GoCardless OAuth page
4. Complete authorization
5. Verify you're redirected back to: `https://solowipe.co.uk/gocardless-callback`
6. Connection should succeed

---

## Code vs Dashboard Alignment

### ✅ What Matches

| Code Expects | Dashboard Has | Status |
|-------------|---------------|--------|
| `https://solowipe.co.uk/gocardless-callback` | ✅ Registered | ✅ Match |
| `http://localhost:8080/gocardless-callback` | ✅ Registered | ✅ Match |
| `http://localhost:8081/gocardless-callback` | ✅ Registered | ✅ Match |

### ⚠️ What's Different

| Code Expects | Dashboard Has | Status |
|-------------|---------------|--------|
| N/A (old format removed) | `https://solowipe.co.uk/settings?gocardless=callback` | ⚠️ Old format (harmless) |

**Note:** The old redirect URI won't cause issues since the code no longer uses it. You can remove it for cleanliness, but it's not required.

---

## Recommendations

### ✅ Keep As-Is
- All 4 redirect URIs (they're all valid)
- Current redirect URI configuration is correct

### ⚠️ Verify/Update
1. **Webhook URL:** Ensure it's the full path ending in `/gocardless-webhook`
2. **Webhook Events:** Verify these events are selected:
   - `mandates.*` (all mandate events)
   - `payments.*` (all payment events)
   - `subscriptions.*` (if using subscriptions)
   - `payouts.*` (if using payouts)

### ℹ️ Optional
- Remove old redirect URI: `https://solowipe.co.uk/settings?gocardless=callback` (not needed)
- Update Post Onboarding URL if you want to redirect users after onboarding

---

## Summary

**Overall Status:** ✅ **Configuration is correct**

**Action Items:**
1. ⚠️ Verify webhook URL is complete (not truncated)
2. ✅ Redirect URIs are all correct
3. ℹ️ Post Onboarding URL is optional (can leave as-is)

**No critical issues found.** Your configuration matches what the code expects. Just verify the webhook URL is the complete path.

---

**Next Steps:**
1. Verify webhook URL in GoCardless Dashboard
2. Test webhook with a test event
3. Test connection flow end-to-end
4. (Optional) Remove old redirect URI for cleanliness

