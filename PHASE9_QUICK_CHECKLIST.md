# Phase 9: Production Deployment - Quick Checklist

## 🚀 Production Launch Checklist

### Pre-Launch (Day Before)

- [ ] All phases 1-8 completed
- [ ] Staging approved
- [ ] Domain configured (solowipe.co.uk)
- [ ] DNS records set
- [ ] SSL certificate ready
- [ ] Environment variables set
- [ ] Payment integrations switched to live
- [ ] Final code review
- [ ] Backup strategy in place

---

## 🎯 Launch Day Steps

### Step 1: Final Code Review (15 min)
- [ ] Remove debug code
- [ ] Remove test data
- [ ] Verify error handling
- [ ] Check security
- [ ] Test build locally

### Step 2: Switch to Live Keys (10 min)
- [ ] Update Stripe secret to live (`sk_live_...`)
- [ ] Update GoCardless to live environment
- [ ] Update GoCardless credentials (if needed)
- [ ] Verify all secrets updated

### Step 3: Domain Configuration (30 min)
- [ ] Add domain in Netlify
- [ ] Configure DNS records
- [ ] Wait for DNS propagation
- [ ] Verify SSL certificate issued

### Step 4: Deploy to Production (10 min)
- [ ] Commit final changes
- [ ] Push to main branch
- [ ] Monitor deployment
- [ ] Verify build succeeds

### Step 5: Post-Deployment Verification (30 min)
- [ ] Site loads correctly
- [ ] HTTPS working
- [ ] Can login
- [ ] Critical features work
- [ ] Payment flows work

---

## ✅ Critical Checks

### Immediate (5 minutes)
- [ ] Site accessible: https://solowipe.co.uk
- [ ] HTTPS working (padlock icon)
- [ ] No white screen
- [ ] Environment variables loaded
- [ ] Database connection works

### Critical Features (30 minutes)
- [ ] Signup works
- [ ] Login works
- [ ] Create customer works
- [ ] Complete job works
- [ ] Payment flows work (test with small amount)

### Full Testing (1-2 hours)
- [ ] All features tested
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Performance acceptable

---

## 🔧 Production Configuration

### Environment Variables

**Netlify (Production):**
```
VITE_SUPABASE_URL = https://owqjyaiptexqwafzmcwy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF
VITE_SUPABASE_PROJECT_ID = owqjyaiptexqwafzmcwy
```

**Supabase Secrets (Live):**
- `STRIPE_SECRET_KEY` = `sk_live_...` (live key)
- `GOCARDLESS_ENVIRONMENT` = `live`
- `GOCARDLESS_CLIENT_ID` = (live credentials)
- `GOCARDLESS_CLIENT_SECRET` = (live credentials)
- `GOCARDLESS_WEBHOOK_SECRET` = (live webhook secret)

---

## 🌐 Domain Setup

### DNS Records

**CNAME (Recommended):**
```
Type: CNAME
Name: @
Value: your-site.netlify.app
```

**For www:**
```
Type: CNAME
Name: www
Value: your-site.netlify.app
```

### SSL Certificate
- ✅ Auto-provisioned by Netlify
- ✅ Issues after DNS propagates
- ✅ Auto-renewed

### Test URLs
- ✅ https://solowipe.co.uk
- ✅ http://solowipe.co.uk (redirects to HTTPS)
- ✅ https://www.solowipe.co.uk (redirects to non-www)

---

## 💳 Payment Integrations

### Stripe Live Mode
- [ ] Switch to live mode in Stripe Dashboard
- [ ] Get live secret key (`sk_live_...`)
- [ ] Update Supabase secret
- [ ] Update webhook endpoint
- [ ] Test with real card (small amount)

### GoCardless Live Mode
- [ ] Switch to live environment
- [ ] Get live credentials
- [ ] Update Supabase secrets
- [ ] Update webhook endpoint
- [ ] Test connection

---

## 📊 Monitoring Setup

### Error Tracking
- [ ] Set up Sentry (or similar)
- [ ] Configure error alerts
- [ ] Test error reporting

### Analytics
- [ ] Set up Google Analytics (or similar)
- [ ] Configure tracking
- [ ] Verify data collection

### Uptime Monitoring
- [ ] Set up UptimeRobot (or similar)
- [ ] Configure alerts
- [ ] Test monitoring

---

## 🐛 Rollback Plan

### If Issues Occur

**Quick Rollback:**
1. Go to Netlify Dashboard → Deploys
2. Find last working deploy
3. Click "Publish deploy"
4. Site restored

**Or:**
```bash
git revert HEAD
git push origin main
```

---

## ✅ Launch Sign-Off

**Date:** _______________
**Deployed by:** _______________
**Verified by:** _______________

**Checks:**
- [ ] Site live and accessible
- [ ] All features working
- [ ] Payment flows working
- [ ] Monitoring set up
- [ ] Ready for users

**Notes:** _______________

---

## 🎉 Post-Launch

### First Hour
- [ ] Monitor error logs
- [ ] Check user signups
- [ ] Verify payments
- [ ] Monitor performance

### First Day
- [ ] Review error logs hourly
- [ ] Monitor analytics
- [ ] Check user feedback
- [ ] Fix any issues

### First Week
- [ ] Daily error log review
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Make improvements

---

## 🔗 Quick Links

- **Site:** https://solowipe.co.uk
- **Netlify:** https://app.netlify.com/
- **Supabase:** https://app.supabase.com/project/owqjyaiptexqwafzmcwy
- **Stripe:** https://dashboard.stripe.com/
- **GoCardless:** https://manage.gocardless.com/

---

## Next Steps

After launch:
1. ✅ Monitor closely for first 24 hours
2. ✅ Set up ongoing monitoring
3. ✅ Gather user feedback
4. ✅ Move to Phase 10: Monitoring & Maintenance

---

## 🎊 Congratulations!

Your site is live! Monitor closely and be ready to respond to any issues.
