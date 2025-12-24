# Force Fresh Deployment - Site Already Linked

## ✅ Site is Linked - Force Fresh Deploy

Since the site is already linked to GitHub, we need to force it to deploy the latest code.

---

## 🚀 Force Fresh Deployment

### Step 1: Check What Branch It's Deploying From

1. **Click on `solowipe.co.uk` site**
2. **Site settings** → **Build & deploy** → **Continuous Deployment**
3. **Check:**
   - **Production branch:** Should be `main`
   - **Repository:** Should be `beckialmond-rgb/solowipe`

4. **If branch is wrong:**
   - Click **Edit settings**
   - Change **Production branch** to `main`
   - Save

### Step 2: Force Deploy Without Cache

1. **Deploys** tab
2. **Trigger deploy** button
3. **Select "Clear cache and deploy site"**
4. **Wait for deployment** to complete
5. **Check deploy log:**
   - Should show commit `96517f3`
   - Should show branch `main`
   - Should complete successfully

### Step 3: Set Environment Variables (Critical!)

1. **Site settings** → **Environment variables**
2. **Check if these exist:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` OR `VITE_SUPABASE_PUBLISHABLE_KEY`

3. **If missing, add them:**
   - Get values from Supabase dashboard
   - Add each variable
   - **Redeploy** after adding

### Step 4: Clear Browser Cache

1. **F12** → **Application** → **Service Workers**
2. **Unregister** service worker
3. **Clear storage** → **Clear site data**
4. **Close browser completely**
5. **Reopen and visit `solowipe.co.uk`**

---

## 🔍 Check Deployment Details

**After triggering deploy, check:**

1. **Deploys** tab → **Latest deployment**
2. **Click on it** to see details
3. **Check:**
   - **Commit:** Should be `96517f3`
   - **Branch:** Should be `main`
   - **Status:** Should be "Published" (green)
   - **Build log:** Should show successful build

4. **If commit is old:**
   - The branch might be wrong
   - Or webhook isn't working
   - Force deploy again

---

## 🎯 Quick Action Plan

**Do these in order:**

1. **Verify branch:** Site settings → Build & deploy → Production branch = `main`
2. **Force deploy:** Deploys → Trigger deploy → Clear cache and deploy site
3. **Check deployment:** Verify it shows commit `96517f3`
4. **Set environment variables:** If missing, add them and redeploy
5. **Clear browser:** Unregister service worker, clear storage, hard refresh

---

## 🆘 If Still Not Working

**Check the deployment log:**

1. **Deploys** → **Latest deployment** → **Deploy log**
2. **Look for:**
   - Build errors
   - Wrong commit being built
   - Environment variable warnings

**Share what you see in the deploy log** - that will tell us what's wrong!

---

**Force a fresh deployment and check the deploy log - that will show us what's happening!**

