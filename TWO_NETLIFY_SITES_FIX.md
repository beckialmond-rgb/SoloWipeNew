# Fix: Two Netlify Sites Issue

## 🔍 The Problem

You have **TWO sites** in Netlify:

1. **`solowipe`** (solowipe.netlify.app)
   - Published: **12:58 PM (a few seconds ago)** ✅ RECENT
   - This is your NEW site with latest code

2. **`solowipe.co.uk`** (custom domain)
   - Published: **Dec 19 (5 days ago)** ❌ OLD
   - This is your OLD site

---

## ✅ Solution

### Option 1: Update the Custom Domain Site (Recommended)

If you want to use `solowipe.co.uk`, update it to deploy from the same repo:

1. **Click on `solowipe.co.uk` site**
2. **Site settings** → **Build & deploy** → **Continuous Deployment**
3. **Check:**
   - Repository: Should be `github.com/beckialmond-rgb/solowipe`
   - Branch: Should be `main`
4. **If wrong, fix it:**
   - Click **Edit settings**
   - Select correct repository
   - Set branch to `main`
   - Save

5. **Trigger fresh deployment:**
   - **Deploys** → **Trigger deploy** → **Clear cache and deploy site**
   - Wait for deployment

6. **Set environment variables:**
   - **Site settings** → **Environment variables**
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Redeploy

---

### Option 2: Use the New Site and Point Domain

If `solowipe` is the correct new site:

1. **Use `solowipe.netlify.app`** (the new site)
2. **Point your custom domain to it:**
   - Click on `solowipe` site
   - **Site settings** → **Domain management**
   - **Add custom domain** → Enter `solowipe.co.uk`
   - Follow DNS setup instructions

3. **Delete or archive the old site:**
   - Go to old `solowipe.co.uk` site
   - **Site settings** → **General** → **Delete site** (if you don't need it)

---

### Option 3: Merge/Consolidate

If both should be the same:

1. **Check which one has the latest code:**
   - Click on each site
   - **Deploys** tab
   - Check latest commit hash
   - Should be `96517f3` for the correct one

2. **Update the old one:**
   - Make sure it's connected to same repo
   - Trigger fresh deployment
   - Set environment variables

---

## 🎯 Quick Fix

**Most likely, you're visiting `solowipe.co.uk` which is the OLD site.**

### To Fix:

1. **Click on `solowipe.co.uk` site** (the old one)
2. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**
3. **Set environment variables** (if not set)
4. **Wait for deployment**
5. **Visit `solowipe.co.uk`** - should show new app

**OR**

1. **Visit `solowipe.netlify.app`** instead (the new site)
2. This should have your latest code

---

## 🔍 Which Site Should You Use?

**Check both sites:**

1. **Click on `solowipe` site:**
   - **Deploys** → Check latest commit
   - Should show `96517f3`

2. **Click on `solowipe.co.uk` site:**
   - **Deploys** → Check latest commit
   - If it's old, that's why you see old app!

---

## ✅ Recommended Action

**Update the `solowipe.co.uk` site** (the one you're probably visiting):

1. Click on **`solowipe.co.uk`**
2. **Site settings** → **Build & deploy**
3. Verify it's connected to: `github.com/beckialmond-rgb/solowipe`
4. **Deploys** → **Trigger deploy** → **Clear cache and deploy site**
5. **Set environment variables**
6. **Wait for deployment**
7. **Test `solowipe.co.uk`**

---

**Update the old site (`solowipe.co.uk`) to deploy the latest code!** 🚀

