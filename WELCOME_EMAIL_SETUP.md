# Welcome Email Setup Guide

This guide explains how to set up automatic welcome emails for new SoloWipe users.

## Overview

The welcome email system consists of:
1. **React Email Template** (`emails/welcome.tsx`) - Modern, branded email design
2. **Edge Function** (`supabase/functions/send-email/index.ts`) - Production-ready email sender
3. **Helper Function** (`src/lib/email.ts`) - Client-side function to send welcome emails
4. **Database Trigger** (SQL migration) - Automatic email on user confirmation

## Architecture

```
User Confirms Email
    ↓
Postgres Trigger (auth.users)
    ↓
Edge Function (send-email)
    ↓
Resend API
    ↓
User Receives Email
```

## Setup Options

### Option 1: Database Trigger (Recommended for Automatic Emails)

The SQL migration creates a Postgres trigger that automatically sends welcome emails when a user confirms their email.

**Prerequisites:**
- `pg_net` extension enabled (for HTTP requests)
- Service role key configured

**Steps:**

1. **Run the migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/20250130000000_add_welcome_email_trigger.sql
   ```

2. **Set the service role key:**
   ```sql
   -- Get your service role key from Supabase Dashboard → Settings → API
   ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
   ```

3. **Set the Supabase URL (if different from default):**
   ```sql
   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
   ```

4. **Test the trigger:**
   - Sign up a new user
   - Confirm their email
   - Check that welcome email is sent

**Note:** The trigger uses `pg_net` extension which may require enabling in Supabase Dashboard → Database → Extensions.

### Option 2: Supabase Database Webhooks (Alternative)

If the Postgres trigger approach doesn't work, use Supabase's built-in webhooks:

1. **Go to Supabase Dashboard:**
   - Navigate to: Database → Webhooks

2. **Create a new webhook:**
   - **Name:** `send-welcome-email`
   - **Table:** `auth.users`
   - **Events:** `UPDATE` (when `email_confirmed_at` changes)
   - **HTTP Request:**
     - **Method:** `POST`
     - **URL:** `https://your-project.supabase.co/functions/v1/send-email`
     - **Headers:**
       ```
       Authorization: Bearer YOUR_SERVICE_ROLE_KEY
       Content-Type: application/json
       ```
     - **Body:**
       ```json
       {
         "to": "{{record.email}}",
         "subject": "Welcome to SoloWipe!",
         "html": "<!DOCTYPE html>...",
         "text": "Welcome to SoloWipe!..."
       }
       ```

3. **Test the webhook:**
   - Confirm a test user's email
   - Check webhook logs in Dashboard

### Option 3: Manual Trigger (For Testing)

Use the helper function in your application code:

```typescript
import { sendWelcomeEmail } from '@/lib/email';

// After user confirms email or completes onboarding
const result = await sendWelcomeEmail(
  user.email,
  `${window.location.origin}/dashboard`,
  user.businessName
);

if (result.success) {
  console.log('Welcome email sent:', result.messageId);
} else {
  console.error('Failed to send welcome email:', result.error);
}
```

**Integration points:**
- After `supabase.auth.signUp()` when `needsEmailConfirmation` is false
- In `onAuthStateChange` when `email_confirmed_at` changes
- After OAuth sign-in completes

## Edge Function Deployment

The `send-email` edge function must be deployed:

```bash
# Deploy the edge function
cd /Users/rebeccaalmond/Downloads/solowipe-main
npx supabase functions deploy send-email

# Set the Resend API key secret
npx supabase secrets set RESEND_API_KEY=your_resend_api_key
```

## Testing

### Test the Edge Function Directly

```bash
# Using Supabase CLI
npx supabase functions invoke send-email \
  --body '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1>"
  }'
```

### Test the Helper Function

```typescript
// In browser console or component
import { sendWelcomeEmail } from '@/lib/email';

const result = await sendWelcomeEmail('test@example.com');
console.log(result);
```

### Test the Database Trigger

1. Create a test user account
2. Confirm the email
3. Check Supabase logs for trigger execution
4. Verify email is received

## Troubleshooting

### Email Not Sending

1. **Check Edge Function Logs:**
   - Supabase Dashboard → Edge Functions → send-email → Logs
   - Look for errors or warnings

2. **Verify Resend API Key:**
   ```bash
   npx supabase secrets list
   ```
   Should show `RESEND_API_KEY`

3. **Check Trigger Execution:**
   ```sql
   -- Check if trigger exists
   SELECT * FROM pg_trigger WHERE tgname = 'on_user_email_confirmed';
   
   -- Check trigger function
   SELECT * FROM pg_proc WHERE proname = 'send_welcome_email';
   ```

4. **Test Edge Function Manually:**
   - Use the test command above
   - Check response for errors

### Trigger Not Firing

1. **Verify trigger is enabled:**
   ```sql
   SELECT tgname, tgenabled FROM pg_trigger 
   WHERE tgname IN ('on_user_email_confirmed', 'on_user_created_confirmed');
   ```

2. **Check if email_confirmed_at is being set:**
   ```sql
   SELECT id, email, email_confirmed_at 
   FROM auth.users 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Check Postgres logs:**
   - Supabase Dashboard → Database → Logs
   - Look for trigger warnings/errors

### Email Template Not Rendering

1. **Verify React Email template exists:**
   - Check `emails/welcome.tsx` exists
   - Ensure it exports `WelcomeEmail` component

2. **Check HTML generation:**
   - The helper function uses static HTML (not React Email rendering)
   - Verify HTML is valid in email client

## Production Checklist

- [ ] Edge function deployed
- [ ] Resend API key set as secret
- [ ] Database trigger/webhook configured
- [ ] Test email sent successfully
- [ ] Email template matches brand guidelines
- [ ] Dashboard URL is correct (production domain)
- [ ] Error handling tested
- [ ] Monitoring/logging set up

## Security Notes

- The edge function requires Authorization header (service role key)
- Never expose service role key in client-side code
- Email addresses are validated before sending
- Failed emails don't block user registration (non-blocking trigger)

## Future Enhancements

- Add email preferences (opt-out)
- A/B test different welcome email designs
- Track email open rates via Resend analytics
- Add personalized onboarding tips based on user type
- Send follow-up emails after first job completion

