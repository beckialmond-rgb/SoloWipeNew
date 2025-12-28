# Google OAuth Configuration Verification Checklist

Use this checklist to verify your Google OAuth integration is correctly configured according to industry standards.

---

## ✅ Step 1: Google Cloud Console Configuration

### 1.1 OAuth Client Setup

- [ ] **Navigate to Google Cloud Console**
  - Go to: https://console.cloud.google.com/
  - Select your project (or create one if needed)

- [ ] **Enable Google+ API** (if required)
  - Go to: APIs & Services → Library
  - Search for "Google+ API" or "Google Identity"
  - Click "Enable" if not already enabled

- [ ] **Create OAuth 2.0 Client ID**
  - Go to: APIs & Services → Credentials
  - Click "Create Credentials" → "OAuth client ID"
  - If prompted, configure OAuth consent screen first

### 1.2 OAuth Consent Screen Configuration

- [ ] **Configure Consent Screen**
  - Go to: APIs & Services → OAuth consent screen
  - Choose "External" (for public apps) or "Internal" (for Google Workspace)
  - Fill in required fields:
    - [ ] App name: "SoloWipe" (or your app name)
    - [ ] User support email: Your support email
    - [ ] Developer contact information: Your email
  - [ ] Add app logo (optional but recommended)
  - [ ] Save and continue

- [ ] **Configure Scopes** (if custom scopes needed)
  - Review scopes requested by Supabase
  - Default Supabase scopes: `openid`, `email`, `profile`
  - Add any additional scopes only if needed
  - Save and continue

- [ ] **Add Test Users** (if in Testing mode)
  - Add test email addresses if app is in "Testing" status
  - Only test users can sign in until app is published

### 1.3 OAuth Client Credentials

- [ ] **Create OAuth Client ID**
  - Application type: "Web application"
  - Name: "SoloWipe Web Client" (or descriptive name)

- [ ] **Configure Authorized Redirect URIs**
  
  **Critical**: The redirect URI MUST match exactly. Get your Supabase redirect URI from:
  
  1. Go to Supabase Dashboard → Authentication → URL Configuration
  2. Copy the "Redirect URLs" - should be something like:
     ```
     https://[your-project-id].supabase.co/auth/v1/callback
     ```
  
  3. Add this EXACT URL to Google Cloud Console:
     - [ ] Copy the exact URL from Supabase
     - [ ] Paste into "Authorized redirect URIs" in Google Cloud Console
     - [ ] Verify no trailing slash
     - [ ] Verify https:// protocol
     - [ ] Verify exact match (character by character)

- [ ] **Save Client ID and Secret**
  - [ ] Copy Client ID
  - [ ] Copy Client Secret (you'll need this for Supabase)
  - [ ] Store Client Secret securely (never commit to code)

---

## ✅ Step 2: Supabase Configuration

### 2.1 Enable Google Provider

- [ ] **Navigate to Supabase Dashboard**
  - Go to: https://supabase.com/dashboard
  - Select your project

- [ ] **Enable Google Provider**
  - Go to: Authentication → Providers
  - Find "Google" in the list
  - Toggle to "Enabled"

- [ ] **Add Client Credentials**
  - [ ] Paste Google Client ID from Step 1.3
  - [ ] Paste Google Client Secret from Step 1.3
  - [ ] Save changes

- [ ] **Verify Redirect URL**
  - Check: Authentication → URL Configuration
  - Verify "Site URL" is set correctly (your app URL)
  - Note the "Redirect URLs" - this should match what you added to Google Cloud Console

### 2.2 Test Configuration

- [ ] **Check Redirect URL Match**
  - Supabase redirect URL: `https://[project-id].supabase.co/auth/v1/callback`
  - Google Cloud Console redirect URI: `https://[project-id].supabase.co/auth/v1/callback`
  - [ ] Verify they match exactly

---

## ✅ Step 3: Application Code Verification

### 3.1 Code Review

- [ ] **Verify OAuth Implementation**
  - Check: `src/hooks/useAuth.tsx`
  - Verify `signInWithOAuth` function uses correct parameters
  - Verify `prompt: 'select_account'` is used (not `'consent'`)
  - Verify redirect URL is correctly constructed

- [ ] **Verify Error Handling**
  - Check: `src/pages/Auth.tsx`
  - Verify OAuth error handling is comprehensive
  - Verify user-friendly error messages

- [ ] **Verify Analytics**
  - Check that OAuth events are tracked:
    - `oauth_signin_started`
    - `oauth_signin_completed`
    - `oauth_signin_failed`

### 3.2 Environment Variables

- [ ] **Verify Supabase Configuration**
  - `VITE_SUPABASE_URL` is set correctly
  - `VITE_SUPABASE_ANON_KEY` is set correctly
  - These should be in `.env` file (not committed to git)

---

## ✅ Step 4: Security Verification

### 4.1 HTTPS Enforcement

- [ ] **Production URLs use HTTPS**
  - Verify production app URL uses `https://`
  - Verify Supabase redirect URL uses `https://`
  - HTTP should only be used for local development

### 4.2 Credential Security

- [ ] **Client Secret is Secure**
  - Stored only in Supabase Dashboard (Environment Secrets)
  - Never exposed in client-side code
  - Never committed to version control

### 4.3 Token Security

- [ ] **Tokens Handled Securely**
  - Supabase handles token storage (verify this is secure)
  - Tokens stored in secure storage (Supabase handles this)
  - Refresh tokens handled securely (if used)

---

## ✅ Step 5: Testing Checklist

### 5.1 First-Time Sign-Up Test

- [ ] **New User Flow**
  1. Click "Sign in with Google"
  2. Select Google account
  3. Grant permissions (if first time)
  4. Should redirect back to app
  5. Account should be created
  6. Profile should be created automatically
  7. Should redirect to dashboard

### 5.2 Returning User Test

- [ ] **Existing User Flow**
  1. Click "Sign in with Google"
  2. Should remember account selection (with `prompt: 'select_account'`)
  3. Should not force consent screen unnecessarily
  4. Should redirect to dashboard quickly

### 5.3 Multiple Accounts Test

- [ ] **Account Selection**
  1. Click "Sign in with Google"
  2. If multiple Google accounts, should show selection screen
  3. Can select different account
  4. Should sign in with selected account

### 5.4 Error Handling Test

- [ ] **Cancelled OAuth**
  - Click "Sign in with Google"
  - Click "Cancel" or close window
  - Should show friendly error message
  - Should not crash or show technical error

- [ ] **Network Error**
  - Simulate network error
  - Should show appropriate error message
  - Should allow retry

### 5.5 Mobile Testing

- [ ] **Mobile Browser**
  - Test on iOS Safari
  - Test on Chrome Mobile
  - Verify OAuth flow works correctly
  - Verify redirect works correctly

---

## ✅ Step 6: Production Readiness

### 6.1 OAuth Consent Screen Status

- [ ] **Verify App Status**
  - If in "Testing" mode:
    - [ ] Add all test users
    - [ ] Or publish app (if ready for production)
  - If in "Production" mode:
    - [ ] Verify app information is complete
    - [ ] Verify privacy policy URL is set
    - [ ] Verify terms of service URL is set (if required)

### 6.2 Monitoring

- [ ] **Set Up Monitoring**
  - Monitor OAuth success/failure rates
  - Monitor error logs
  - Set up alerts for high error rates

### 6.3 Documentation

- [ ] **Document Configuration**
  - Document redirect URI for reference
  - Document any custom scopes used
  - Document troubleshooting steps

---

## 🔍 Common Issues & Solutions

### Issue: "redirect_uri_mismatch" Error

**Cause**: Redirect URI in Google Cloud Console doesn't match exactly

**Solution**:
1. Go to Google Cloud Console → Credentials
2. Find your OAuth client ID
3. Check "Authorized redirect URIs"
4. Copy the exact URL from Supabase Dashboard → Authentication → URL Configuration
5. Paste exactly (no trailing slash, correct protocol)
6. Save and wait 1-2 minutes for changes to propagate

### Issue: "access_denied" Error

**Cause**: User cancelled OAuth or didn't grant permissions

**Solution**: This is expected behavior - user cancelled. Error handling should show friendly message.

### Issue: Consent Screen Shows Every Time

**Cause**: Using `prompt: 'consent'` in OAuth parameters

**Solution**: Change to `prompt: 'select_account'` in `src/hooks/useAuth.tsx`

### Issue: App Not in OAuth Consent Screen List

**Cause**: OAuth consent screen not configured or app not published

**Solution**:
1. Go to Google Cloud Console → OAuth consent screen
2. Complete all required fields
3. If in Testing mode, add test users
4. Or publish app if ready

---

## 📋 Quick Reference

### Redirect URI Format

**Supabase Standard Format:**
```
https://[project-id].supabase.co/auth/v1/callback
```

**Example:**
```
https://owqjyaiptexqwafzmcwy.supabase.co/auth/v1/callback
```

### Where to Find Your Redirect URI

1. **Supabase Dashboard**
   - Authentication → URL Configuration
   - Look under "Redirect URLs"

2. **Google Cloud Console**
   - APIs & Services → Credentials
   - Click your OAuth client ID
   - Check "Authorized redirect URIs"

### Required Scopes (Supabase Default)

- `openid`
- `email`
- `profile`

These are standard OIDC scopes and don't require verification.

---

## ✅ Final Verification

Before going to production, verify:

- [ ] All checklist items completed
- [ ] OAuth flow tested end-to-end
- [ ] Error handling tested
- [ ] Redirect URI matches exactly
- [ ] Client credentials stored securely
- [ ] HTTPS enforced
- [ ] Monitoring set up
- [ ] Documentation complete

---

## 🎯 Industry Standards Compliance

Your implementation should comply with:

- ✅ **OAuth 2.0 Specification** (RFC 6749)
- ✅ **OpenID Connect** (OIDC) standards
- ✅ **Google OAuth 2.0 Best Practices**
- ✅ **Security best practices** (HTTPS, secure storage)
- ✅ **User experience best practices** (minimal friction, clear errors)

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google OAuth Best Practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)





