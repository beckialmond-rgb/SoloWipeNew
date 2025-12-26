# Sync New Repository to Netlify

## New Repository
- **URL:** https://github.com/beckialmond-rgb/SoloWipeNew.git
- **Branch:** `main`

---

## Option 1: Update Existing Netlify Site (Recommended)

If you already have a Netlify site connected to the old repository:

### Steps:

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Sign in to your account

2. **Select Your Site**
   - Click on your site (e.g., "solowipe" or "solowipe.netlify.app")

3. **Update Repository Connection**
   - Go to **Site settings** → **Build & deploy** → **Continuous Deployment**
   - Click **"Link to a different repository"** or **"Edit settings"**
   - Click **"Change repository"**
   - Search for: `SoloWipeNew`
   - Select: `beckialmond-rgb/SoloWipeNew`
   - Click **"Save"**

4. **Verify Build Settings**
   - **Build command:** `npm run build` (should be set)
   - **Publish directory:** `dist` (should be set)
   - **Branch:** `main` (should be set)

5. **Trigger New Deployment**
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**
   - This will pull from the new repository

---

## Option 2: Create New Netlify Site

If you want to create a fresh Netlify site:

### Steps:

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com
   - Click **"Add new site"** → **"Import an existing project"**

2. **Connect to GitHub**
   - Click **"Deploy with GitHub"**
   - Authorize Netlify if needed
   - Search for: `SoloWipeNew`
   - Select: `beckialmond-rgb/SoloWipeNew`

3. **Configure Build Settings**
   - **Branch to deploy:** `main`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - Click **"Deploy site"**

4. **Set Environment Variables** (if needed)
   - Go to **Site settings** → **Environment variables**
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`)
     - `VITE_SUPABASE_PROJECT_ID` (optional)

---

## Option 3: Use Netlify CLI (Advanced)

If you prefer command line:

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to existing site
netlify link

# Or create new site
netlify init
```

---

## Important: Environment Variables

**Don't forget to set environment variables in Netlify:**

1. **Netlify Dashboard** → **Your Site** → **Site settings**
2. **Environment variables** → **Add variable**
3. **Add these:**
   - `VITE_SUPABASE_URL` = (your Supabase URL)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = (your Supabase anon key)
   - `VITE_SUPABASE_PROJECT_ID` = (optional)

4. **Redeploy** after adding variables

---

## Verify Deployment

After connecting:

1. **Check Deploys Tab**
   - Should show new deployment from `SoloWipeNew` repository
   - Commit should be `81d2a80` or newer

2. **Check Build Log**
   - Should show successful build
   - No errors about missing files

3. **Test Your Site**
   - Visit your Netlify URL
   - Test `/landing` route
   - Verify all features work

---

## Troubleshooting

**If deployment fails:**
- Check build logs for errors
- Verify environment variables are set
- Ensure `netlify.toml` is in the repository
- Check branch name is `main`

**If old site still appears:**
- Clear browser cache
- Unregister service worker
- Test in Incognito window

---

## Quick Checklist

- [ ] Repository connected to Netlify
- [ ] Build settings configured (`npm run build`, `dist`)
- [ ] Environment variables set
- [ ] New deployment triggered
- [ ] Build succeeds
- [ ] Site works correctly

---

**Your new repository is ready! Follow the steps above to connect it to Netlify.**

