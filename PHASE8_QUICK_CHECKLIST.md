# Phase 8: Staging Deployment - Quick Checklist

## 🚀 Quick Staging Setup (30 minutes)

### Step 1: Create Staging Branch (5 min)
```bash
git checkout -b staging
git push origin staging
```

### Step 2: Configure Netlify (10 min)
1. Go to Netlify Dashboard → Site settings → Build & deploy
2. Enable branch deploys for `staging` branch
3. Or create separate staging site

### Step 3: Set Environment Variables (10 min)
1. Go to Site settings → Environment variables
2. Add variables for "Deploy previews" or "Branch deploys":
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
3. Use test keys for payments:
   - Stripe: `sk_test_...`
   - GoCardless: `sandbox`

### Step 4: Deploy (5 min)
- Push to `staging` branch (auto-deploy)
- Or: Trigger manual deploy in Netlify
- Monitor build logs

---

## ✅ Pre-Deployment Checklist

- [ ] Code reviewed
- [ ] Build tested locally (`npm run build`)
- [ ] No TypeScript errors
- [ ] No critical bugs
- [ ] Environment variables documented

---

## 🧪 Post-Deployment Testing

### Quick Test (10 minutes)
- [ ] Site loads correctly
- [ ] Can login
- [ ] Can create customer
- [ ] Can complete job
- [ ] No console errors

### Full Test (1-2 hours)
- [ ] All features work
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Payment flows work (test mode)
- [ ] Performance acceptable

---

## 🔧 Staging Configuration

### Environment Variables

**Frontend (Netlify):**
```
VITE_SUPABASE_URL = https://owqjyaiptexqwafzmcwy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF
VITE_SUPABASE_PROJECT_ID = owqjyaiptexqwafzmcwy
```

**Backend (Supabase Secrets):**
- Use test keys for Stripe (`sk_test_...`)
- Use sandbox for GoCardless
- Same Supabase project (or separate test)

---

## 🐛 Common Issues

### Build Fails
- Check build logs
- Verify dependencies
- Check Node version

### White Screen
- Check browser console
- Verify environment variables
- Check Supabase connection

### Variables Not Loading
- Verify variables set for correct environment
- Check variable names (`VITE_` prefix)
- Redeploy after adding

---

## ✅ Staging Approval Checklist

Before moving to production:

- [ ] All features working
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Payment flows tested

---

## 📋 Deployment Steps Summary

1. **Create staging branch** ✅
2. **Configure Netlify** ✅
3. **Set environment variables** ✅
4. **Deploy** ✅
5. **Test** ✅
6. **Approve** ✅
7. **Move to production** (Phase 9)

---

## 🔗 Quick Links

- **Netlify Dashboard:** https://app.netlify.com/
- **Supabase Dashboard:** https://app.supabase.com/project/owqjyaiptexqwafzmcwy
- **Staging URL:** (Your staging URL)

---

## Next Steps

Once staging is approved:
1. ✅ Document issues found
2. ✅ Fix any problems
3. ✅ Get final approval
4. ✅ Move to Phase 9: Production Deployment
