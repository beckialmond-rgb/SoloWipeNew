# Phase 3: Environment Configuration - Quick Checklist

## 🚀 Quick Setup Guide

### Step 1: Netlify Environment Variables (5 minutes)

1. Go to: https://app.netlify.com/ → Your Site → **Site settings** → **Environment variables**

2. Add these 3 variables:
   ```
   VITE_SUPABASE_URL = https://owqjyaiptexqwafzmcwy.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF
   VITE_SUPABASE_PROJECT_ID = owqjyaiptexqwafzmcwy
   ```

3. Set scope: ✅ Production, ✅ Deploy previews, ✅ Branch deploys

4. **Redeploy site** (Deploys → Trigger deploy)

---

### Step 2: Supabase Edge Functions Secrets (10 minutes)

1. Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy → **Project Settings** → **Edge Functions** → **Secrets**

2. Add these 8 secrets:

   **Supabase Secrets:**
   - `SUPABASE_URL` = `https://owqjyaiptexqwafzmcwy.supabase.co`
   - `SUPABASE_ANON_KEY` = (from Supabase Dashboard → Settings → API → `anon` `public`)
   - `SUPABASE_SERVICE_ROLE_KEY` = ⚠️ (from Supabase Dashboard → Settings → API → `service_role` `secret`)

   **Stripe Secrets:**
   - `STRIPE_SECRET_KEY` = (from Stripe Dashboard → Developers → API keys)
     - Test: `sk_test_...`
     - Live: `sk_live_...` (for production)

   **GoCardless Secrets:**
   - `GOCARDLESS_CLIENT_ID` = (from GoCardless Dashboard → Settings → API)
   - `GOCARDLESS_CLIENT_SECRET` = ⚠️ (from GoCardless Dashboard → Settings → API)
   - `GOCARDLESS_ENVIRONMENT` = `sandbox` (or `live` for production)
   - `GOCARDLESS_WEBHOOK_SECRET` = ⚠️ (from GoCardless Dashboard → Webhooks)

---

### Step 3: Verification (5 minutes)

#### Test Frontend Variables:
1. Deploy site to Netlify
2. Open site in browser
3. Open browser console (F12)
4. Run verification script (copy from `phase3_verify_env_vars.js`)
5. Should see ✅ for all variables

#### Test Edge Functions:
1. Go to Supabase Dashboard → Edge Functions
2. Try invoking a function (e.g., `check-subscription`)
3. Check logs for errors
4. Should not see "secret not found" errors

---

## ✅ Checklist

### Netlify
- [ ] `VITE_SUPABASE_URL` added
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` added
- [ ] `VITE_SUPABASE_PROJECT_ID` added
- [ ] Variables set for all environments
- [ ] Site redeployed
- [ ] Variables verified in browser console

### Supabase Edge Functions
- [ ] `SUPABASE_URL` added
- [ ] `SUPABASE_ANON_KEY` added
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added ⚠️
- [ ] `STRIPE_SECRET_KEY` added
- [ ] `GOCARDLESS_CLIENT_ID` added
- [ ] `GOCARDLESS_CLIENT_SECRET` added ⚠️
- [ ] `GOCARDLESS_ENVIRONMENT` added
- [ ] `GOCARDLESS_WEBHOOK_SECRET` added ⚠️
- [ ] Functions tested (no errors)

### Security
- [ ] No hardcoded secrets in code ✅ (Verified)
- [ ] `.env` in `.gitignore` ✅
- [ ] Service role key never exposed to client ✅

---

## 🔗 Quick Links

- **Netlify Dashboard:** https://app.netlify.com/
- **Supabase Dashboard:** https://app.supabase.com/project/owqjyaiptexqwafzmcwy
- **Stripe Dashboard:** https://dashboard.stripe.com/apikeys
- **GoCardless Dashboard:** https://manage.gocardless.com/

---

## ⚠️ Important Notes

1. **Secrets are case-sensitive** - Type exactly as shown
2. **Cannot view secrets after creation** - Keep backups securely
3. **Service role key is SECRET** - Never expose to client
4. **Redeploy after adding variables** - Changes take effect on next deploy
5. **Test in staging first** - Use sandbox/test keys before production

---

## 🆘 Troubleshooting

**Variables not loading?**
- Check variable names start with `VITE_` (frontend)
- Redeploy site after adding variables
- Check build logs for errors

**Functions can't access secrets?**
- Verify secret names match exactly (case-sensitive)
- Check function logs for specific errors
- Ensure secrets are added (not just env vars)

**Need help?**
- See full guide: `PHASE3_ENVIRONMENT_SETUP.md`
- Check security audit: `phase3_security_audit.md`
