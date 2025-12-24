# Phase 9: Production Deployment Guide

## Overview
This is the final phase - deploying your application to production and going live!

---

## Part 1: Pre-Launch Checklist

### Critical Requirements

**Before deploying to production, ensure:**

- [ ] **All Phases 1-8 completed**
  - Phase 1: Code completion ✅
  - Phase 2: Database setup ✅
  - Phase 3: Environment configuration ✅
  - Phase 4: Payment integrations ✅
  - Phase 5: Security hardening ✅
  - Phase 6: Testing ✅
  - Phase 7: Performance optimization ✅
  - Phase 8: Staging deployment ✅

- [ ] **Staging approved**
  - All features tested
  - No critical bugs
  - Performance acceptable
  - Security verified

- [ ] **Production environment ready**
  - Domain configured
  - SSL certificate ready
  - Environment variables set
  - Payment integrations switched to live

- [ ] **Backup strategy in place**
  - Database backup configured
  - Code in version control
  - Rollback plan documented

---

## Part 2: Domain Configuration

### Current Domain Setup

**Domain:** `solowipe.co.uk`

**Netlify Configuration:** Already configured in `netlify.toml`

```toml
# Force HTTPS redirects
[[redirects]]
  from = "http://solowipe.co.uk/*"
  to = "https://solowipe.co.uk/:splat"
  status = 301
  force = true

# Redirect www to non-www
[[redirects]]
  from = "https://www.solowipe.co.uk/*"
  to = "https://solowipe.co.uk/:splat"
  status = 301
  force = true
```

### Domain Setup Steps

#### Step 1: Add Domain in Netlify

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com/
   - Select your site

2. **Add Custom Domain**
   - Go to: **Site settings** → **Domain management**
   - Click **"Add custom domain"**
   - Enter: `solowipe.co.uk`
   - Click **"Verify"**

3. **Configure Domain**
   - Netlify will provide DNS records
   - Follow DNS configuration steps below

#### Step 2: Configure DNS Records

**Netlify DNS Records:**
- **A Record:** Netlify IP (if using A record)
- **CNAME:** Your Netlify site URL (recommended)

**DNS Configuration:**

**Option 1: CNAME (Recommended)**
```
Type: CNAME
Name: @ (or solowipe.co.uk)
Value: your-site-name.netlify.app
TTL: 3600
```

**Option 2: A Record**
```
Type: A
Name: @ (or solowipe.co.uk)
Value: [Netlify IP addresses]
TTL: 3600
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: your-site-name.netlify.app
TTL: 3600
```

#### Step 3: Verify DNS Propagation

**Check DNS propagation:**
```bash
# Check DNS records
dig solowipe.co.uk
nslookup solowipe.co.uk

# Or use online tools:
# https://www.whatsmydns.net/
# https://dnschecker.org/
```

**Wait for propagation:**
- DNS changes can take 24-48 hours
- Usually propagates within 1-2 hours
- Check periodically until complete

#### Step 4: SSL Certificate

**Netlify SSL:**
- Netlify automatically provisions SSL certificates via Let's Encrypt
- Certificate issues automatically after DNS propagates
- Usually takes 5-10 minutes after DNS is correct

**Verify SSL:**
1. Visit: https://solowipe.co.uk
2. Check browser shows padlock icon
3. Verify certificate is valid
4. Test: https://www.ssllabs.com/ssltest/

---

## Part 3: Production Environment Variables

### Frontend Variables (Netlify)

**Required Variables for Production:**

```
VITE_SUPABASE_URL = https://owqjyaiptexqwafzmcwy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF
VITE_SUPABASE_PROJECT_ID = owqjyaiptexqwafzmcwy
```

**Setup Steps:**
1. Go to Netlify Dashboard → Site settings → Environment variables
2. Ensure variables are set for **"Production"** environment
3. Verify values are correct
4. Double-check no test values

### Supabase Edge Functions Secrets

**Switch to Live Keys:**

**Stripe:**
- Change `STRIPE_SECRET_KEY` from `sk_test_...` to `sk_live_...`
- Get live key from: https://dashboard.stripe.com/apikeys

**GoCardless:**
- Change `GOCARDLESS_ENVIRONMENT` from `sandbox` to `live`
- Use live credentials from: https://manage.gocardless.com/

**Other Secrets (keep same):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOCARDLESS_CLIENT_ID`
- `GOCARDLESS_CLIENT_SECRET`
- `GOCARDLESS_WEBHOOK_SECRET`

**Setup Steps:**
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Update `STRIPE_SECRET_KEY` to live key
3. Update `GOCARDLESS_ENVIRONMENT` to `live`
4. Update GoCardless credentials to live (if different)
5. Verify all secrets are set

---

## Part 4: Payment Integrations - Live Mode

### Stripe Live Mode

#### Switch to Live Keys

1. **Get Live API Keys**
   - Go to: https://dashboard.stripe.com/apikeys
   - Toggle from "Test mode" to "Live mode"
   - Copy **Secret key** (`sk_live_...`)
   - Copy **Publishable key** (if needed)

2. **Update Supabase Secret**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Update `STRIPE_SECRET_KEY` = `sk_live_...`
   - Save secret

3. **Update Webhook Endpoint**
   - Go to: https://dashboard.stripe.com/webhooks
   - Update webhook URL to production:
     ```
     https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/check-subscription
     ```
   - Use live webhook signing secret

4. **Test Live Mode**
   - Use real test card: `4242 4242 4242 4242` (still works in live mode for testing)
   - Or use real card with small amount
   - Verify payment processes

### GoCardless Live Mode

#### Switch to Live Environment

1. **Get Live Credentials**
   - Go to: https://manage.gocardless.com/
   - Switch from "Sandbox" to "Live"
   - Copy **Client ID** and **Client Secret**
   - Get **Webhook Secret**

2. **Update Supabase Secrets**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Update `GOCARDLESS_CLIENT_ID` = Live client ID
   - Update `GOCARDLESS_CLIENT_SECRET` = Live client secret
   - Update `GOCARDLESS_ENVIRONMENT` = `live`
   - Update `GOCARDLESS_WEBHOOK_SECRET` = Live webhook secret

3. **Update Webhook Endpoint**
   - Go to: https://manage.gocardless.com/webhooks
   - Update webhook URL to production:
     ```
     https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook
     ```
   - Use live webhook secret

4. **Test Live Mode**
   - Connect GoCardless account (live)
   - Create test mandate
   - Verify webhook receives events

---

## Part 5: Final Code Review

### Pre-Deployment Code Check

**Review Checklist:**

- [ ] **No Debug Code**
  - Remove `console.log` statements
  - Remove test/debug code
  - Remove commented code

- [ ] **No Test Data**
  - Remove test customers/jobs
  - Remove test API keys
  - Clean up test data

- [ ] **Error Handling**
  - All errors handled gracefully
  - User-friendly error messages
  - No stack traces exposed

- [ ] **Security**
  - No secrets in code
  - All environment variables set
  - RLS policies verified

- [ ] **Performance**
  - Bundle size acceptable
  - Images optimized
  - Database indexes created

### Final Build Test

```bash
# Clean build
rm -rf dist node_modules/.vite

# Install dependencies
npm install

# Build for production
npm run build

# Verify build succeeds
# Check dist/ folder
# Check bundle sizes
# Test preview: npm run preview
```

---

## Part 6: Production Deployment

### Deployment Steps

#### Step 1: Final Code Commit

```bash
# Ensure all changes committed
git status

# Commit any final changes
git add .
git commit -m "Production deployment - final changes"

# Push to main branch
git push origin main
```

#### Step 2: Deploy to Production

**Option 1: Automatic (Recommended)**
- Push to `main` branch
- Netlify automatically builds and deploys
- Monitor deployment in Netlify Dashboard

**Option 2: Manual**
1. Go to Netlify Dashboard → Deploys
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Select branch: `main`
4. Monitor build logs

#### Step 3: Monitor Deployment

**Watch Build Logs:**
1. Go to Netlify Dashboard → Deploys
2. Click on latest deploy
3. Watch build logs
4. Verify build succeeds
5. Check for any warnings

**Common Issues:**
- Environment variables missing
- Build command fails
- Dependencies issues
- TypeScript errors

#### Step 4: Verify Deployment

**Check Deployment Status:**
- ✅ Build succeeded
- ✅ Site deployed
- ✅ Domain accessible
- ✅ SSL certificate valid

---

## Part 7: Post-Deployment Verification

### Immediate Checks (5 minutes)

#### 1. Site Accessibility
- [ ] Visit: https://solowipe.co.uk
- [ ] Site loads correctly
- [ ] No white screen
- [ ] HTTPS working (padlock icon)

#### 2. Environment Variables
- [ ] Open browser console
- [ ] Check for Supabase connection
- [ ] No "undefined" errors
- [ ] Variables loaded correctly

#### 3. Database Connection
- [ ] Try logging in
- [ ] Database queries work
- [ ] No connection errors

#### 4. SSL Certificate
- [ ] Visit: https://solowipe.co.uk
- [ ] Browser shows padlock
- [ ] Certificate valid
- [ ] No mixed content warnings

### Critical Feature Testing (30 minutes)

#### Authentication
- [ ] Signup works
- [ ] Login works
- [ ] Logout works
- [ ] Session persists

#### Core Features
- [ ] Create customer
- [ ] Create job
- [ ] Complete job
- [ ] View calendar
- [ ] View earnings

#### Payment Integrations
- [ ] Stripe checkout (test with real card - small amount)
- [ ] GoCardless connection (live)
- [ ] Payment flows work

### Full Testing (1-2 hours)

**Complete test plan:**
- Use `phase8_staging_test_plan.md` as reference
- Test all features
- Test cross-browser
- Test mobile
- Test performance

---

## Part 8: Domain & DNS Verification

### DNS Verification Checklist

- [ ] **DNS Records Configured**
  - A record or CNAME set
  - www subdomain configured
  - DNS propagated (check with dnschecker.org)

- [ ] **Domain Points to Netlify**
  - Visit: https://solowipe.co.uk
  - Site loads from Netlify
  - Not showing default page

- [ ] **SSL Certificate Issued**
  - Certificate issued by Let's Encrypt
  - Valid for solowipe.co.uk
  - Expires in future (auto-renewed)

- [ ] **HTTPS Redirects Work**
  - HTTP redirects to HTTPS ✅ (configured in netlify.toml)
  - www redirects to non-www ✅ (configured in netlify.toml)
  - All redirects work correctly

### Test Domain Configuration

**Test URLs:**
- ✅ https://solowipe.co.uk (should work)
- ✅ http://solowipe.co.uk (should redirect to HTTPS)
- ✅ https://www.solowipe.co.uk (should redirect to non-www)
- ✅ http://www.solowipe.co.uk (should redirect to HTTPS non-www)

**All should work correctly!**

---

## Part 9: Monitoring & Alerts Setup

### Set Up Monitoring

#### 1. Error Tracking

**Options:**
- **Sentry** - Error tracking and performance
- **LogRocket** - Session replay and errors
- **Rollbar** - Error tracking
- **Custom** - Error logging

**Quick Setup (Sentry example):**
```bash
npm install @sentry/react
```

```typescript
// In main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
});
```

#### 2. Analytics

**Options:**
- **Google Analytics** - Web analytics
- **Plausible** - Privacy-friendly analytics
- **Mixpanel** - Product analytics
- **Custom** - Custom tracking

**Quick Setup (Google Analytics):**
- Add tracking code to `index.html`
- Set up goals and events
- Monitor user behavior

#### 3. Uptime Monitoring

**Options:**
- **UptimeRobot** - Free uptime monitoring
- **Pingdom** - Uptime and performance
- **StatusCake** - Uptime monitoring
- **Netlify Status** - Built-in monitoring

**Quick Setup (UptimeRobot):**
1. Sign up: https://uptimerobot.com/
2. Add monitor:
   - URL: https://solowipe.co.uk
   - Type: HTTP(s)
   - Interval: 5 minutes
3. Set up alerts (email/SMS)

#### 4. Performance Monitoring

**Options:**
- **Google Analytics** - Web Vitals
- **New Relic** - APM
- **Datadog** - Performance monitoring
- **Custom** - Performance API

**Quick Setup (Web Vitals):**
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Set Up Alerts

**Critical Alerts:**
- [ ] Site down (uptime monitoring)
- [ ] High error rate (error tracking)
- [ ] Performance degradation
- [ ] Payment failures
- [ ] Database connection issues

**Alert Channels:**
- Email
- SMS
- Slack
- Discord
- PagerDuty (for critical)

---

## Part 10: Launch Checklist

### Pre-Launch (Day Before)

- [ ] All phases completed (1-8)
- [ ] Staging approved
- [ ] Domain configured
- [ ] DNS propagated
- [ ] SSL certificate issued
- [ ] Environment variables set
- [ ] Payment integrations switched to live
- [ ] Final code review completed
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### Launch Day

- [ ] **Morning:**
  - [ ] Final code review
  - [ ] Deploy to production
  - [ ] Verify deployment
  - [ ] Test critical features

- [ ] **Afternoon:**
  - [ ] Full feature testing
  - [ ] Cross-browser testing
  - [ ] Mobile testing
  - [ ] Performance testing

- [ ] **Evening:**
  - [ ] Monitor for issues
  - [ ] Check error logs
  - [ ] Verify analytics
  - [ ] Test payment flows (small transaction)

### Post-Launch (First Week)

- [ ] **Day 1:**
  - [ ] Monitor error logs
  - [ ] Check user signups
  - [ ] Verify payments working
  - [ ] Monitor performance

- [ ] **Week 1:**
  - [ ] Daily error log review
  - [ ] Monitor analytics
  - [ ] Check user feedback
  - [ ] Fix any critical issues

---

## Part 11: Rollback Plan

### If Production Deployment Fails

#### Option 1: Rollback in Netlify

1. **Go to Netlify Dashboard**
   - Navigate to: **Deploys**
   - Find last working deploy
   - Click **"Publish deploy"**
   - Restore previous version

#### Option 2: Revert Code

```bash
# Revert to previous commit
git log --oneline -5  # Find working commit
git revert HEAD
git push origin main
```

#### Option 3: Emergency Fix

1. **Fix issue immediately**
2. **Commit fix**
3. **Push to main**
4. **Redeploy**

### Rollback Checklist

- [ ] Identify issue
- [ ] Decide: fix or rollback
- [ ] Execute rollback plan
- [ ] Verify site works
- [ ] Document issue
- [ ] Fix issue for next deployment

---

## Part 12: Post-Launch Tasks

### Immediate (First Hour)

- [ ] Verify site is live
- [ ] Test critical features
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Test payment flows

### First Day

- [ ] Monitor error logs hourly
- [ ] Check user signups
- [ ] Verify payments processing
- [ ] Monitor performance metrics
- [ ] Respond to any issues

### First Week

- [ ] Daily error log review
- [ ] Monitor analytics
- [ ] Check user feedback
- [ ] Review performance metrics
- [ ] Fix any issues found

### Ongoing

- [ ] Weekly error log review
- [ ] Monthly performance review
- [ ] Quarterly security audit
- [ ] Regular dependency updates
- [ ] Monitor user feedback

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] All phases completed (1-8)
- [ ] Staging approved
- [ ] Domain configured
- [ ] DNS records set
- [ ] SSL certificate ready
- [ ] Environment variables set
- [ ] Payment integrations switched to live
- [ ] Final code review
- [ ] Backup strategy in place

### Deployment
- [ ] Code committed to main
- [ ] Deployed to production
- [ ] Build succeeded
- [ ] Site accessible
- [ ] SSL certificate valid

### Post-Deployment
- [ ] Site loads correctly
- [ ] Environment variables loaded
- [ ] Database connection works
- [ ] Critical features tested
- [ ] Payment flows tested
- [ ] Monitoring set up
- [ ] Alerts configured

### Launch
- [ ] All checks passed
- [ ] Site is live
- [ ] Monitoring active
- [ ] Ready for users

---

## Quick Reference

### Production URLs
- **Site:** https://solowipe.co.uk
- **Netlify Dashboard:** https://app.netlify.com/
- **Supabase Dashboard:** https://app.supabase.com/project/owqjyaiptexqwafzmcwy
- **Stripe Dashboard:** https://dashboard.stripe.com/
- **GoCardless Dashboard:** https://manage.gocardless.com/

### Commands
```bash
# Final commit
git add .
git commit -m "Production deployment"
git push origin main

# Test build
npm run build
npm run preview
```

### Environment Variables
- Use live Stripe keys (`sk_live_...`)
- Use live GoCardless environment
- Verify all variables set for production

---

## Next Steps

After production deployment:

1. ✅ Monitor site for issues
2. ✅ Set up monitoring and alerts
3. ✅ Review analytics
4. ✅ Gather user feedback
5. ✅ Move to Phase 10: Monitoring & Maintenance

---

## 🎉 Congratulations!

Your site is now live! Monitor closely for the first few days and be ready to respond to any issues quickly.
