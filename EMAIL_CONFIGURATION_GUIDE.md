# Email Configuration Guide - SoloWipe

## Problem
Verification emails are coming from "supabase" instead of "SoloWipe".

## Solution
Configure email sender name and address in Supabase Dashboard.

## Steps to Fix

### Option 1: Configure Email Templates in Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `owqjyaiptexqwafzmcwy`

2. **Navigate to Authentication Settings**
   - Go to: **Authentication** → **Email Templates**

3. **Customize Email Templates**
   - Click on **"Confirm signup"** template
   - Update the following:
     - **Subject**: `Verify your SoloWipe account`
     - **Sender name**: `SoloWipe` (or `SoloWipe Team`)
     - **From email**: You can use a custom domain if configured, or it will use Supabase's default

4. **Update Other Email Templates** (if needed):
   - **Magic Link**: Update sender name to "SoloWipe"
   - **Change Email Address**: Update sender name to "SoloWipe"
   - **Reset Password**: Update sender name to "SoloWipe"
   - **Invite User**: Update sender name to "SoloWipe"

### Option 2: Use Custom SMTP (For Custom Email Domain)

If you want emails to come from `noreply@solowipe.co.uk` or similar:

1. **Set up Custom SMTP in Supabase**
   - Go to: **Project Settings** → **Auth** → **SMTP Settings**
   - Enable **Custom SMTP**
   - Configure your SMTP provider (e.g., SendGrid, Mailgun, AWS SES)

2. **SMTP Configuration Example**:
   ```
   SMTP Host: smtp.sendgrid.net (or your provider)
   SMTP Port: 587
   SMTP User: apikey (or your username)
   SMTP Password: [your API key]
   Sender Email: noreply@solowipe.co.uk
   Sender Name: SoloWipe
   ```

3. **Verify Domain** (if using custom domain):
   - Add SPF, DKIM, and DMARC records to your domain DNS
   - Verify domain in your SMTP provider

### Option 3: Quick Fix - Update Email Templates Only

**Minimal Configuration** (No SMTP setup required):

1. Go to **Authentication** → **Email Templates**
2. For each template, update:
   - **Sender name**: `SoloWipe`
   - **Subject line**: Include "SoloWipe" (e.g., "Verify your SoloWipe account")

## Email Templates to Update

### 1. Confirm Signup (Verification Email)
```
Subject: Verify your SoloWipe account
Sender Name: SoloWipe
```

### 2. Magic Link
```
Subject: Your SoloWipe login link
Sender Name: SoloWipe
```

### 3. Change Email Address
```
Subject: Confirm your new SoloWipe email
Sender Name: SoloWipe
```

### 4. Reset Password
```
Subject: Reset your SoloWipe password
Sender Name: SoloWipe
```

### 5. Invite User
```
Subject: You've been invited to SoloWipe
Sender Name: SoloWipe
```

## Testing

After configuration:
1. Sign up with a test email
2. Check the email sender name shows "SoloWipe"
3. Verify the subject line is correct
4. Test password reset email

## Current Email Flow

The app sends verification emails via:
- `src/hooks/useAuth.tsx` → `resendVerificationEmail()` function
- Uses `supabase.auth.resend()` API
- Email content is controlled by Supabase Dashboard templates

## Notes

- Email sender configuration is **not** in the codebase
- Changes must be made in Supabase Dashboard
- Custom SMTP requires domain verification
- Default Supabase emails can be customized without SMTP setup

## Support

If you need help configuring:
- Check Supabase docs: https://supabase.com/docs/guides/auth/auth-email-templates
- SMTP setup: https://supabase.com/docs/guides/auth/auth-smtp
