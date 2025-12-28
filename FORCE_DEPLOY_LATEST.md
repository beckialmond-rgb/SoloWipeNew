# Force Netlify to Deploy Latest Commit (96517f3)

## 🔍 The Problem

Netlify is deploying commit `15daa8c` (Dec 19 - old) instead of `96517f3` (latest).

---

## ✅ Solution: Force Deploy Latest Commit

### Option 1: Push Empty Commit (Easiest)

This will trigger Netlify to redeploy:

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main
git commit --allow-empty -m "Trigger Netlify to deploy latest code"
./push-only.sh YOUR_TOKEN
```

After pushing, Netlify should automatically detect the new commit and deploy `96517f3`.

---

### Option 2: Manual Deploy in Netlify

1. **Netlify Dashboard** → **`solowipe.co.uk` site**
2. **Deploys** tab
3. **Trigger deploy** → **"Clear cache and deploy site"**
4. **Wait for deployment**
5. **Check deploy log** - should now show `96517f3`

---

### Option 3: Check Branch and Webhook

1. **Site settings** → **Build & deploy** → **Continuous Deployment**
2. **Verify:**
   - Production branch: `main` ✅
   - Repository: `beckialmond-rgb/solowipe` ✅
3. **If webhook isn't working:**
   - Disconnect and reconnect to GitHub
   - Or use Option 1 (push empty commit)

---

## 🚀 Quick Fix Command

**Run this to force Netlify to deploy latest:**

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main
git commit --allow-empty -m "Trigger Netlify deployment - deploy latest code"
./push-only.sh YOUR_TOKEN
```

This will:
- Push to GitHub
- Trigger Netlify webhook
- Force Netlify to deploy the latest commit (`96517f3`)

---

## ✅ After Pushing

1. **Wait 1-2 minutes** for Netlify to detect the push
2. **Check Netlify Deploys tab:**
   - Should show new deployment
   - Should show commit `96517f3` (or the new empty commit, which includes `96517f3`)
3. **Wait for deployment to complete**
4. **Set environment variables** if not set
5. **Test site**

---

**Push an empty commit - that will force Netlify to deploy the latest code!** 🚀





