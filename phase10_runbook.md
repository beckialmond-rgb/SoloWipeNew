# Phase 10: Runbook - Common Issues & Solutions

## Quick Reference Guide for Common Production Issues

---

## Issue 1: Site Down / White Screen

### Symptoms
- Site returns 500 error
- Site shows white screen
- Site times out
- Users cannot access site

### Diagnosis Steps

1. **Check Netlify Dashboard**
   - Go to: https://app.netlify.com/ → Your Site → Deploys
   - Check latest deploy status
   - Review build logs for errors
   - Check if deploy succeeded

2. **Check Supabase Status**
   - Go to: https://status.supabase.com/
   - Check for service outages
   - Verify Supabase is operational

3. **Check Error Tracking**
   - Go to Sentry (or your error tracker)
   - Review recent errors
   - Check for error spikes

4. **Check Uptime Monitoring**
   - Go to UptimeRobot (or your monitor)
   - Check site status
   - Review downtime history

### Resolution Steps

**If Build Failed:**
1. Review build logs
2. Fix build errors
3. Redeploy

**If Supabase Down:**
1. Check Supabase status page
2. Wait for Supabase to resolve
3. Monitor status

**If Code Issue:**
1. Check error tracking for details
2. Identify root cause
3. Fix issue
4. Deploy fix

**Quick Rollback:**
1. Go to Netlify Dashboard → Deploys
2. Find last working deploy
3. Click "Publish deploy"
4. Site restored

### Prevention
- Test builds before deploying
- Monitor Supabase status
- Set up alerts for downtime
- Regular health checks

---

## Issue 2: High Error Rate

### Symptoms
- Many errors in error tracking
- Users reporting issues
- Performance degradation
- Feature failures

### Diagnosis Steps

1. **Check Error Tracking Dashboard**
   - Go to Sentry/error tracker
   - Review error trends
   - Identify error patterns
   - Check error details

2. **Check Recent Deployments**
   - Review recent code changes
   - Check if errors started after deploy
   - Review deployment logs

3. **Check Browser Console**
   - Visit site
   - Open browser console (F12)
   - Review errors
   - Check network tab

4. **Check Edge Function Logs**
   - Go to Supabase Dashboard → Edge Functions
   - Review function logs
   - Check for errors

### Resolution Steps

**If Recent Deployment:**
1. Identify problematic change
2. Rollback if critical
3. Fix issue
4. Redeploy

**If API Error:**
1. Check API status
2. Verify API keys
3. Check rate limits
4. Fix API calls

**If Database Error:**
1. Check database status
2. Review query logs
3. Check RLS policies
4. Optimize queries

**If Environment Variable:**
1. Check environment variables
2. Verify values are set
3. Redeploy after fixing

### Prevention
- Test thoroughly before deploying
- Monitor error rates
- Set up error alerts
- Review error logs regularly

---

## Issue 3: Payment Failures

### Symptoms
- Stripe payments failing
- GoCardless payments failing
- Webhook errors
- Payment status not updating

### Diagnosis Steps

1. **Check Payment Provider Dashboards**
   - Stripe: https://dashboard.stripe.com/
   - GoCardless: https://manage.gocardless.com/
   - Check for service issues
   - Review payment logs

2. **Check Webhook Logs**
   - Stripe: Dashboard → Webhooks → Logs
   - GoCardless: Dashboard → Webhooks → Logs
   - Check for failed webhooks
   - Review error messages

3. **Check Edge Function Logs**
   - Supabase Dashboard → Edge Functions
   - Check `check-subscription` logs
   - Check `gocardless-webhook` logs
   - Review for errors

4. **Verify API Keys**
   - Check Supabase secrets
   - Verify keys are correct
   - Check if keys expired
   - Verify environment (live vs test)

### Resolution Steps

**If Stripe Issue:**
1. Check Stripe status page
2. Verify API key is live (`sk_live_...`)
3. Check webhook endpoint is correct
4. Verify webhook secret matches
5. Test webhook manually

**If GoCardless Issue:**
1. Check GoCardless status
2. Verify environment is `live`
3. Check credentials are correct
4. Verify webhook endpoint
5. Check webhook secret

**If Webhook Issue:**
1. Verify webhook URL is correct
2. Check webhook secret matches
3. Review webhook logs
4. Test webhook manually
5. Fix and redeploy if needed

### Prevention
- Monitor payment provider status
- Set up payment failure alerts
- Test webhooks regularly
- Keep API keys secure

---

## Issue 4: Database Performance Issues

### Symptoms
- Slow queries
- Timeout errors
- High database usage
- Slow page loads

### Diagnosis Steps

1. **Check Supabase Dashboard**
   - Go to: Database → Reports
   - Review query performance
   - Check slow queries
   - Review database size

2. **Check Query Logs**
   - Review slow query logs
   - Identify problematic queries
   - Check query patterns

3. **Check Database Size**
   - Review database growth
   - Check table sizes
   - Identify large tables

4. **Check Indexes**
   - Verify indexes exist
   - Check index usage
   - Review missing indexes

### Resolution Steps

**If Slow Queries:**
1. Identify slow queries
2. Add missing indexes
3. Optimize query patterns
4. Use `.select()` to limit columns
5. Add `.limit()` for large datasets

**If Missing Indexes:**
1. Run `phase7_database_indexes.sql`
2. Create missing indexes
3. Analyze tables
4. Monitor performance

**If Database Size:**
1. Review data growth
2. Archive old data if needed
3. Optimize storage
4. Consider scaling plan

**If Connection Pool:**
1. Check connection pool usage
2. Optimize connection handling
3. Scale database if needed

### Prevention
- Regular performance reviews
- Monitor query performance
- Add indexes proactively
- Optimize queries regularly

---

## Issue 5: Authentication Failures

### Symptoms
- Users cannot login
- Session expires immediately
- Users logged out unexpectedly
- Authentication errors

### Diagnosis Steps

1. **Check Error Tracking**
   - Review authentication errors
   - Check error patterns
   - Identify affected users

2. **Check Supabase Auth**
   - Go to: Supabase Dashboard → Authentication
   - Check auth settings
   - Review user sessions
   - Check for issues

3. **Check Environment Variables**
   - Verify `VITE_SUPABASE_URL` is correct
   - Verify `VITE_SUPABASE_PUBLISHABLE_KEY` is correct
   - Check if variables are set

4. **Check RLS Policies**
   - Verify RLS policies exist
   - Check policy logic
   - Test policies

### Resolution Steps

**If Environment Variables:**
1. Verify variables are set
2. Check variable values
3. Redeploy after fixing

**If RLS Policy:**
1. Review RLS policies
2. Test policies
3. Fix policy logic
4. Update policies if needed

**If Supabase Issue:**
1. Check Supabase status
2. Wait for resolution
3. Monitor status

**If Session Issue:**
1. Check session configuration
2. Review session expiration
3. Fix session handling

### Prevention
- Test authentication regularly
- Monitor auth errors
- Review RLS policies
- Keep Supabase updated

---

## Issue 6: Performance Degradation

### Symptoms
- Slow page loads
- Laggy interactions
- High API response times
- Poor user experience

### Diagnosis Steps

1. **Run Lighthouse Audit**
   - Chrome DevTools → Lighthouse
   - Run performance audit
   - Review recommendations

2. **Check Bundle Size**
   ```bash
   npm run build
   ls -lh dist/assets/
   ```
   - Verify bundle size
   - Check for size increases

3. **Check API Performance**
   - Review API response times
   - Check database query times
   - Identify slow endpoints

4. **Check Network**
   - Review network requests
   - Check for failed requests
   - Identify slow resources

### Resolution Steps

**If Bundle Size:**
1. Run bundle analysis
2. Remove unused dependencies
3. Optimize imports
4. Code split if needed

**If API Performance:**
1. Optimize database queries
2. Add missing indexes
3. Optimize API calls
4. Add caching

**If Network:**
1. Optimize images
2. Enable compression
3. Use CDN
4. Minimize requests

**If Database:**
1. Optimize queries
2. Add indexes
3. Review RLS policies
4. Scale if needed

### Prevention
- Regular performance audits
- Monitor performance metrics
- Optimize proactively
- Review bundle size regularly

---

## Issue 7: Environment Variable Issues

### Symptoms
- "undefined" errors in console
- Features not working
- API calls failing
- Configuration errors

### Diagnosis Steps

1. **Check Browser Console**
   - Open console (F12)
   - Check for "undefined" errors
   - Verify variables loaded

2. **Check Netlify Variables**
   - Go to: Netlify Dashboard → Environment variables
   - Verify variables are set
   - Check variable names
   - Verify values

3. **Check Build Logs**
   - Review Netlify build logs
   - Check for variable warnings
   - Verify build succeeded

### Resolution Steps

**If Variables Missing:**
1. Add missing variables
2. Verify variable names (`VITE_` prefix)
3. Set for correct environment
4. Redeploy

**If Wrong Values:**
1. Update variable values
2. Verify values are correct
3. Redeploy

**If Not Loading:**
1. Check variable names
2. Verify `VITE_` prefix
3. Clear browser cache
4. Hard refresh (Ctrl+Shift+R)

### Prevention
- Document all variables
- Verify variables before deploy
- Test locally with variables
- Review variable usage

---

## Emergency Contacts

### Support Contacts
- **Netlify Support:** https://www.netlify.com/support/
- **Supabase Support:** https://supabase.com/support
- **Stripe Support:** https://support.stripe.com/
- **GoCardless Support:** https://support.gocardless.com/

### Status Pages
- **Netlify Status:** https://www.netlifystatus.com/
- **Supabase Status:** https://status.supabase.com/
- **Stripe Status:** https://status.stripe.com/
- **GoCardless Status:** Check GoCardless dashboard

---

## Quick Reference

### Rollback Procedure
1. Go to Netlify Dashboard → Deploys
2. Find last working deploy
3. Click "Publish deploy"
4. Site restored

### Emergency Fix Procedure
1. Identify issue
2. Fix immediately
3. Test fix
4. Deploy fix
5. Monitor

### Escalation Procedure
1. Document issue
2. Attempt resolution
3. Escalate if needed
4. Communicate status
5. Resolve and document

---

## Maintenance Log

**Date:** _______________
**Issue:** _______________
**Severity:** Critical / High / Medium / Low
**Resolution:** _______________
**Time to Resolve:** _______________
**Prevention Steps:** _______________
