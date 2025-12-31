# 🔥 Quick Smoke Test - Ready-to-Run Command

## ⚠️ IMPORTANT: Function Not Deployed

The `send-email` function is **not currently deployed**. Deploy it first:

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main
npx supabase functions deploy send-email
```

---

## 📋 Exact cURL Command (Ready to Run)

**From your `.env` file, I found:**
- Key: `VITE_SUPABASE_PUBLISHABLE_KEY` (sb_publishable_...)

**Ready-to-run command:**

```bash
curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF" \
  -d '{"to": "hola@tipsenor.com", "subject": "Cursor Smoke Test", "html": "<strong>It works!</strong>"}'
```

**Or use the automated script:**

```bash
./SMOKE_TEST_COMMAND.sh
```

---

## 🔧 Alternative: Use Service Role Key (Recommended)

For Edge Functions, the **service_role** key is typically more appropriate:

1. **Get Service Role Key:**
   - Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/settings/api
   - Copy the `service_role` key (starts with `eyJ...`)

2. **Use in command:**
```bash
curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE" \
  -d '{"to": "hola@tipsenor.com", "subject": "Cursor Smoke Test", "html": "<strong>It works!</strong>"}'
```

---

## ✅ Expected Responses

### Success (200 OK):
```json
{
  "success": true,
  "messageId": "re_xxxxxxxxxxxxx"
}
```

### Function Not Deployed (404):
```json
{
  "code": "NOT_FOUND",
  "message": "Requested function was not found"
}
```
**Fix:** Deploy the function first

### Missing Authorization (401):
```json
{
  "error": "Authorization header required"
}
```
**Fix:** Check Authorization header is included

### Missing RESEND_API_KEY (500):
```json
{
  "error": "RESEND_API_KEY environment variable is not set"
}
```
**Fix:** Set the secret: `npx supabase secrets set RESEND_API_KEY=your_key`

---

## 🚀 Complete Setup & Test Workflow

```bash
# Step 1: Deploy the function
npx supabase functions deploy send-email

# Step 2: Set Resend API key (if not already set)
npx supabase secrets set RESEND_API_KEY=your_resend_api_key

# Step 3: Run smoke test
./SMOKE_TEST_COMMAND.sh

# Or manually:
curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF" \
  -d '{"to": "hola@tipsenor.com", "subject": "Cursor Smoke Test", "html": "<strong>It works!</strong>"}'
```

---

**Status:** ⚠️ Function needs deployment before testing

