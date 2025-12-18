# Phase 5: Security & Authentication - Quick Checklist

## 🔐 Security Audit Checklist

### 1. Key Management (15 minutes)
- [ ] Review Supabase keys (no rotation needed if secure)
- [ ] Verify service_role key never exposed to client ✅
- [ ] Document key rotation procedure
- [ ] Verify different keys for staging/production

### 2. RLS Policy Verification (20 minutes)
- [ ] Run `phase2_test_rls_policies.sql` in Supabase
- [ ] Test as different users (should be isolated)
- [ ] Verify users can't see other users' data
- [ ] Verify users can't insert data for other users

### 3. Authentication Testing (30 minutes)
- [ ] **Signup:**
  - [ ] Test signup flow
  - [ ] Verify profile created automatically
  - [ ] Test email confirmation (if enabled)
  
- [ ] **Login:**
  - [ ] Test login with correct credentials
  - [ ] Test login with wrong password
  - [ ] Verify session persists
  
- [ ] **Logout:**
  - [ ] Test logout clears session
  - [ ] Verify protected routes blocked after logout
  
- [ ] **Password Reset:**
  - [ ] Test forgot password flow
  - [ ] Test reset link works
  - [ ] Verify password changes

### 4. CORS Configuration (10 minutes)
- [ ] Review CORS settings in Supabase Dashboard
- [ ] Consider restricting Edge Function CORS (currently `*`)
- [ ] Add your domain to Supabase CORS whitelist

### 5. HTTPS Verification (5 minutes)
- [ ] Test HTTP redirects to HTTPS ✅
- [ ] Check SSL certificate validity
- [ ] Verify no mixed content warnings

### 6. Secrets Audit (10 minutes)
- [ ] Verify no hardcoded secrets ✅ (Already done)
- [ ] Review console.log statements
- [ ] Remove debug logs for production

### 7. Error Messages (10 minutes)
- [ ] Review error messages
- [ ] Verify no sensitive data exposed
- [ ] Ensure generic user-facing errors

### 8. Rate Limiting (5 minutes)
- [ ] Verify Supabase rate limiting enabled ✅
- [ ] Check rate limits in Supabase Dashboard
- [ ] Add custom rate limiting if needed

---

## ✅ Current Security Status

### Already Secure ✅
- ✅ No hardcoded secrets
- ✅ HTTPS enforced via Netlify
- ✅ RLS policies configured
- ✅ Session validation implemented
- ✅ Service role key never exposed

### Needs Review ⚠️
- ⚠️ CORS allows all origins (`*`) - Consider restricting
- ⚠️ Console.log statements - Remove for production
- ⚠️ Error messages - Review for sensitive data

---

## 🔧 Quick Fixes

### 1. Restrict CORS (Optional)
Update Edge Functions to restrict CORS:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://solowipe.co.uk',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Note:** Webhook endpoints may need to allow payment provider origins.

### 2. Remove Debug Logs (Optional)
Remove or conditionally log:

```typescript
// Remove in production
if (import.meta.env.DEV) {
  console.log('Debug info');
}
```

### 3. Supabase CORS Settings
1. Go to Supabase Dashboard → Settings → API
2. Add `https://solowipe.co.uk` to CORS whitelist
3. Remove `*` if present

---

## 🧪 Testing Scenarios

### Test User Isolation
1. Create two test accounts
2. As User A, try to access User B's data
3. Should return empty/error

### Test Authentication
1. Try login with wrong password
2. Should show generic error
3. Should not reveal if email exists

### Test Session Security
1. Logout
2. Try to access protected route
3. Should redirect to login

---

## 📋 Security Best Practices

1. ✅ **Never expose secrets** - Use env vars
2. ✅ **Enforce HTTPS** - Always secure
3. ✅ **Use RLS** - Data isolation
4. ✅ **Generic errors** - Don't leak info
5. ✅ **Validate input** - Sanitize data
6. ✅ **Rate limiting** - Prevent abuse
7. ✅ **Regular audits** - Review security

---

## 🔗 Quick Links

- **Supabase Dashboard**: https://app.supabase.com/project/owqjyaiptexqwafzmcwy
- **Supabase API Settings**: Settings → API
- **Supabase CORS**: Settings → API → CORS
- **SSL Test**: https://www.ssllabs.com/ssltest/

---

## Next Steps

1. ✅ Complete security audit checklist
2. ✅ Fix any issues found
3. ✅ Document security procedures
4. ✅ Move to Phase 6: Testing & Quality Assurance
