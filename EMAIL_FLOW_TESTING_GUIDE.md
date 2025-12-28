# Email Flow Testing Guide

This guide helps you test and verify that all email flows are working correctly with Resend integration.

## Prerequisites

1. ✅ Resend API key configured in Supabase SMTP settings
2. ✅ Email templates added to Supabase (Confirm Signup & Password Reset)
3. ✅ Sender name set to "Solowipe Team" in Supabase

## Test Checklist

### 1. Email Confirmation (Sign Up Flow)

**Test Steps:**
1. Go to `/auth?mode=signup` or click "Sign up"
2. Enter a valid email address (use a real email you can access)
3. Enter a strong password (at least 8 characters, mix of letters, numbers, symbols)
4. Enter business name
5. Accept terms and conditions
6. Click "Sign up"

**Expected Results:**
- ✅ Form submits successfully
- ✅ Toast notification: "Check your email to verify"
- ✅ User sees verification resend option
- ✅ Email received from "Solowipe Team"
- ✅ Email subject: "Verify your SoloWipe account"
- ✅ Email contains branded SoloWipe header (blue gradient)
- ✅ Email has prominent "Verify Email Address" button
- ✅ Clicking button redirects to app and verifies email
- ✅ After verification, user can sign in

**Things to Check:**
- [ ] Email arrives within 1-2 minutes
- [ ] Email sender shows "Solowipe Team <noreply@...>"
- [ ] Email template matches the branded design
- [ ] Confirmation link works (clicking it redirects correctly)
- [ ] Email doesn't go to spam folder
- [ ] Link in email is clickable on mobile and desktop

**Common Issues:**
- Email in spam → Check SPF/DKIM records, verify domain in Resend
- Link doesn't work → Check redirect URL in Supabase Auth settings
- No email received → Check Resend dashboard for sending status

---

### 2. Password Reset Flow

**Test Steps:**
1. Go to `/forgot-password` or click "Forgot password?" on login page
2. Enter an email address (can be existing or non-existing for security test)
3. Click "Send Reset Link"
4. Check email for reset link
5. Click reset link in email
6. Enter new password (strong password)
7. Confirm password
8. Click "Update Password"

**Expected Results:**
- ✅ Always shows success message (even for invalid emails - security best practice)
- ✅ Toast notification: "We've sent a password reset link..."
- ✅ Email received from "Solowipe Team"
- ✅ Email subject: "Reset your SoloWipe password"
- ✅ Email contains branded SoloWipe header
- ✅ Email has prominent "Reset Password" button
- ✅ Email includes security warning about ignoring if not requested
- ✅ Clicking button redirects to `/reset-password`
- ✅ Password strength indicator shows
- ✅ Password validation works (length, strength)
- ✅ After reset, redirects to login page
- ✅ Can sign in with new password
- ✅ Old password no longer works

**Things to Check:**
- [ ] Email arrives within 1-2 minutes
- [ ] Email sender shows "Solowipe Team"
- [ ] Email template matches branded design
- [ ] Reset link works and expires after 1 hour (Supabase default)
- [ ] Security message in email is clear
- [ ] Password strength requirements are enforced
- [ ] Expired links show appropriate error message
- [ ] Invalid links show appropriate error message

**Security Tests:**
- [ ] Requesting reset for non-existent email still shows success (prevents email enumeration)
- [ ] Reset link expires after 1 hour
- [ ] Reset link can only be used once
- [ ] Old password doesn't work after reset
- [ ] Session is properly validated before allowing password reset

---

### 3. Email Verification Resend

**Test Steps:**
1. Sign up but don't verify email
2. Try to sign in (should fail with "email not confirmed" message)
3. Click "Resend verification email" button
4. Check email for new verification link

**Expected Results:**
- ✅ Resend button appears after failed login with unverified email
- ✅ Clicking resend sends new verification email
- ✅ New email received with verification link
- ✅ Link works to verify email

**Things to Check:**
- [ ] Resend functionality works
- [ ] New verification link is valid
- [ ] Old verification links still work (or are invalidated - depends on Supabase config)

---

### 4. Edge Cases & Error Handling

**Test Scenarios:**

1. **Expired Reset Link:**
   - Request password reset
   - Wait 1+ hour (or manually expire link in Supabase)
   - Try to use link
   - Should show: "Invalid or expired reset link. Please request a new one."

2. **Invalid Reset Link:**
   - Navigate to `/reset-password` without a valid token
   - Should show error message
   - Should provide link to request new reset

3. **Weak Password:**
   - Try to reset password with weak password (< 8 chars, no variety)
   - Should show password strength indicator
   - Should prevent submission until password is strong enough

4. **Password Mismatch:**
   - Enter different passwords in "New Password" and "Confirm Password"
   - Should show error: "Passwords do not match"
   - Submit button should be disabled

5. **Rate Limiting:**
   - Request multiple password resets in quick succession
   - Should handle rate limiting gracefully (Supabase manages this)

6. **Email Already Verified:**
   - Try to verify an already-verified email
   - Should handle gracefully (redirect to login or dashboard)

---

## Industry Best Practices Checklist

### Security ✅
- [x] Password reset always shows success (prevents email enumeration)
- [x] Reset links expire (1 hour default)
- [x] Strong password requirements enforced
- [x] Password strength indicator shown
- [x] Session validation before password reset
- [x] Clear security messaging in emails

### User Experience ✅
- [x] Clear, branded email templates
- [x] Prominent call-to-action buttons
- [x] Mobile-responsive email design
- [x] Clear error messages
- [x] Helpful instructions in emails
- [x] Visual feedback (loading states, success states)

### Email Best Practices ✅
- [x] Professional sender name ("Solowipe Team")
- [x] Clear, descriptive subject lines
- [x] Plain text fallback (if using HTML)
- [x] Unsubscribe option (not needed for transactional emails)
- [x] Privacy/security notices where appropriate

---

## Troubleshooting

### Email Not Received

1. **Check Resend Dashboard:**
   - Go to https://resend.com/emails
   - Check if email was sent
   - Check status (delivered, bounced, failed)

2. **Check Spam Folder:**
   - Email might be in spam/junk
   - Check spam folder
   - Mark as "Not Spam" if found

3. **Verify SMTP Configuration:**
   - Supabase Dashboard → Auth → SMTP Settings
   - Verify all settings are correct
   - Test connection if available

4. **Check Domain Verification:**
   - If using custom domain, verify it's verified in Resend
   - Check DNS records (SPF, DKIM)

### Email Link Doesn't Work

1. **Check Redirect URL:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Ensure "Site URL" is correct
   - Ensure redirect URLs are whitelisted

2. **Check Email Template:**
   - Verify `{{ .ConfirmationURL }}` placeholder is in template
   - Ensure template is saved correctly

3. **Check Browser:**
   - Try different browser
   - Clear browser cache
   - Try incognito/private mode

### Testing on Different Devices

**Desktop:**
- Test in Chrome, Firefox, Safari, Edge
- Test email rendering in Gmail, Outlook, Apple Mail

**Mobile:**
- Test on iOS (iPhone, iPad)
- Test on Android
- Test email rendering in mobile email clients

---

## Quick Test Script

Run through this quick checklist for a basic smoke test:

```bash
# 1. Sign Up Test
1. Go to /auth?mode=signup
2. Fill form with real email
3. Submit
4. Check email arrives ✅
5. Click verify link ✅
6. Sign in works ✅

# 2. Password Reset Test
1. Go to /forgot-password
2. Enter email
3. Submit
4. Check email arrives ✅
5. Click reset link ✅
6. Set new password ✅
7. Sign in with new password ✅

# 3. Error Handling Test
1. Try expired reset link → Shows error ✅
2. Try weak password → Shows error ✅
3. Try mismatched passwords → Shows error ✅
```

---

## Next Steps After Testing

1. **Document Any Issues:**
   - Note any problems found
   - Document workarounds if needed

2. **Monitor Email Deliverability:**
   - Check Resend dashboard regularly
   - Monitor bounce rates
   - Check spam complaints (should be minimal)

3. **Gather User Feedback:**
   - Ask users about email experience
   - Note any confusion or issues
   - Iterate on templates based on feedback

4. **Set Up Monitoring:**
   - Consider email analytics
   - Track open rates (if using tracking pixels)
   - Monitor for delivery issues





