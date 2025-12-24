# Deploy Without Cache in Netlify

## ✅ How to Deploy Without Cache

### Step-by-Step:

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com
   - Click on your site (`solowipe`)

2. **Go to Deploys Tab:**
   - Click **"Deploys"** in the top menu

3. **Trigger Deploy:**
   - Click the **"Trigger deploy"** button (top-right of deploy list)
   - A dropdown menu will appear

4. **Select "Clear cache and deploy site":**
   - Click this option from the dropdown
   - This will:
     - Clear all Netlify caches
     - Rebuild from scratch
     - Deploy fresh code

5. **Wait for Deployment:**
   - Watch the deployment progress
   - Should show: "Building site from commit 96517f3"
   - Wait for green checkmark (usually 1-3 minutes)

6. **After Deployment:**
   - Hard refresh browser: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
   - Or open in Incognito/Private window

---

## 🔍 What This Does

- ✅ Clears Netlify's build cache
- ✅ Clears CDN cache
- ✅ Rebuilds everything from scratch
- ✅ Deploys fresh code
- ✅ Forces new service worker registration

---

## 📋 After Deploying Without Cache

1. **Wait for deployment to complete** (green checkmark)

2. **Clear browser service worker:**
   - F12 → Application → Service Workers → Unregister
   - Clear storage

3. **Hard refresh:**
   - `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)

4. **Test in fresh browser:**
   - Open Incognito/Private window
   - Visit your site

---

## ⚠️ Important: Environment Variables

**Before deploying, make sure environment variables are set:**

1. **Site settings** → **Environment variables**
2. Verify:
   - `VITE_SUPABASE_URL` = (your Supabase URL)
   - `VITE_SUPABASE_ANON_KEY` OR `VITE_SUPABASE_PUBLISHABLE_KEY` = (your key)

**If they're missing, add them FIRST, then deploy without cache.**

---

## ✅ Quick Steps

1. **Set environment variables** (if not set)
2. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**
3. **Wait for deployment**
4. **Clear browser service worker**
5. **Hard refresh browser**
6. **Test**

---

**Deploy without cache - that should fix it!** 🚀

