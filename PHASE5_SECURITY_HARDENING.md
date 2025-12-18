# Phase 5: Security & Authentication Hardening Guide

## Overview
This phase ensures your application is secure, authentication works correctly, and no sensitive information is exposed.

---

## Part 1: Supabase Key Management

### Current Keys

**Public Keys (Safe to expose):**
- `VITE_SUPABASE_URL` - Public project URL ✅
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public anon key ✅

**Secret Keys (Never expose):**
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key with full database access ⚠️
- `STRIPE_SECRET_KEY` - Stripe API secret ⚠️
- `GOCARDLESS_CLIENT_SECRET` - GoCardless OAuth secret ⚠️
- `GOCARDLESS_WEBHOOK_SECRET` - Webhook signing secret ⚠️

### Key Rotation Checklist

- [ ] **When to rotate:**
  - If keys are accidentally exposed
  - Quarterly as best practice
  - After security incident
  - When team member leaves

- [ ] **How to rotate Supabase keys:**
  1. Go to Supabase Dashboard → Settings → API
  2. Click "Reset" next to service_role key
  3. Copy new key
  4. Update `SUPABASE_SERVICE_ROLE_KEY` in Supabase secrets
  5. Redeploy Edge Functions

- [ ] **How to rotate other keys:**
  - Stripe: Generate new key in Stripe Dashboard
  - GoCardless: Regenerate in GoCardless Dashboard
  - Update Supabase secrets
  - Redeploy functions

### Key Security Best Practices

- [ ] Never commit keys to git
- [ ] Never expose service_role key to client
- [ ] Use different keys for staging/production
- [ ] Rotate keys regularly
- [ ] Monitor key usage for anomalies

---

## Part 2: RLS Policy Verification

### Current RLS Setup

**Tables with RLS enabled:**
- ✅ `profiles` - RLS enabled
- ✅ `customers` - RLS enabled
- ✅ `jobs` - RLS enabled

### Policy Verification Checklist

#### Profiles Table
- [ ] Users can only SELECT their own profile
- [ ] Users can only UPDATE their own profile
- [ ] Users can only INSERT their own profile (via trigger)

#### Customers Table
- [ ] Users can only SELECT customers with their `profile_id`
- [ ] Users can only INSERT customers with their own `profile_id`
- [ ] Users can only UPDATE their own customers
- [ ] Users can only DELETE their own customers

#### Jobs Table
- [ ] Users can only SELECT jobs for their customers
- [ ] Users can only INSERT jobs for their customers
- [ ] Users can only UPDATE jobs for their customers
- [ ] Users can only DELETE jobs for their customers

### Test RLS Policies

Run these queries as different users to verify isolation:

```sql
-- As User A, try to see User B's data (should return 0 rows)
SELECT * FROM customers WHERE profile_id != auth.uid();

-- As User A, try to insert customer for User B (should fail)
INSERT INTO customers (profile_id, name, address, price, frequency_weeks)
VALUES ('OTHER_USER_ID', 'Hacker', '123 Hack St', 20, 4);
```

### RLS Policy Audit

**File:** `phase2_test_rls_policies.sql` (from Phase 2)

Run this to verify all policies are working correctly.

---

## Part 3: Authentication Flow Testing

### Signup Flow

**Test Steps:**
1. Go to `/auth` page
2. Click "Sign up"
3. Enter email, password, business name
4. Submit form
5. Check email for confirmation (if enabled)
6. Verify profile created in database

**Expected Results:**
- ✅ User account created
- ✅ Profile automatically created (via trigger)
- ✅ Email confirmation sent (if enabled)
- ✅ User redirected to app after confirmation

**Test Checklist:**
- [ ] Signup works with valid email
- [ ] Signup validates email format
- [ ] Signup validates password strength
- [ ] Signup creates profile automatically
- [ ] Email confirmation works (if enabled)
- [ ] Invalid email shows error
- [ ] Weak password shows error
- [ ] Duplicate email shows error

### Login Flow

**Test Steps:**
1. Go to `/auth` page
2. Enter email and password
3. Click "Sign in"
4. Verify redirect to app
5. Check session persists

**Expected Results:**
- ✅ User authenticated successfully
- ✅ Session created and stored
- ✅ User redirected to home page
- ✅ Session persists on page refresh

**Test Checklist:**
- [ ] Login works with correct credentials
- [ ] Login fails with wrong password
- [ ] Login fails with non-existent email
- [ ] Session persists after refresh
- [ ] Session expires appropriately
- [ ] "Remember me" works (if implemented)

### Logout Flow

**Test Steps:**
1. While logged in, click "Sign out"
2. Verify session cleared
3. Verify redirect to auth page
4. Verify protected routes blocked

**Expected Results:**
- ✅ Session cleared
- ✅ User redirected to `/auth`
- ✅ Protected routes require login
- ✅ No access to user data after logout

**Test Checklist:**
- [ ] Logout clears session
- [ ] Logout redirects to auth page
- [ ] Protected routes blocked after logout
- [ ] Cannot access user data after logout

### Password Reset Flow

**Test Steps:**
1. Go to `/forgot-password` page
2. Enter email address
3. Submit form
4. Check email for reset link
5. Click reset link
6. Enter new password
7. Verify password changed

**Expected Results:**
- ✅ Reset email sent
- ✅ Reset link works
- ✅ Password can be changed
- ✅ Can login with new password

**Test Checklist:**
- [ ] Forgot password sends email
- [ ] Reset link works
- [ ] Password can be changed
- [ ] Old password no longer works
- [ ] Invalid reset link shows error
- [ ] Expired reset link shows error

---

## Part 4: CORS Configuration

### Current CORS Settings

**Edge Functions:** All use `Access-Control-Allow-Origin: '*'`

This allows requests from any origin. For production, consider restricting:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://solowipe.co.uk',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### CORS Security Checklist

- [ ] **Current:** CORS allows all origins (`*`)
- [ ] **Recommended:** Restrict to your domain(s)
- [ ] **Supabase:** CORS configured in Supabase Dashboard

### Supabase CORS Settings

1. Go to Supabase Dashboard → Settings → API
2. Check "CORS" settings
3. Add your domain: `https://solowipe.co.uk`
4. Remove `*` if present (for production)

### Edge Function CORS Update

**Files to update** (if restricting CORS):
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/check-subscription/index.ts`
- `supabase/functions/customer-portal/index.ts`
- `supabase/functions/gocardless-connect/index.ts`
- `supabase/functions/gocardless-callback/index.ts`
- `supabase/functions/gocardless-disconnect/index.ts`
- `supabase/functions/gocardless-create-mandate/index.ts`
- `supabase/functions/gocardless-collect-payment/index.ts`
- `supabase/functions/gocardless-webhook/index.ts`

**Note:** Webhook endpoints may need to allow GoCardless/Stripe origins.

---

## Part 5: HTTPS Enforcement

### Current HTTPS Setup

**Netlify Configuration:** ✅ HTTPS enforced

**File:** `netlify.toml`

```toml
# Force HTTPS redirects for all HTTP traffic
[[redirects]]
  from = "http://solowipe.co.uk/*"
  to = "https://solowipe.co.uk/:splat"
  status = 301
  force = true
```

### HTTPS Verification Checklist

- [ ] HTTP redirects to HTTPS ✅ (configured)
- [ ] SSL certificate valid
- [ ] No mixed content warnings
- [ ] All API calls use HTTPS
- [ ] Supabase connections use HTTPS ✅

### Test HTTPS Enforcement

1. **Try HTTP URL:**
   ```
   http://solowipe.co.uk
   ```
   Should redirect to HTTPS

2. **Check SSL Certificate:**
   - Visit: https://www.ssllabs.com/ssltest/
   - Enter: `solowipe.co.uk`
   - Verify grade A or better

3. **Check Mixed Content:**
   - Open browser console
   - Look for mixed content warnings
   - All resources should load over HTTPS

---

## Part 6: Exposed Secrets Audit

### Code Audit Results

**Status:** ✅ No hardcoded secrets found

**Verified:**
- ✅ Frontend uses `import.meta.env.VITE_*`
- ✅ Edge Functions use `Deno.env.get()`
- ✅ No API keys in client code
- ✅ No secrets in public files

### Remaining Checks

- [ ] **Console Logs:** Review for sensitive data
- [ ] **Error Messages:** Don't leak sensitive info
- [ ] **API Responses:** Don't expose internal details
- [ ] **Build Output:** No secrets in bundle

### Console Log Cleanup

**Found console.log/error statements** - Review for production:

**Files with console statements:**
- `src/hooks/useSupabaseData.tsx` - Error logging (OK)
- `src/hooks/useSubscription.tsx` - Debug logging (remove in prod)
- `src/components/DirectDebitSetupModal.tsx` - Debug logging (remove in prod)
- Various error handlers - Error logging (OK)

**Recommendation:**
- Keep `console.error` for error tracking
- Remove `console.log` debug statements for production
- Consider using environment-based logging

---

## Part 7: Error Message Security

### Current Error Handling

**Good Practices Found:**
- ✅ Generic error messages for users
- ✅ Detailed errors logged server-side
- ✅ No stack traces exposed to client
- ✅ No database errors exposed

### Error Message Review Checklist

- [ ] **Authentication Errors:**
  - ✅ Generic: "Invalid email or password"
  - ✅ No: "User not found" vs "Invalid password"

- [ ] **Database Errors:**
  - ✅ Generic: "An error occurred"
  - ✅ No: SQL errors or table names exposed

- [ ] **API Errors:**
  - ✅ Generic: "Request failed"
  - ✅ No: Internal API details exposed

- [ ] **Validation Errors:**
  - ✅ Specific: "Email is required"
  - ✅ No: Internal validation logic exposed

### Error Handling Best Practices

**Client-Side:**
```typescript
// Good: Generic error
catch (error) {
  toast.error('Failed to save. Please try again.');
  console.error('Save error:', error); // Log details server-side
}

// Bad: Expose details
catch (error) {
  toast.error(`Database error: ${error.message}`); // Don't expose!
}
```

**Server-Side:**
```typescript
// Good: Log details, return generic
catch (error) {
  console.error('Detailed error:', error);
  return { error: 'An error occurred' };
}
```

---

## Part 8: Rate Limiting

### Current Rate Limiting

**Supabase:** Built-in rate limiting ✅
- Authentication: Limited by Supabase
- API calls: Limited by Supabase
- Edge Functions: Limited by Supabase

### Additional Rate Limiting (Optional)

**Consider adding:**
- [ ] Login attempt limiting (prevent brute force)
- [ ] API endpoint rate limiting
- [ ] Webhook endpoint rate limiting

### Supabase Rate Limiting

**Authentication:**
- Supabase handles rate limiting automatically
- Configurable in Supabase Dashboard

**API Calls:**
- Rate limits based on plan
- Check Supabase Dashboard → Settings → Usage

**Edge Functions:**
- Limited by Supabase
- Check function logs for rate limit errors

### Manual Rate Limiting (If Needed)

If you need custom rate limiting:

1. **Use Supabase Edge Functions middleware**
2. **Implement in application code**
3. **Use third-party service** (Cloudflare, etc.)

---

## Part 9: Session Management

### Current Session Handling

**Session Storage:**
- ✅ Sessions stored securely by Supabase
- ✅ JWT tokens used for authentication
- ✅ Session validation on app load

### Session Security Checklist

- [ ] **Session Expiration:**
  - ✅ Sessions expire appropriately
  - ✅ Refresh tokens handled correctly

- [ ] **Session Validation:**
  - ✅ Profile existence checked
  - ✅ Invalid sessions logged out

- [ ] **Session Storage:**
  - ✅ No sensitive data in localStorage
  - ✅ Tokens stored securely by Supabase

### Session Security Best Practices

**Current Implementation:**
```typescript
// Validates session on app load
supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (session?.user) {
    // Validate profile exists
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      // Profile doesn't exist - sign out
      await supabase.auth.signOut();
    }
  }
});
```

✅ **Good:** Validates session and profile existence

---

## Security Checklist Summary

### Authentication & Authorization
- [ ] Signup flow tested
- [ ] Login flow tested
- [ ] Logout flow tested
- [ ] Password reset tested
- [ ] Session management verified
- [ ] RLS policies tested

### Secrets & Keys
- [ ] No hardcoded secrets ✅
- [ ] Keys stored securely ✅
- [ ] Key rotation plan documented
- [ ] Different keys for staging/prod

### Network Security
- [ ] HTTPS enforced ✅
- [ ] CORS configured appropriately
- [ ] SSL certificate valid
- [ ] No mixed content

### Error Handling
- [ ] Generic error messages
- [ ] No sensitive data exposed
- [ ] Detailed errors logged server-side
- [ ] Console logs reviewed

### Rate Limiting
- [ ] Supabase rate limiting enabled ✅
- [ ] Additional rate limiting (if needed)

---

## Next Steps

Once security audit is complete:

1. ✅ Fix any issues found
2. ✅ Document security procedures
3. ✅ Set up monitoring/alerts
4. ✅ Move to Phase 6: Testing & Quality Assurance

---

## Security Best Practices Summary

1. **Never expose secrets** - Use environment variables
2. **Enforce HTTPS** - Always use secure connections
3. **Validate input** - Sanitize user input
4. **Use RLS** - Row-level security for data isolation
5. **Generic errors** - Don't leak internal details
6. **Rate limiting** - Prevent abuse
7. **Regular audits** - Review security regularly
8. **Key rotation** - Rotate keys periodically
