# Phase 8: Staging Deployment Guide

## Overview
This phase deploys the application to a staging environment for final testing before production.

---

## Part 1: Pre-Deployment Preparation

### Checklist Before Deploying

- [ ] All Phase 1-7 tasks completed
- [ ] Code reviewed and tested locally
- [ ] No critical bugs found
- [ ] Environment variables documented
- [ ] Build succeeds locally
- [ ] All tests passing

### Verify Local Build

**Test build locally:**
```bash
# Clean previous builds
rm -rf dist

# Build for production
npm run build

# Test build output
npm run preview

# Verify build succeeds
# Check dist/ folder exists
# Check bundle sizes
```

**Expected Results:**
- ✅ Build completes without errors
- ✅ No TypeScript errors
- ✅ Bundle sizes acceptable
- ✅ Preview works correctly

---

## Part 2: Staging Environment Setup

### Option 1: Netlify Branch Deploys (Recommended)

**Advantages:**
- Automatic deployments from branch
- Preview URLs for each PR
- Easy to test before merging

**Setup Steps:**

1. **Create Staging Branch**
   ```bash
   git checkout -b staging
   git push origin staging
   ```

2. **Configure Netlify Branch Deploys**
   - Go to Netlify Dashboard → Site settings → Build & deploy
   - Under "Branch deploys", enable:
     - ✅ Deploy only the production branch (uncheck if you want staging)
     - Or: Add `staging` branch to deploy

3. **Set Branch-Specific Environment Variables**
   - Go to Site settings → Environment variables
   - Add variables for "Branch deploys" or "Deploy previews"
   - Use same values as production (or test values)

### Option 2: Separate Staging Site

**Advantages:**
- Completely separate environment
- Different domain
- Can use test API keys

**Setup Steps:**

1. **Create New Netlify Site**
   - Go to Netlify Dashboard
   - Click "Add new site" → "Import an existing project"
   - Connect to same repository
   - Use branch: `staging` or `main`

2. **Configure Staging Site**
   - Site name: `solowipe-staging` (or similar)
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add all required variables
   - Use test/sandbox keys for payments

---

## Part 3: Environment Variables for Staging

### Frontend Variables (Netlify)

**Required Variables:**
```
VITE_SUPABASE_URL = https://owqjyaiptexqwafzmcwy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF
VITE_SUPABASE_PROJECT_ID = owqjyaiptexqwafzmcwy
```

**Setup:**
1. Go to Netlify Dashboard → Site settings → Environment variables
2. Add variables for "Deploy previews" or "Branch deploys"
3. Use same values as production (or test values)

### Supabase Edge Functions Secrets

**Use Same Secrets** (or create test secrets):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` (use test key: `sk_test_...`)
- `GOCARDLESS_CLIENT_ID`
- `GOCARDLESS_CLIENT_SECRET`
- `GOCARDLESS_ENVIRONMENT` = `sandbox` (for testing)
- `GOCARDLESS_WEBHOOK_SECRET`

**Note:** Use test/sandbox keys for payment providers in staging

---

## Part 4: Deployment Steps

### Step 1: Create Staging Branch

```bash
# Create and switch to staging branch
git checkout -b staging

# Push to remote
git push origin staging
```

### Step 2: Configure Netlify

**For Branch Deploys:**
1. Go to Netlify Dashboard → Site settings → Build & deploy
2. Under "Branch deploys":
   - Enable "Deploy only the production branch" (uncheck)
   - Or add `staging` to deploy list

**For Separate Site:**
1. Create new site (if using Option 2)
2. Connect to repository
3. Set branch to `staging`

### Step 3: Set Environment Variables

1. Go to Site settings → Environment variables
2. Add variables for staging environment:
   - Select scope: "Deploy previews" or "Branch deploys"
   - Add all required variables
   - Use test keys for payments

### Step 4: Deploy

**Automatic (Recommended):**
- Push to `staging` branch
- Netlify automatically builds and deploys
- Get deployment URL from Netlify Dashboard

**Manual:**
1. Go to Netlify Dashboard → Deploys
2. Click "Trigger deploy" → "Deploy site"
3. Select branch: `staging`
4. Monitor build logs

### Step 5: Monitor Deployment

**Watch Build Logs:**
1. Go to Netlify Dashboard → Deploys
2. Click on latest deploy
3. Watch build logs for errors
4. Verify build succeeds

**Common Issues:**
- Environment variables not set
- Build command fails
- Dependencies missing
- TypeScript errors

---

## Part 5: Post-Deployment Verification

### Quick Verification Checklist

- [ ] **Build Succeeded**
  - Check Netlify deploy logs
  - No build errors
  - Build completed successfully

- [ ] **Site Accessible**
  - Visit staging URL
  - Site loads correctly
  - No white screen

- [ ] **Environment Variables Loaded**
  - Open browser console
  - Check for Supabase connection
  - No "undefined" errors

- [ ] **Database Connection**
  - Try logging in
  - Database queries work
  - No connection errors

### Detailed Testing

#### 1. Authentication Flow
- [ ] Signup works
- [ ] Login works
- [ ] Logout works
- [ ] Session persists

#### 2. Core Features
- [ ] Create customer
- [ ] Create job
- [ ] Complete job
- [ ] View calendar
- [ ] View earnings

#### 3. Payment Integrations
- [ ] Stripe checkout (test mode)
- [ ] GoCardless connection (sandbox)
- [ ] Payment flows work

#### 4. Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

#### 5. Mobile Testing
- [ ] iPhone
- [ ] Android
- [ ] Tablet

---

## Part 6: Staging Testing Checklist

### Functional Testing

**Customer Management:**
- [ ] Create customer
- [ ] Update customer
- [ ] Archive customer
- [ ] View customer details
- [ ] Search/filter customers

**Job Management:**
- [ ] Create job
- [ ] Complete job
- [ ] Reschedule job
- [ ] Skip job
- [ ] Mark job as paid
- [ ] Upload job photo

**Other Features:**
- [ ] Calendar navigation
- [ ] Earnings dashboard
- [ ] Settings page
- [ ] Data export
- [ ] GoCardless connection
- [ ] Subscription management

### Performance Testing

- [ ] Page load times acceptable
- [ ] No console errors
- [ ] Bundle loads correctly
- [ ] Images load correctly
- [ ] API calls work

### Security Testing

- [ ] HTTPS enforced
- [ ] No secrets exposed
- [ ] Authentication works
- [ ] RLS policies enforced
- [ ] CORS configured correctly

---

## Part 7: Staging vs Production Differences

### Staging Environment

**Use Test/Sandbox Keys:**
- Stripe: `sk_test_...` (test mode)
- GoCardless: `sandbox` environment
- Test transactions only

**Same as Production:**
- Supabase project (can use same or separate)
- Database structure
- Code (should be identical)

### Production Environment

**Use Live Keys:**
- Stripe: `sk_live_...` (live mode)
- GoCardless: `live` environment
- Real transactions

**Differences:**
- Domain: `solowipe.co.uk`
- SSL certificate
- Production environment variables

---

## Part 8: Troubleshooting Staging Issues

### Common Issues

#### Issue: Build Fails
**Symptoms:** Build errors in Netlify logs

**Solutions:**
- Check build logs for specific errors
- Verify `package.json` dependencies
- Check Node version compatibility
- Verify build command: `npm run build`

#### Issue: White Screen
**Symptoms:** Site loads but shows white screen

**Solutions:**
- Check browser console for errors
- Verify environment variables are set
- Check Supabase connection
- Verify build output exists

#### Issue: Environment Variables Not Loading
**Symptoms:** `undefined` values in console

**Solutions:**
- Verify variables set for correct environment
- Check variable names (must start with `VITE_`)
- Redeploy after adding variables
- Clear browser cache

#### Issue: Database Connection Fails
**Symptoms:** Cannot login, database errors

**Solutions:**
- Verify Supabase URL is correct
- Check Supabase project is active
- Verify RLS policies are set
- Check network/firewall

#### Issue: Payment Flows Don't Work
**Symptoms:** Stripe/GoCardless errors

**Solutions:**
- Verify test keys are set (staging)
- Check payment provider dashboards
- Verify webhook URLs
- Check function logs

---

## Part 9: Staging Approval Process

### Before Moving to Production

**Staging Must Pass:**
- [ ] All features working
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Payment flows tested (test mode)

### Sign-Off Checklist

- [ ] **Functional:** All features work correctly
- [ ] **Performance:** Load times acceptable
- [ ] **Security:** No vulnerabilities found
- [ ] **Compatibility:** Works in all browsers
- [ ] **Mobile:** Works on mobile devices
- [ ] **Payments:** Test transactions work
- [ ] **Data:** No data loss issues

### Approval Sign-Off

**Date:** _______________
**Approved by:** _______________
**Notes:** _______________

---

## Part 10: Rollback Plan

### If Staging Deployment Fails

**Option 1: Fix and Redeploy**
1. Fix issues found
2. Commit changes
3. Push to staging branch
4. Redeploy

**Option 2: Rollback to Previous Version**
1. Go to Netlify Dashboard → Deploys
2. Find last working deploy
3. Click "Publish deploy"
4. Restore previous version

**Option 3: Revert Code**
```bash
# Revert to previous commit
git revert HEAD
git push origin staging
```

---

## Staging Deployment Checklist

### Pre-Deployment
- [ ] Code reviewed
- [ ] Build tested locally
- [ ] Environment variables documented
- [ ] Staging branch created

### Deployment
- [ ] Netlify configured
- [ ] Environment variables set
- [ ] Build succeeds
- [ ] Deployment URL obtained

### Post-Deployment
- [ ] Site accessible
- [ ] Environment variables loaded
- [ ] Database connection works
- [ ] All features tested
- [ ] No critical bugs found

### Approval
- [ ] Functional testing passed
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Ready for production

---

## Next Steps

Once staging is approved:

1. ✅ Document any issues found
2. ✅ Fix any problems
3. ✅ Get final approval
4. ✅ Move to Phase 9: Production Deployment

---

## Quick Reference

### Staging URLs
- **Netlify:** https://app.netlify.com/
- **Staging Site:** (Your staging URL)
- **Supabase:** https://app.supabase.com/project/owqjyaiptexqwafzmcwy

### Commands
```bash
# Create staging branch
git checkout -b staging
git push origin staging

# Test build locally
npm run build
npm run preview

# Deploy (automatic via Netlify)
# Or manual: Trigger deploy in Netlify Dashboard
```

### Environment Variables
- Use test keys for Stripe (`sk_test_...`)
- Use sandbox for GoCardless (`GOCARDLESS_ENVIRONMENT=sandbox`)
- Same Supabase project (or separate test project)
