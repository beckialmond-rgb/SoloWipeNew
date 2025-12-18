# 10-Phase Launch Plan: SoloWipe Production Deployment

## Overview
This comprehensive plan takes SoloWipe from current state to live production deployment on solowipe.co.uk.

---

## Phase 1: Code Completion & Critical Bug Fixes
**Duration:** 2-3 days  
**Status:** 🔄 In Progress

### Tasks:
- [x] Fix RLS policy for customer INSERT operations
- [ ] Fix auto-logout error handling (too aggressive)
- [ ] Verify all TypeScript errors are resolved
- [ ] Run ESLint and fix all warnings
- [ ] Test customer creation flow end-to-end
- [ ] Test job creation and completion flows
- [ ] Verify offline sync functionality
- [ ] Test PWA installation on mobile devices

### Deliverables:
- Zero TypeScript compilation errors
- Zero ESLint warnings
- All critical user flows working locally
- Test report documenting all fixes

### Success Criteria:
✅ App runs without errors in development
✅ All core features functional
✅ No console errors in browser

---

## Phase 2: Database Setup & Verification
**Duration:** 1 day  
**Status:** ✅ Complete

### Tasks:
- [x] Run complete database setup SQL script
- [ ] Verify all tables exist (profiles, customers, jobs)
- [ ] Verify all RLS policies are active
- [ ] Test RLS policies with test user
- [ ] Verify storage bucket exists (job-photos)
- [ ] Test storage bucket policies
- [ ] Verify database triggers (handle_new_user)
- [ ] Create database backup strategy

### Verification SQL:
```sql
-- Run verify_rls_setup.sql to confirm all policies
-- Check tables: SELECT * FROM pg_tables WHERE schemaname = 'public';
-- Check policies: SELECT * FROM pg_policies WHERE tablename = 'customers';
```

### Success Criteria:
✅ All tables created successfully
✅ RLS policies working correctly
✅ Storage bucket accessible
✅ New user signup creates profile automatically

---

## Phase 3: Environment Configuration
**Duration:** 1 day  
**Status:** 🔄 In Progress

### Frontend Environment Variables (Netlify):
- [ ] `VITE_SUPABASE_URL` = `https://owqjyaiptexqwafzmcwy.supabase.co`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF`
- [ ] `VITE_SUPABASE_PROJECT_ID` = `owqjyaiptexqwafzmcwy`

### Supabase Edge Functions Secrets:
- [ ] `SUPABASE_URL` = `https://owqjyaiptexqwafzmcwy.supabase.co`
- [ ] `SUPABASE_ANON_KEY` = (anon key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (service role key - keep secret!)
- [ ] `STRIPE_SECRET_KEY` = (Stripe secret key)
- [ ] `GOCARDLESS_CLIENT_ID` = (GoCardless client ID)
- [ ] `GOCARDLESS_CLIENT_SECRET` = (GoCardless client secret)
- [ ] `GOCARDLESS_ENVIRONMENT` = `sandbox` (or `live` for production)
- [ ] `GOCARDLESS_WEBHOOK_SECRET` = (GoCardless webhook secret)

### Setup Steps:
1. **Netlify Dashboard:**
   - Site settings → Environment variables
   - Add all VITE_ variables
   - Set for Production, Staging, and Deploy previews

2. **Supabase Dashboard:**
   - Project settings → Edge Functions → Secrets
   - Add all function secrets
   - Verify secrets are encrypted

### Success Criteria:
✅ All environment variables set in Netlify
✅ All Supabase function secrets configured
✅ No hardcoded secrets in code
✅ Variables accessible in both environments

---

## Phase 4: Payment Integrations Setup
**Duration:** 2-3 days  
**Status:** ⏳ Pending

### Stripe Configuration:
- [ ] Create Stripe account (if not exists)
- [ ] Get Stripe API keys (test and live)
- [ ] Configure Stripe webhook endpoints
- [ ] Set up Stripe products/prices for subscriptions
- [ ] Test Stripe checkout flow
- [ ] Test subscription webhook handling
- [ ] Test customer portal access
- [ ] Verify subscription status updates

### GoCardless Configuration:
- [ ] Create GoCardless account (if not exists)
- [ ] Get GoCardless API credentials
- [ ] Configure GoCardless redirect URLs:
  - Sandbox: `https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-callback`
  - Production: `https://solowipe.co.uk/api/gocardless-callback` (if custom domain)
- [ ] Set up GoCardless webhook endpoint:
  - `https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook`
- [ ] Test GoCardless OAuth connection flow
- [ ] Test mandate creation flow
- [ ] Test payment collection flow
- [ ] Verify webhook handling for mandates and payments

### Testing Checklist:
- [ ] Test Stripe subscription purchase
- [ ] Test Stripe subscription cancellation
- [ ] Test GoCardless connection
- [ ] Test GoCardless mandate creation
- [ ] Test GoCardless payment collection
- [ ] Verify payment status updates in database

### Success Criteria:
✅ Stripe checkout working end-to-end
✅ Stripe webhooks updating subscription status
✅ GoCardless OAuth connection working
✅ GoCardless mandates creating successfully
✅ Payment collection working
✅ All payment data syncing to database

---

## Phase 5: Security & Authentication Hardening
**Duration:** 1-2 days  
**Status:** ⏳ Pending

### Security Tasks:
- [ ] Review and rotate Supabase keys (if needed)
- [ ] Verify RLS policies are restrictive enough
- [ ] Test authentication flows (signup, login, logout)
- [ ] Test password reset flow
- [ ] Verify email confirmation (if enabled)
- [ ] Review CORS settings in Supabase
- [ ] Verify HTTPS enforced everywhere
- [ ] Check for exposed API keys in client code
- [ ] Review error messages (don't leak sensitive info)
- [ ] Set up rate limiting (if needed)

### Authentication Testing:
- [ ] New user signup creates profile
- [ ] Login persists session correctly
- [ ] Logout clears session
- [ ] Password reset works
- [ ] Protected routes redirect to login
- [ ] Session expires appropriately

### Success Criteria:
✅ No secrets exposed in client code
✅ RLS policies prevent unauthorized access
✅ Authentication flows working correctly
✅ HTTPS enforced on all connections
✅ Error messages don't leak sensitive data

---

## Phase 6: Testing & Quality Assurance
**Duration:** 3-4 days  
**Status:** ⏳ Pending

### Functional Testing:
- [ ] **Customer Management:**
  - Create customer
  - Update customer
  - Archive customer
  - View customer details
  - Add customer notes

- [ ] **Job Management:**
  - Create job
  - Complete job
  - Reschedule job
  - Skip job
  - Mark job as paid
  - Add job notes
  - Upload job photos

- [ ] **Calendar:**
  - View calendar
  - Navigate between dates
  - Filter jobs
  - Quick add customer from calendar

- [ ] **Earnings:**
  - View earnings dashboard
  - Filter by date range
  - Export earnings data

- [ ] **Settings:**
  - Update business name
  - Connect GoCardless
  - Manage subscription
  - Export data
  - Sign out

### Cross-Browser Testing:
- [ ] Chrome (desktop & mobile)
- [ ] Firefox (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Edge (desktop)

### Device Testing:
- [ ] Desktop (1920x1080, 1366x768)
- [ ] Tablet (iPad, Android tablet)
- [ ] Mobile (iPhone, Android phone)

### Performance Testing:
- [ ] Page load times < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] Bundle size < 2MB (gzipped)
- [ ] Lighthouse score > 90

### Offline Testing:
- [ ] App works offline
- [ ] Data syncs when back online
- [ ] Offline indicator shows correctly
- [ ] Service worker updates correctly

### Success Criteria:
✅ All features working across browsers
✅ Performance metrics met
✅ Offline functionality working
✅ No critical bugs found
✅ Test report completed

---

## Phase 7: Performance Optimization
**Duration:** 2 days  
**Status:** ⏳ Pending

### Optimization Tasks:
- [ ] Analyze bundle size (run `npm run analyze`)
- [ ] Optimize images (compress, use WebP)
- [ ] Implement code splitting (if needed)
- [ ] Optimize database queries
- [ ] Add database indexes (verify existing)
- [ ] Enable Supabase query caching
- [ ] Optimize React re-renders
- [ ] Lazy load heavy components
- [ ] Minimize API calls
- [ ] Enable CDN caching

### Build Optimization:
- [ ] Verify build output size
- [ ] Check for duplicate dependencies
- [ ] Remove unused code
- [ ] Optimize CSS (purge unused)
- [ ] Minify JavaScript

### Database Optimization:
- [ ] Review slow queries
- [ ] Add missing indexes
- [ ] Optimize RLS policies
- [ ] Set up query monitoring

### Success Criteria:
✅ Bundle size optimized
✅ Page load < 3 seconds
✅ Lighthouse score > 90
✅ Database queries optimized
✅ No performance regressions

---

## Phase 8: Staging Deployment
**Duration:** 1-2 days  
**Status:** ⏳ Pending

### Pre-Deployment:
- [ ] Create staging branch
- [ ] Set up staging environment in Netlify
- [ ] Configure staging environment variables
- [ ] Set up staging Supabase project (optional)
- [ ] Test build locally: `npm run build`
- [ ] Verify build output: `npm run preview`

### Deployment Steps:
1. **Netlify Setup:**
   - Create staging site or branch deploy
   - Configure staging domain
   - Set environment variables for staging
   - Configure build settings

2. **Deploy:**
   ```bash
   git checkout -b staging
   git push origin staging
   ```
   - Monitor Netlify build logs
   - Verify deployment succeeds

3. **Post-Deployment:**
   - Test staging URL
   - Verify all features work
   - Check browser console for errors
   - Test on multiple devices
   - Verify environment variables loaded

### Staging Testing:
- [ ] All features functional
- [ ] No console errors
- [ ] Environment variables correct
- [ ] Database connections working
- [ ] Payment flows working (test mode)
- [ ] Performance acceptable

### Success Criteria:
✅ Staging site deployed successfully
✅ All features working on staging
✅ No critical issues found
✅ Ready for production deployment

---

## Phase 9: Production Deployment
**Duration:** 1 day  
**Status:** ⏳ Pending

### Pre-Launch Checklist:
- [ ] All Phase 1-8 tasks completed
- [ ] Staging tested and approved
- [ ] Production environment variables set
- [ ] Domain configured (solowipe.co.uk)
- [ ] SSL certificate verified
- [ ] DNS records configured
- [ ] Payment integrations switched to live mode
- [ ] Backup strategy in place

### Domain Configuration:
- [ ] Add custom domain in Netlify
- [ ] Configure DNS records:
  - A record: Netlify IP
  - CNAME: Netlify domain
- [ ] Verify SSL certificate issued
- [ ] Test domain redirects (www → non-www)
- [ ] Test HTTPS enforcement

### Production Environment Variables:
- [ ] Switch Stripe to live keys
- [ ] Switch GoCardless to live environment
- [ ] Verify all production secrets set
- [ ] Double-check no test keys in production

### Deployment:
1. **Final Code Review:**
   - Review all changes
   - Verify no debug code
   - Check for console.logs (remove)
   - Verify error handling

2. **Deploy to Production:**
   ```bash
   git checkout main
   git merge staging  # or deploy directly
   git push origin main
   ```

3. **Monitor Deployment:**
   - Watch Netlify build logs
   - Verify deployment succeeds
   - Check for any errors

4. **Post-Deployment Verification:**
   - Visit solowipe.co.uk
   - Test all critical flows
   - Verify HTTPS working
   - Check browser console
   - Test on mobile devices
   - Verify payment flows (small test transaction)

### Launch Tasks:
- [ ] Announce launch (if applicable)
- [ ] Monitor error logs
- [ ] Watch analytics
- [ ] Be ready for quick fixes

### Success Criteria:
✅ Site live on solowipe.co.uk
✅ HTTPS working correctly
✅ All features functional
✅ Payment integrations working
✅ No critical errors
✅ Performance acceptable

---

## Phase 10: Monitoring & Maintenance
**Duration:** Ongoing  
**Status:** ⏳ Pending

### Monitoring Setup:
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Set up analytics (Google Analytics, Plausible, etc.)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up database monitoring (Supabase dashboard)
- [ ] Configure alerting for critical errors
- [ ] Set up log aggregation

### Key Metrics to Monitor:
- **Performance:**
  - Page load times
  - API response times
  - Database query performance
  - Error rates

- **Business:**
  - User signups
  - Active users
  - Jobs created/completed
  - Payment transactions
  - Subscription conversions

- **Technical:**
  - Server errors (5xx)
  - Client errors (4xx)
  - Failed API calls
  - Database connection issues
  - Storage usage

### Maintenance Tasks:
- [ ] Weekly: Review error logs
- [ ] Weekly: Check database performance
- [ ] Monthly: Review and update dependencies
- [ ] Monthly: Backup database
- [ ] Quarterly: Security audit
- [ ] Quarterly: Performance review

### Documentation:
- [ ] Create runbook for common issues
- [ ] Document deployment process
- [ ] Document rollback procedure
- [ ] Create troubleshooting guide
- [ ] Document environment variables

### Success Criteria:
✅ Monitoring tools configured
✅ Alerts set up for critical issues
✅ Documentation complete
✅ Maintenance schedule established
✅ Team trained on procedures

---

## Quick Reference: Critical URLs

### Supabase:
- Dashboard: https://app.supabase.com/project/owqjyaiptexqwafzmcwy
- API URL: https://owqjyaiptexqwafzmcwy.supabase.co
- Edge Functions: https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/

### Netlify:
- Dashboard: https://app.netlify.com/
- Site: solowipe.co.uk (production)

### Payment Providers:
- Stripe Dashboard: https://dashboard.stripe.com/
- GoCardless Dashboard: https://manage.gocardless.com/

---

## Risk Mitigation

### High-Risk Areas:
1. **Payment Integration Failures**
   - Mitigation: Thorough testing in sandbox, small test transactions first
   
2. **Database Performance Issues**
   - Mitigation: Load testing, query optimization, monitoring

3. **Environment Variable Misconfiguration**
   - Mitigation: Checklist, double-check, staging verification

4. **Domain/DNS Issues**
   - Mitigation: Test DNS propagation, verify SSL early

5. **Security Vulnerabilities**
   - Mitigation: Security audit, RLS verification, key rotation

### Rollback Plan:
1. Keep previous deployment in Netlify
2. Document rollback procedure
3. Have database backup ready
4. Test rollback process in staging

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 2-3 days | - |
| Phase 2 | 1 day | Phase 1 |
| Phase 3 | 1 day | Phase 2 |
| Phase 4 | 2-3 days | Phase 3 |
| Phase 5 | 1-2 days | Phase 4 |
| Phase 6 | 3-4 days | Phase 5 |
| Phase 7 | 2 days | Phase 6 |
| Phase 8 | 1-2 days | Phase 7 |
| Phase 9 | 1 day | Phase 8 |
| Phase 10 | Ongoing | Phase 9 |

**Total Estimated Time:** 14-19 days (approximately 3-4 weeks)

---

## Next Steps

1. **Review this plan** and adjust timelines as needed
2. **Start with Phase 1** - Complete critical bug fixes
3. **Set up project tracking** (GitHub Projects, Trello, etc.)
4. **Assign tasks** if working with a team
5. **Begin execution** - Start Phase 1 tasks

---

## Notes

- This plan assumes you're working solo or with a small team
- Adjust timelines based on your availability
- Some phases can be done in parallel (e.g., Phase 4 & 5)
- Don't skip testing phases - they catch issues early
- Keep stakeholders informed of progress

**Good luck with your launch! 🚀**
