# Resend Email Integration Setup Guide

This guide explains how to use Resend for sending emails in your SoloWipe application.

## Quick Start

1. **Get your Resend API key** from https://resend.com
2. **Configure SMTP in Supabase**: Project Settings → Auth → SMTP Settings
   - Host: `smtp.resend.com`, Port: `587`
   - User: `resend`, Password: Your API key
3. **Add the email template**: Copy `supabase-confirm-signup-email-template.html` into Supabase → Authentication → Email Templates → Confirm signup
4. **Set sender name**: "Solowipe Team" in the email template settings

That's it! Your confirmation emails will now be sent via Resend with professional branding.

## Overview

We've integrated Resend SDK to provide professional email sending capabilities. This includes:
1. A reusable email utility function (`src/lib/email.ts`)
2. A Supabase Edge Function for server-side email sending (`supabase/functions/send-email/index.ts`)
3. A branded HTML email template for Supabase confirmation emails (`supabase-confirm-signup-email-template.html`)

## Setup Steps

### 1. Get Your Resend API Key

1. Sign up for a Resend account at https://resend.com
2. Navigate to your API Keys section
3. Create a new API key
4. Copy the API key (you'll need it for the next steps)

### 2. Configure Resend API Key in Supabase

#### Option A: Using Supabase Dashboard (Recommended for Edge Functions)

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name:** `RESEND_API_KEY`
   - **Value:** Your Resend API key

#### Option B: Using Supabase CLI

```bash
supabase secrets set RESEND_API_KEY=your_api_key_here
```

### 3. Set Up Custom SMTP in Supabase (For Email Templates)

**This is the recommended way to use Resend with Supabase email templates.**

To use Resend for Supabase's built-in email templates (like confirmation emails):

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Configure:
   - **SMTP Host:** `smtp.resend.com`
   - **SMTP Port:** `587` (or `465` for SSL)
   - **SMTP User:** `resend`
   - **SMTP Password:** Your Resend API key
   - **Sender Email:** `noreply@solowipe.co.uk` (or your verified domain)
   - **Sender Name:** `Solowipe Team`
4. Save the settings

**Note:** Make sure you've verified your domain in Resend before using a custom sender email, or use Resend's default sending domain for testing.

### 4. Add the Branded Email Templates to Supabase

#### Confirm Signup Template

1. Go to **Authentication** → **Email Templates**
2. Click on **"Confirm signup"** template
3. Copy the contents of `supabase-confirm-signup-email-template.html`
4. Paste it into the HTML template editor
5. **Important:** Keep the `{{ .ConfirmationURL }}` placeholder - Supabase will replace it with the actual confirmation URL
6. Update the subject line to: `Verify your SoloWipe account`
7. Set the sender name to: `Solowipe Team`
8. Save the template

#### Password Reset Template

1. Still in **Authentication** → **Email Templates**
2. Click on **"Reset Password"** template
3. Copy the contents of `supabase-password-reset-email-template.html`
4. Paste it into the HTML template editor
5. **Important:** Keep the `{{ .ConfirmationURL }}` placeholder - Supabase will replace it with the actual reset URL
6. Update the subject line to: `Reset your SoloWipe password`
7. Set the sender name to: `Solowipe Team`
8. Save the template

### 5. Verify Your Domain in Resend (Optional but Recommended)

To send emails from `noreply@solowipe.co.uk`:

1. Go to Resend Dashboard → **Domains**
2. Add your domain: `solowipe.co.uk`
3. Add the DNS records provided by Resend to your domain's DNS settings:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
4. Wait for verification (usually a few minutes)

Once verified, you can send emails from any address on that domain.

## Usage

### Using the Edge Function

Call the Edge Function from your frontend code:

```typescript
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const { session } = useAuth();

const sendEmail = async () => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: 'customer@example.com',
      subject: 'Welcome to SoloWipe!',
      html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
      text: 'Welcome! Thanks for signing up.',
      from: 'Solowipe Team <noreply@solowipe.co.uk>',
    },
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
    },
  });

  if (error) {
    console.error('Error sending email:', error);
  } else {
    console.log('Email sent:', data);
  }
};
```

### Using the Utility Function (Client-Side - Not Recommended)

The utility function in `src/lib/email.ts` is designed for server-side use. For client-side usage, wrap it in an Edge Function (as shown above).

### Email Template Variables

When using the HTML template in Supabase, the following variables are available:

- `{{ .ConfirmationURL }}` - The confirmation link URL
- `{{ .Email }}` - The user's email address
- `{{ .Token }}` - The confirmation token (if needed)
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Year }}` - Current year

## Testing

### Test the Edge Function

1. Use Supabase Dashboard → **Edge Functions** → **send-email** → **Invoke**
2. Or use the Supabase CLI:
   ```bash
   supabase functions invoke send-email --body '{"to":"test@example.com","subject":"Test","html":"<h1>Test</h1>"}'
   ```

### Test Email Templates

1. Go to **Authentication** → **Users**
2. Create a test user
3. Check if the confirmation email uses your branded template

## Troubleshooting

### Edge Function Not Working

1. Verify `RESEND_API_KEY` is set in Supabase secrets
2. Check Edge Function logs in Supabase Dashboard
3. Ensure the Resend API key is valid

### Emails Not Sending

1. Verify your Resend account is active
2. Check Resend dashboard for sending limits
3. Verify domain (if using custom domain)
4. Check spam folder

### Template Variables Not Replacing

- Ensure you're using the correct Supabase template variable syntax: `{{ .VariableName }}`
- Variables are case-sensitive

## Next Steps

- Customize other email templates (Magic Link, Password Reset, etc.)
- Set up email analytics in Resend dashboard
- Configure email webhooks for delivery tracking
- Add email templates for other flows (welcome emails, receipts, etc.)

## Support

- Resend Docs: https://resend.com/docs
- Supabase Email Templates: https://supabase.com/docs/guides/auth/auth-email-templates
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

