# Deploy Microsite/Landing Page - Quick Guide

## ✅ What I Just Did

1. **Added Landing route to App.tsx:**
   - Imported `Landing` component
   - Added route at `/landing`
   - Your microsite is now accessible!

## 🚀 Next Steps: Commit and Push

### Step 1: Stage the Changes

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main
git add src/App.tsx
```

### Step 2: Commit

```bash
git commit -m "feat: Add Landing page route for microsite"
```

### Step 3: Push to GitHub

**If you have your token ready:**
```bash
./push-only.sh YOUR_GITHUB_TOKEN
```

**Or push directly (if authenticated):**
```bash
git push origin main
```

### Step 4: Wait for Netlify Deployment

1. **Check Netlify Dashboard:**
   - Should automatically trigger new deployment
   - Wait 1-3 minutes for build

2. **Test Your Microsite:**
   - Visit: `solowipe.netlify.app/landing`
   - Should see your landing page!

---

## 🔍 Verify Changes

**Check what was added:**
```bash
git diff HEAD src/App.tsx
```

**Should show:**
- Import: `const Landing = lazy(() => import("./pages/Landing"));`
- Route: `<Route path="/landing" element={<Landing />} />`

---

## 📋 Quick Deploy Script

I can create a script that:
1. Stages App.tsx
2. Commits with message
3. Pushes to GitHub

**Would you like me to create this script?**

---

## ⚠️ Important Notes

**Landing Page Route:**
- Currently at `/landing`
- If you want it at root (`/`), we need to adjust routing logic
- The current setup shows landing at `/landing` and app at `/` (protected)

**If you want landing at root:**
- We'd need to modify the routing to show Landing for unauthenticated users
- And Index (app) for authenticated users

**Let me know:**
- Do you want landing at `/landing` (current)?
- Or at `/` (root) for unauthenticated users?

---

## ✅ Ready to Deploy?

**Run these commands:**

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main
git add src/App.tsx
git commit -m "feat: Add Landing page route for microsite"
./push-only.sh YOUR_TOKEN
```

**Then wait for Netlify to deploy and test at:**
`solowipe.netlify.app/landing`

