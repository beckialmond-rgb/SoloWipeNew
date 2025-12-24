# Fix: Domain Already Connected to Another Site

## 🔍 The Situation

Your domain `solowipe.co.uk` is already connected to the old `solowipe.co.uk` site in Netlify. You have two options:

---

## ✅ Option 1: Fix the Old Site (Recommended)

Since the domain is already there, fix the old site to deploy from your GitHub repo:

### Step 1: Reconnect Old Site to GitHub

1. **Click on `solowipe.co.uk` site** in Netlify
2. **Site settings** → **Build & deploy** → **Continuous Deployment**
3. **Check current status:**
   - Is it connected to a repository?
   - Which repository?

4. **If not connected or wrong:**
   - Click **"Link to Git provider"** or **"Edit settings"**
   - Select **GitHub**
   - Authorize if needed
   - Select repository: `beckialmond-rgb/solowipe`
   - Select branch: `main`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Save**

### Step 2: Trigger Deployment

1. **Deploys** tab
2. **Trigger deploy** → **Clear cache and deploy site**
3. Wait for deployment

### Step 3: Set Environment Variables

1. **Site settings** → **Environment variables**
2. Add:
   - `VITE_SUPABASE_URL` = (your Supabase URL)
   - `VITE_SUPABASE_ANON_KEY` = (your Supabase key)
3. **Redeploy** after adding

### Step 4: Test

- Visit `solowipe.co.uk`
- Should show your new app!

---

## ✅ Option 2: Transfer Domain to New Site

If you want to use the new `solowipe` site:

### Step 1: Remove Domain from Old Site

1. **Click on `solowipe.co.uk` site**
2. **Site settings** → **Domain management**
3. Find `solowipe.co.uk` in the list
4. Click **"Remove"** or **"Unlink"**
5. Confirm removal

### Step 2: Add Domain to New Site

1. **Click on `solowipe` site** (the new one)
2. **Site settings** → **Domain management**
3. **Add custom domain** → Enter `solowipe.co.uk`
4. Follow DNS setup (may need to update DNS records)

### Step 3: Delete Old Site (Optional)

1. Click on old `solowipe.co.uk` site
2. **Site settings** → **General** → **Delete site**

---

## 🎯 Recommended: Fix the Old Site

**Since the domain is already there, it's easier to fix the old site:**

1. **Reconnect to GitHub:** `github.com/beckialmond-rgb/solowipe`
2. **Set branch:** `main`
3. **Build settings:** `npm run build`, publish `dist`
4. **Trigger deploy**
5. **Set environment variables**
6. **Done!**

---

## 🔧 Step-by-Step: Fix Old Site

1. **Click `solowipe.co.uk` site**
2. **Site settings** → **Build & deploy** → **Continuous Deployment**
3. **Click "Link to Git provider"** (or "Edit settings")
4. **Connect to GitHub** → Select `beckialmond-rgb/solowipe`
5. **Branch:** `main`
6. **Build command:** `npm run build`
7. **Publish directory:** `dist`
8. **Save**
9. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**
10. **Set environment variables**
11. **Test `solowipe.co.uk`**

---

**Fix the old site - it's already connected to your domain!** 🚀

