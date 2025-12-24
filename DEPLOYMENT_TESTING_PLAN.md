# Deployment Testing Plan
**Date:** December 23, 2025
**Status:** Ready for Testing

---

## Overview

This document outlines the comprehensive testing plan for deploying the security fixes to production. All critical security improvements have been implemented and verified.

---

## Pre-Deployment Checklist

### ✅ Build Verification
- [x] Application builds successfully (`npm run build`)
- [x] Build output exists in `dist/` directory
- [x] No TypeScript compilation errors
- [x] No critical linting errors (pre-existing warnings only)

### ✅ Security Fixes Verification
- [x] Stage 1: Dependency vulnerabilities fixed (2/4)
- [x] Stage 2: CORS configuration updated (8 functions)
- [x] Stage 3: Environment variable validation added (8 functions)

### ✅ Code Quality
- [x] All Edge Functions have valid syntax
- [x] All imports resolve correctly
- [x] Shared utilities are properly referenced

---

## Deployment Components

### 1. Frontend (Netlify)
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Configuration:** `netlify.toml`

### 2. Edge Functions (Supabase)
- **Total Functions:** 13
- **Functions Updated:** 8 (CORS + env validation)
- **Functions Unchanged:** 5 (already secure)

---

## Environment Variables Required

### Netlify Environment Variables
```bash
VITE_SUPABASE_URL=https://owqjyaiptexqwafzmcwy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=owqjyaiptexqwafzmcwy
```

### Supabase Edge Function Secrets
```bash
# Required for all functions
SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_URL=https://owqjyaiptexqwafzmcwy.supabase.co
SUPABASE_ANON_KEY=<anon-key>

# Stripe functions
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>

# GoCardless functions
GOCARDLESS_CLIENT_ID=<gocardless-client-id>
GOCARDLESS_CLIENT_SECRET=<gocardless-client-secret>
GOCARDLESS_ENVIRONMENT=sandbox (or live)
GOCARDLESS_WEBHOOK_SECRET=<gocardless-webhook-secret>

# Optional: Custom CORS origins
ALLOWED_ORIGINS=https://solowipe.co.uk,https://www.solowipe.co.uk
```

---

## Edge Functions Deployment Order

### Priority 1: Core Payment Functions
1. `create-checkout` - Stripe checkout
2. `check-subscription` - Subscription status
3. `customer-portal` - Stripe customer portal

### Priority 2: GoCardless Functions
4. `gocardless-connect` - OAuth connection
5. `gocardless-callback` - OAuth callback
6. `gocardless-create-mandate` - Create mandate
7. `gocardless-check-mandate` - Check mandate status
8. `gocardless-collect-payment` - Collect payment
9. `gocardless-disconnect` - Disconnect account

### Priority 3: Webhook Functions
10. `stripe-webhook` - Stripe webhooks
11. `gocardless-webhook` - GoCardless webhooks

### Priority 4: Utility Functions
12. `delete-account` - Account deletion
13. `gocardless-sync-payment` - Payment sync (if used)

---

## Deployment Testing Steps

### Phase 1: Pre-Deployment Verification

#### 1.1 Build Test
```bash
# Clean build
rm -rf dist node_modules/.vite
npm install
npm run build

# Verify output
ls -la dist/
# Should see: index.html, assets/, manifest.webmanifest, sw.js
```

**Expected Result:** ✅ Build completes without errors

#### 1.2 Local Preview Test
```bash
npm run preview
# Open http://localhost:4173
```

**Test Checklist:**
- [ ] App loads without white screen
- [ ] No console errors
- [ ] Supabase connection works
- [ ] All routes accessible

**Expected Result:** ✅ App loads and functions correctly

#### 1.3 Edge Functions Syntax Check
```bash
# Verify all functions have valid imports
grep -r "import.*cors" supabase/functions/
grep -r "getCorsHeaders" supabase/functions/
```

**Expected Result:** ✅ All 8 updated functions import CORS correctly

---

### Phase 2: Supabase Edge Functions Deployment

#### 2.1 Deploy via Supabase Dashboard (Recommended)

**For each function (in priority order):**

1. **Navigate to Supabase Dashboard**
   - Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/edge-functions
   - Select function from list

2. **Update Function Code**
   - Click "Edit" or "View Code"
   - Copy code from local file: `supabase/functions/{function-name}/index.ts`
   - Paste into Supabase editor
   - Click "Deploy" or "Save"

3. **Verify Deployment**
   - Status should show "Active" or "Deployed"
   - Check logs for any errors

#### 2.2 Deploy via CLI (Alternative)

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref owqjyaiptexqwafzmcwy

# Deploy each function
supabase functions deploy create-checkout
supabase functions deploy check-subscription
supabase functions deploy customer-portal
supabase functions deploy gocardless-connect
supabase functions deploy gocardless-callback
supabase functions deploy gocardless-create-mandate
supabase functions deploy gocardless-check-mandate
supabase functions deploy gocardless-collect-payment
supabase functions deploy gocardless-disconnect
supabase functions deploy stripe-webhook
supabase functions deploy gocardless-webhook
supabase functions deploy delete-account
```

#### 2.3 Verify Secrets Are Set

**In Supabase Dashboard:**
- Go to: Project Settings → Edge Functions → Secrets
- Verify all required secrets are present (see Environment Variables section above)

**Test Missing Secret Handling:**
- Temporarily remove one secret
- Function should return 500 error with "Server configuration error"
- Restore secret
- Function should work again

---

### Phase 3: Netlify Frontend Deployment

#### 3.1 Deploy via Git Push (Recommended)

```bash
# Commit changes
git add .
git commit -m "Security fixes: CORS + env validation + dependency updates"
git push origin main

# Monitor Netlify build
# Go to: Netlify Dashboard → Deploys
```

#### 3.2 Deploy via Netlify CLI (Alternative)

```bash
# Install Netlify CLI if not installed
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

#### 3.3 Verify Environment Variables

**In Netlify Dashboard:**
- Go to: Site Settings → Environment Variables
- Verify all `VITE_*` variables are set
- Test with missing variable (should show error in ErrorBoundary)

---

### Phase 4: Post-Deployment Testing

#### 4.1 Frontend Tests

**Basic Functionality:**
- [ ] App loads at production URL
- [ ] No white screen
- [ ] Authentication works (signup/login)
- [ ] Navigation works
- [ ] All pages load correctly

**CORS Testing:**
- [ ] Test from production domain (should work)
- [ ] Test from unauthorized domain (should be blocked)
- [ ] Check browser console for CORS errors

**Error Handling:**
- [ ] Test with missing env vars (should show error message)
- [ ] Test with invalid credentials (should show error)
- [ ] ErrorBoundary displays helpful messages

#### 4.2 Edge Function Tests

**Stripe Functions:**
- [ ] `create-checkout` - Create subscription checkout
- [ ] `check-subscription` - Check subscription status
- [ ] `customer-portal` - Access customer portal
- [ ] `stripe-webhook` - Webhook receives events

**GoCardless Functions:**
- [ ] `gocardless-connect` - Connect GoCardless account
- [ ] `gocardless-callback` - OAuth callback works
- [ ] `gocardless-create-mandate` - Create mandate
- [ ] `gocardless-check-mandate` - Check mandate status
- [ ] `gocardless-collect-payment` - Collect payment
- [ ] `gocardless-disconnect` - Disconnect account
- [ ] `gocardless-webhook` - Webhook receives events

**Utility Functions:**
- [ ] `delete-account` - Delete user account

#### 4.3 Security Tests

**CORS Validation:**
```bash
# Test from allowed origin (should work)
curl -H "Origin: https://solowipe.co.uk" \
  -H "Authorization: Bearer <token>" \
  https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/create-checkout

# Test from unauthorized origin (should be blocked or use default origin)
curl -H "Origin: https://evil.com" \
  -H "Authorization: Bearer <token>" \
  https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/create-checkout
```

**Environment Variable Validation:**
- [ ] Remove `SERVICE_ROLE_KEY` temporarily
- [ ] Function should return 500 error
- [ ] Error message should be "Server configuration error"
- [ ] Restore secret
- [ ] Function should work again

#### 4.4 Performance Tests

- [ ] Page load time < 3 seconds
- [ ] API response times < 1 second
- [ ] No memory leaks in browser console
- [ ] Service worker caches correctly

---

## Rollback Plan

### If Deployment Fails

#### Frontend Rollback
1. **Via Netlify Dashboard:**
   - Go to Deploys
   - Find last working deploy
   - Click "Publish deploy"

2. **Via Git:**
   ```bash
   git revert HEAD
   git push origin main
   ```

#### Edge Functions Rollback
1. **Via Supabase Dashboard:**
   - Go to Edge Functions
   - Select function
   - View deployment history
   - Revert to previous version

2. **Via CLI:**
   ```bash
   # Deploy previous version from git
   git checkout <previous-commit>
   supabase functions deploy <function-name>
   ```

---

## Monitoring Checklist

### Post-Deployment (First 24 Hours)

- [ ] Monitor Netlify build logs
- [ ] Monitor Supabase Edge Function logs
- [ ] Check error tracking (if configured)
- [ ] Monitor user reports
- [ ] Check browser console for errors
- [ ] Verify payment flows work
- [ ] Test on multiple browsers/devices

### Ongoing Monitoring

- [ ] Weekly security audit
- [ ] Monthly dependency updates
- [ ] Quarterly full security review

---

## Success Criteria

### ✅ Deployment Successful If:
- All functions deploy without errors
- Frontend builds and deploys successfully
- All tests pass
- No CORS errors in production
- Payment flows work correctly
- Error handling works as expected

### ⚠️ Issues to Watch For:
- CORS errors from unauthorized origins
- Missing environment variable errors
- Payment flow failures
- Authentication issues
- Performance degradation

---

## Testing Scripts

### Quick Test Script
```bash
#!/bin/bash
# quick-deployment-test.sh

echo "Testing build..."
npm run build || exit 1

echo "Testing preview..."
npm run preview &
PREVIEW_PID=$!
sleep 5
curl -s http://localhost:4173 > /dev/null && echo "✅ Preview works" || echo "❌ Preview failed"
kill $PREVIEW_PID

echo "Checking Edge Functions..."
for func in create-checkout check-subscription customer-portal; do
  if grep -q "getCorsHeaders" "supabase/functions/$func/index.ts"; then
    echo "✅ $func has CORS"
  else
    echo "❌ $func missing CORS"
  fi
done

echo "Deployment test complete!"
```

---

## Support & Troubleshooting

### Common Issues

**Issue:** CORS errors after deployment
- **Solution:** Verify function uses `getCorsHeaders(req)` and origin is in allowed list

**Issue:** "Server configuration error"
- **Solution:** Check Supabase Edge Function secrets are set correctly

**Issue:** White screen after deployment
- **Solution:** Check Netlify environment variables, clear browser cache

**Issue:** Function returns 500 error
- **Solution:** Check Supabase function logs, verify secrets are set

### Getting Help

1. Check Supabase Edge Function logs
2. Check Netlify build logs
3. Check browser console for errors
4. Review `SECURITY_FIXES_COMPLETED.md` for changes made
5. Review `SECURITY_CHECK_REPORT.md` for security context

---

## Next Steps After Successful Deployment

1. ✅ Monitor for 24-48 hours
2. ✅ Document any issues found
3. ✅ Update deployment documentation
4. ✅ Schedule next security audit (3 months)
5. ✅ Consider upgrading Vite to fix remaining dev vulnerabilities

---

**Document Version:** 1.0
**Last Updated:** December 23, 2025
**Status:** Ready for Deployment

