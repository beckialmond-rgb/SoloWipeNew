# ⚠️ URGENT: Check Edge Function Logs

## The Issue

You're being redirected to `https://solowipe.co.uk/gocardless-callback` but **WITHOUT any query parameters**.

This means we need to check what's actually being sent to GoCardless.

## 🔍 Check These Logs NOW

### Step 1: Check gocardless-connect Logs

1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click on **`gocardless-connect`**
3. Click on **"Logs"** tab
4. Look for the **most recent** invocation (from when you just clicked "Connect GoCardless")
5. Find these log entries:

```
Using dynamic redirect_uri: ...
State parameter contents: ...
Full OAuth URL: ...
```

**Please copy and share:**
- The exact `redirect_uri` value shown
- The `Full OAuth URL` (you can redact the client_id if sensitive)

### Step 2: Verify in GoCardless Dashboard

1. Go to GoCardless Dashboard (sandbox or live based on your environment)
2. Settings → API → Redirect URIs
3. **List all registered redirect URIs**
4. **Compare with the `redirect_uri` from Step 1**

### Step 3: Check for Exact Match

The redirect URI from logs MUST match EXACTLY what's registered:
- Same characters
- No trailing slash
- Correct protocol (https)
- Correct domain

---

**With this information, we can determine why GoCardless is redirecting without parameters.**





