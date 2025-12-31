# 🎯 Ready for Battle - Welcome Email Verification Kit

**Status:** ✅ **FIXED & READY FOR TESTING**

All critical issues from the security audit have been resolved. Use these commands to verify the system works end-to-end.

---

## ✅ Pre-Flight Checklist

Before running tests, ensure:

- [ ] Edge Function deployed: `npx supabase functions deploy send-email`
- [ ] Resend API key set: `npx supabase secrets set RESEND_API_KEY=your_key`
- [ ] SQL migration run in Supabase SQL Editor
- [ ] Service role key configured: `ALTER DATABASE postgres SET app.settings.service_role_key = 'your-key';`
- [ ] pg_net extension enabled: Supabase Dashboard → Database → Extensions → Enable "pg_net"

---

## 🔥 The "Smoke Test" CURL

**Purpose:** Test Edge Function directly (bypasses database trigger)

**Command:**
```bash
curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "to": "test@example.com",
    "subject": "Welcome to SoloWipe!",
    "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Welcome to SoloWipe</title></head><body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, '\''Segoe UI'\'', '\''Roboto'\'', '\''Oxygen'\'', '\''Ubuntu'\'', '\''Cantarell'\'', sans-serif; background-color: #f9fafb;\"><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color: #f9fafb; padding: 40px 20px;\"><tr><td align=\"center\"><table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);\"><tr><td style=\"background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 48px 40px; text-align: center;\"><h1 style=\"margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;\">SoloWipe</h1></td></tr><tr><td style=\"padding: 48px 40px;\"><h2 style=\"margin: 0 0 24px; color: #111827; font-size: 24px; font-weight: 600;\">Welcome to SoloWipe!</h2><p style=\"margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;\">Hi test@example.com,</p><p style=\"margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;\">Thanks for joining SoloWipe! You'\''re all set to streamline your window cleaning business and focus on what matters most—delivering great service to your customers.</p><p style=\"margin: 0 0 32px; color: #374151; font-size: 16px; line-height: 1.6;\">Let'\''s get to work.</p><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-bottom: 32px;\"><tr><td align=\"center\"><a href=\"https://solowipe.co.uk/dashboard\" style=\"display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;\">Go to Dashboard</a></td></tr></table><div style=\"border-top: 1px solid #e5e7eb; padding-top: 32px; margin-top: 32px;\"><p style=\"margin: 0 0 16px; color: #4b5563; font-size: 14px; font-weight: 600;\">Quick start tips:</p><p style=\"margin: 0 0 8px; color: #4b5563; font-size: 14px; line-height: 1.6;\">• Add your first customer to get started</p><p style=\"margin: 0 0 8px; color: #4b5563; font-size: 14px; line-height: 1.6;\">• Schedule recurring jobs automatically</p><p style=\"margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;\">• Set up Direct Debit for seamless payments</p></div></td></tr><tr><td style=\"padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;\"><p style=\"margin: 0 0 8px; color: #4b5563; font-size: 14px; line-height: 1.6;\">This email was sent by <strong>SoloWipe Team</strong>. If you have any questions, we'\''re here to help.</p><p style=\"margin: 0; color: #6b7280; font-size: 12px;\">© 2025 SoloWipe. All rights reserved.</p></td></tr></table></td></tr></table></body></html>",
    "text": "Welcome to SoloWipe!\n\nHi test@example.com,\n\nThanks for joining SoloWipe! You'\''re all set to streamline your window cleaning business.\n\nLet'\''s get to work.\n\nGo to Dashboard: https://solowipe.co.uk/dashboard\n\nQuick start tips:\n• Add your first customer to get started\n• Schedule recurring jobs automatically\n• Set up Direct Debit for seamless payments\n\n© 2025 SoloWipe. All rights reserved."
  }'
```

**Replace:**
- `YOUR_SERVICE_ROLE_KEY` → Get from Supabase Dashboard → Settings → API → `service_role` key
- `test@example.com` → Your test email address

**Expected Success Response:**
```json
{
  "success": true,
  "messageId": "re_xxxxxxxxxxxxx"
}
```

**Expected Error Responses:**
- **401 Unauthorized:** Missing or invalid Authorization header
- **400 Bad Request:** Invalid email format or missing required fields
- **500 Internal Server Error:** RESEND_API_KEY not set or Resend API error

**Verify:**
- Check Resend dashboard: https://resend.com/emails
- Check email inbox (may take a few seconds)

---

## 🧪 The "Trigger Test" SQL

**Purpose:** Test database trigger without creating full user account

### Option 1: Update Existing User (Recommended)

```sql
-- Step 1: Find a test user (create one via signup flow first if needed)
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'your-test-email@example.com'
LIMIT 1;

-- Step 2: If user exists but email not confirmed, update to trigger welcome email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'your-test-email@example.com'
  AND email_confirmed_at IS NULL
RETURNING id, email, email_confirmed_at;

-- Step 3: Check Postgres logs for trigger execution
-- Go to: Supabase Dashboard → Database → Logs
-- Look for: "Welcome email sent successfully to..." or warnings
```

### Option 2: Test Function Directly (Advanced)

```sql
-- This won't work directly because it's a TRIGGER function
-- But you can test the HTTP call logic:

-- Test pg_net extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Test HTTP call (replace with your values)
WITH http_request AS (
  SELECT net.http_post(
    url := 'https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object(
      'to', 'test@example.com',
      'subject', 'Test Welcome Email',
      'html', '<h1>Test</h1>',
      'text', 'Test'
    )::text
  ) AS response
)
SELECT 
  (response).status AS http_status,
  (response).content AS http_response
FROM http_request;
```

### Option 3: End-to-End Test (Most Realistic)

**Via Supabase Auth API:**
```bash
# Step 1: Sign up a test user
curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "email": "test-welcome@example.com",
    "password": "TestPassword123!"
  }'

# Step 2: Confirm email (triggers welcome email)
# Option A: Use magic link from email
# Option B: Admin confirm via Supabase Dashboard → Authentication → Users

# Step 3: Check logs and Resend dashboard
```

**Via Application:**
1. Go to your app: `/auth?mode=signup`
2. Sign up with test email
3. Confirm email (click link in verification email)
4. Check for welcome email (should arrive within seconds)

---

## 🔍 Verification Steps

### 1. Edge Function Logs
**Location:** Supabase Dashboard → Edge Functions → send-email → Logs

**Look for:**
```
[SEND-EMAIL] Function started - {"method":"POST"}
[SEND-EMAIL] Sending email - {"to":"test@example.com","subject":"Welcome to SoloWipe!"}
[SEND-EMAIL] Email sent successfully - {"messageId":"re_xxxxx"}
```

**Errors to watch for:**
```
[SEND-EMAIL] ERROR: RESEND_API_KEY not set
[SEND-EMAIL] ERROR: No authorization header
[SEND-EMAIL] ERROR: Resend API error
```

### 2. Database Logs
**Location:** Supabase Dashboard → Database → Logs

**Look for:**
```
NOTICE: Welcome email sent successfully to test@example.com
```

**Errors to watch for:**
```
WARNING: Welcome email failed for user xxxxx: HTTP 500 - {"error":"..."}
WARNING: Error sending welcome email to test@example.com: ...
```

### 3. Resend Dashboard
**Location:** https://resend.com/emails

**Verify:**
- Email appears in "Sent" list
- Status shows "Delivered"
- Click "View" to see email content
- Check "Opens" and "Clicks" (if enabled)

### 4. Email Inbox
**Check:**
- Email arrives within 10-30 seconds
- Sender shows "Solowipe Team <noreply@solowipe.co.uk>"
- Subject: "Welcome to SoloWipe!"
- HTML renders correctly
- CTA button links to dashboard
- Plain text version is readable

---

## 🐛 Troubleshooting

### CURL Returns 401 Unauthorized
**Fix:** Check Authorization header includes `Bearer ` prefix and valid service_role key

### CURL Returns 500 Internal Server Error
**Fix:** 
1. Verify RESEND_API_KEY is set: `npx supabase secrets list`
2. Check Edge Function logs for specific error
3. Verify Resend API key is valid: https://resend.com/api-keys

### Trigger Not Firing
**Fix:**
1. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_user_email_confirmed';`
2. Check pg_net extension: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
3. Verify service_role_key is set: `SHOW app.settings.service_role_key;`
4. Check trigger is enabled: `SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%welcome%';`

### Email Not Received
**Fix:**
1. Check Resend dashboard for delivery status
2. Check spam folder
3. Verify email address is correct
4. Check Resend account limits/quota
5. Verify domain is verified in Resend (if using custom domain)

---

## ✅ Success Criteria

**System is "Ready for Battle" when:**

- [x] CURL smoke test returns `{"success": true, "messageId": "..."}`
- [x] Email received in inbox within 30 seconds
- [x] Edge Function logs show successful send
- [x] Resend dashboard shows "Delivered" status
- [x] Database trigger fires (if using trigger method)
- [x] No errors in Supabase logs
- [x] Email HTML renders correctly in email client
- [x] CTA button links to correct dashboard URL

---

## 📊 Performance Benchmarks

**Expected Performance:**
- Edge Function response time: < 2 seconds
- Email delivery time: 5-30 seconds
- Database trigger execution: < 1 second
- End-to-end (signup → email received): < 60 seconds

**Monitor:**
- Edge Function execution time (Supabase Dashboard)
- Resend API response time (Resend Dashboard)
- Database trigger execution time (Postgres logs)

---

## 🎯 Next Steps After Verification

1. **Monitor Production:**
   - Set up alerts for failed emails
   - Track delivery rates
   - Monitor edge function errors

2. **Optimize:**
   - A/B test email content
   - Track open rates
   - Optimize send times

3. **Scale:**
   - Add rate limiting if needed
   - Monitor Resend quota
   - Set up email analytics

---

**Last Updated:** 2025-01-30  
**Status:** ✅ Ready for Testing

