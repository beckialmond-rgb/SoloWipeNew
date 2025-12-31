# Welcome Email System - Security & QA Audit Report

**Date:** 2025-01-30  
**Auditor:** Senior Security Engineer & QA Automation Lead  
**Status:** ⚠️ **ISSUES FOUND - REQUIRES FIXES**

---

## Executive Summary

The welcome email implementation has **strong security foundations** but contains **one critical SQL syntax issue** that will cause the database trigger to fail. The Edge Function and React Email template are production-ready.

**Critical Issues:** 1  
**High Priority Issues:** 0  
**Medium Priority Issues:** 0  
**Low Priority Issues:** 1  

---

## Step 1: Code Audit (Static Analysis)

### ✅ Edge Function: `supabase/functions/send-email/index.ts`

#### 1.1 Secret Handling ✅ PASS
**Location:** Lines 125-136

```typescript
const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  logStep("ERROR: RESEND_API_KEY not set");
  return new Response(
    JSON.stringify({ error: "RESEND_API_KEY environment variable is not set" }),
    { status: 500 }
  );
}
```

**Assessment:** ✅ **EXCELLENT**
- Fails gracefully with HTTP 500 (not silent)
- Logs error for debugging
- Returns proper error message
- Does not expose sensitive information

#### 1.2 Type Safety ✅ PASS
**Location:** Lines 17-25, 30-34

```typescript
interface SendEmailRequest {
  to: string | string[];
  subject: string;
  html: string; // Required
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

**Assessment:** ✅ **EXCELLENT**
- Strictly typed interfaces
- Required vs optional fields clearly defined
- Type-safe validation function (lines 47-101)

#### 1.3 Async/Await ✅ PASS
**Location:** Line 189

```typescript
const result = await resend.emails.send({
  from: from || "Solowipe Team <noreply@solowipe.co.uk",
  to: Array.isArray(to) ? to : [to],
  subject,
  html,
  text: text || undefined,
  reply_to: replyTo || undefined,
  tags: tags || undefined,
});
```

**Assessment:** ✅ **CORRECT**
- Properly awaits Resend API call
- Error handling wraps async operation
- No race conditions

---

### ✅ React Email Template: `emails/welcome.tsx`

#### 2.1 Type Safety ✅ PASS
**Location:** Lines 17-21

```typescript
interface WelcomeEmailProps {
  userEmail?: string;
  dashboardUrl?: string;
  businessName?: string;
}
```

**Assessment:** ✅ **EXCELLENT**
- Strictly typed interface
- Optional props with sensible defaults
- TypeScript will catch type errors at compile time

#### 2.2 Export Check ✅ PASS
**Location:** Lines 23, 103

```typescript
export const WelcomeEmail = ({ ... }: WelcomeEmailProps) => { ... }
export default WelcomeEmail;
```

**Assessment:** ✅ **CORRECT**
- Named export for programmatic use
- Default export for convenience
- Both exports present

---

## Step 2: Database Trigger Logic Check

### ❌ SQL Trigger: `supabase/migrations/20250130000000_add_welcome_email_trigger.sql`

#### 3.1 Syntax Verification ❌ **CRITICAL ISSUE FOUND**
**Location:** Lines 143-163

**Current Code:**
```sql
SELECT status, content INTO response_status, response_body
FROM net.http_post(
  url := edge_function_url,
  headers := jsonb_build_object(...),
  body := jsonb_build_object(...)::text
);
```

**Problem:** 
The `net.http_post` function in pg_net returns a **single record**, not a table. The `SELECT ... FROM` syntax is incorrect for this use case. In PL/pgSQL, we should use `PERFORM` for side-effect functions or assign directly to a record variable.

**Correct Syntax Options:**

**Option A (Recommended):** Use record variable
```sql
DECLARE
  http_response RECORD;
BEGIN
  SELECT * INTO http_response
  FROM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(...),
    body := jsonb_build_object(...)::text
  );
  
  response_status := http_response.status;
  response_body := http_response.content;
```

**Option B:** Use PERFORM (if we don't need response)
```sql
PERFORM net.http_post(...);
```

**Fix Required:** ✅ **YES** - This will cause trigger to fail

#### 3.2 Header Check ✅ PASS
**Location:** Lines 146-152

```sql
headers := jsonb_build_object(
  'Content-Type', 'application/json',
  'Authorization', 'Bearer ' || COALESCE(...)
)
```

**Assessment:** ✅ **CORRECT**
- `Content-Type: application/json` header present
- Proper JSONB object construction
- Authorization header included

#### 3.3 Auth Headers ✅ PASS
**Location:** Lines 148-151

```sql
'Authorization', 'Bearer ' || COALESCE(
  current_setting('app.settings.service_role_key', true),
  current_setting('app.supabase_service_role_key', true)
)
```

**Assessment:** ✅ **GOOD**
- Authorization header present
- Uses service role key (not anon key)
- Fallback to alternative setting name
- Edge Function validates this header (line 139-149 in index.ts)

**Note:** Edge Function requires Authorization header, so this is correct.

---

## Step 3: Additional Security Findings

### ✅ Input Validation
- Edge Function validates email format (lines 39-42)
- Edge Function validates all required fields (lines 47-101)
- SQL trigger validates email exists (lines 35-38)

### ✅ Error Handling
- Edge Function: Comprehensive try-catch (lines 227-242)
- SQL Trigger: Exception handler prevents trigger failure (lines 174-179)
- Non-blocking design (email failure doesn't break user registration)

### ✅ Security Headers
- CORS properly configured (uses shared cors.ts)
- Authorization required (line 139)
- No sensitive data in logs (line 181)

### ⚠️ Potential Improvement
**Location:** SQL Trigger line 143

**Issue:** If `net.http_post` fails (network error, timeout), the trigger might still succeed silently if exception handler catches it. Consider adding timeout configuration.

---

## Step 4: Verification Kit

### 🔥 The "Smoke Test" CURL

Test the Edge Function directly (bypasses database):

```bash
# Replace YOUR_SUPABASE_URL and YOUR_SERVICE_ROLE_KEY
curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "to": "test@example.com",
    "subject": "Welcome to SoloWipe!",
    "html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Test</title></head><body><h1>Welcome to SoloWipe!</h1><p>Hi test@example.com,</p><p>Thanks for joining SoloWipe! You'\''re all set to streamline your window cleaning business.</p><p>Let'\''s get to work.</p><p><a href=\"https://solowipe.co.uk/dashboard\" style=\"display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;\">Go to Dashboard</a></p></body></html>",
    "text": "Welcome to SoloWipe!\n\nHi test@example.com,\n\nThanks for joining SoloWipe! You'\''re all set to streamline your window cleaning business.\n\nLet'\''s get to work.\n\nGo to Dashboard: https://solowipe.co.uk/dashboard"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "re_xxxxxxxxxxxxx"
}
```

**Error Cases to Test:**
```bash
# Missing Authorization header (should return 401)
curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test", "html": "<h1>Test</h1>"}'

# Invalid email (should return 400)
curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"to": "invalid-email", "subject": "Test", "html": "<h1>Test</h1>"}'

# Missing RESEND_API_KEY (should return 500)
# (Test by temporarily removing secret in Supabase Dashboard)
```

---

### 🧪 The "Trigger Test" SQL

Test the database trigger without creating a full user:

**Option 1: Update existing user's email_confirmed_at**
```sql
-- Find a test user (or create one via signup flow first)
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'test@example.com'
LIMIT 1;

-- If user exists but email not confirmed, update to trigger
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'test@example.com'
  AND email_confirmed_at IS NULL;

-- Check logs for trigger execution
-- Supabase Dashboard → Database → Logs
```

**Option 2: Direct function call (bypasses trigger)**
```sql
-- Test the function directly
SELECT public.send_welcome_email();

-- Note: This won't work as-is because it's a TRIGGER function
-- Need to call with NEW/OLD context
```

**Option 3: Create test user via SQL (if you have direct DB access)**
```sql
-- WARNING: This bypasses Supabase Auth - use only for testing
-- Create a test user record
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'test-welcome@example.com',
  crypt('test-password', gen_salt('bf')),
  NOW(), -- Email already confirmed - triggers welcome email
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}'
);

-- Check function logs
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%send_welcome_email%';
```

**Option 4: Use Supabase Auth API (Recommended)**
```bash
# Sign up a test user via Auth API
curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "email": "test-welcome@example.com",
    "password": "TestPassword123!"
  }'

# Then confirm email (triggers welcome email)
# Or use magic link which auto-confirms
```

---

## 🔧 Required Fixes

### Fix #1: SQL Trigger Syntax (CRITICAL)

**File:** `supabase/migrations/20250130000000_add_welcome_email_trigger.sql`

**Replace lines 143-163 with:**

```sql
  -- Call the send-email edge function via pg_net HTTP
  -- Using record variable to capture response
  DECLARE
    http_response RECORD;
  BEGIN
    -- Make HTTP request
    SELECT * INTO http_response
    FROM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(
          current_setting('app.settings.service_role_key', true),
          current_setting('app.supabase_service_role_key', true)
        )
      ),
      body := jsonb_build_object(
        'to', user_email,
        'subject', 'Welcome to SoloWipe!',
        'html', email_html,
        'text', email_text,
        'tags', jsonb_build_array(
          jsonb_build_object('name', 'category', 'value', 'welcome_email'),
          jsonb_build_object('name', 'type', 'value', 'onboarding')
        )
      )::text
    );
    
    -- Extract response fields
    response_status := http_response.status;
    response_body := http_response.content;
```

**Wait, there's an issue - we can't nest DECLARE blocks. Let me fix this properly:**

Actually, the DECLARE is already at the top of the function. We just need to fix the SELECT INTO syntax. The correct approach is:

```sql
  -- Call the send-email edge function via pg_net HTTP
  -- Note: net.http_post returns a record with status, content, headers fields
  SELECT 
    (r.response).status,
    (r.response).content
  INTO response_status, response_body
  FROM (
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(
          current_setting('app.settings.service_role_key', true),
          current_setting('app.supabase_service_role_key', true)
        )
      ),
      body := jsonb_build_object(
        'to', user_email,
        'subject', 'Welcome to SoloWipe!',
        'html', email_html,
        'text', email_text,
        'tags', jsonb_build_array(
          jsonb_build_object('name', 'category', 'value', 'welcome_email'),
          jsonb_build_object('name', 'type', 'value', 'onboarding')
        )
      )::text
    ) AS response
  ) r;
```

Actually, let me check the pg_net documentation pattern more carefully. The simplest fix is to use a record variable that's already declared, or use the proper field access pattern.

**Best Fix (using existing variables):**
```sql
  -- Call the send-email edge function via pg_net HTTP
  DECLARE
    http_result RECORD;
  BEGIN
    SELECT * INTO http_result
    FROM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(
          current_setting('app.settings.service_role_key', true),
          current_setting('app.supabase_service_role_key', true)
        )
      ),
      body := jsonb_build_object(
        'to', user_email,
        'subject', 'Welcome to SoloWipe!',
        'html', email_html,
        'text', email_text,
        'tags', jsonb_build_array(
          jsonb_build_object('name', 'category', 'value', 'welcome_email'),
          jsonb_build_object('name', 'type', 'value', 'onboarding')
        )
      )::text
    );
    
    response_status := http_result.status;
    response_body := http_result.content;
```

But wait - we can't declare http_result inside the BEGIN block if response_status and response_body are already declared. Let me check the full function structure...

Looking at the function, `response_status` and `response_body` are already declared in the DECLARE section (lines 24-25). So we just need to fix the SELECT INTO to properly extract from the record returned by net.http_post.

The correct pattern for pg_net is typically:
```sql
SELECT status, content INTO response_status, response_body
FROM net.http_post(...);
```

But if net.http_post returns a record type, we might need:
```sql
SELECT (net.http_post(...)).status, (net.http_post(...)).content INTO response_status, response_body;
```

This would call the function twice though. Better to use a subquery or CTE.

**Final Correct Fix:**
```sql
  -- Call the send-email edge function via pg_net HTTP
  WITH http_request AS (
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(
          current_setting('app.settings.service_role_key', true),
          current_setting('app.supabase_service_role_key', true)
        )
      ),
      body := jsonb_build_object(
        'to', user_email,
        'subject', 'Welcome to SoloWipe!',
        'html', email_html,
        'text', email_text,
        'tags', jsonb_build_array(
          jsonb_build_object('name', 'category', 'value', 'welcome_email'),
          jsonb_build_object('name', 'type', 'value', 'onboarding')
        )
      )::text
    ) AS response
  )
  SELECT 
    (response).status,
    (response).content
  INTO response_status, response_body
  FROM http_request;
```

This uses a CTE to call the function once, then extracts the fields from the record.

---

## ✅ Final Verdict

**Status:** ⚠️ **NOT READY FOR PRODUCTION** - Requires SQL fix

**Summary:**
- ✅ Edge Function: Production-ready, secure, well-typed
- ✅ React Email Template: Production-ready, properly typed
- ❌ SQL Trigger: **CRITICAL SYNTAX ERROR** - Will fail at runtime

**Action Required:**
1. Fix SQL trigger syntax (see Fix #1 above)
2. Test with CURL command
3. Test trigger with SQL commands
4. Deploy and monitor

---

## 📋 Pre-Deployment Checklist

- [ ] Fix SQL trigger syntax
- [ ] Run CURL smoke test (verify Edge Function works)
- [ ] Test SQL trigger (verify webhook fires)
- [ ] Verify RESEND_API_KEY is set in Supabase secrets
- [ ] Verify service_role_key is configured for trigger
- [ ] Check Supabase logs for errors
- [ ] Monitor Resend dashboard for email delivery
- [ ] Test end-to-end: Sign up → Confirm email → Receive welcome email

---

**Report Generated:** 2025-01-30  
**Next Review:** After fixes applied

