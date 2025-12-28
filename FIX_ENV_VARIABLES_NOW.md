# Fix: Missing Environment Variables in Netlify

## 🔍 The Problem

The error shows:
```
VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) is missing
```

This means Netlify doesn't have the required environment variables set, so your app can't connect to Supabase.

---

## ✅ Solution: Add Environment Variables to Netlify

### Step 1: Get Your Supabase Keys

You need to get these from your Supabase dashboard:

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Get the URL:**
   - Go to **Settings** → **API**
   - Copy **Project URL** (looks like: `https://xxxxx.supabase.co`)

3. **Get the Anon Key:**
   - In the same **Settings** → **API** page
   - Copy **anon public** key (starts with `eyJ...`)
   - OR copy **publishable key** if you see that tab (starts with `sb_publishable_...`)

---

### Step 2: Add to Netlify

1. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com
   - Click on your site (`solowipe`)

2. **Navigate to Environment Variables:**
   - Click **Site settings** (top menu)
   - Click **Environment variables** (left sidebar)

3. **Add First Variable:**
   - Click **Add a variable** button
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Scopes:** Leave as "All scopes" (or select "Production" if you want)
   - Click **Save**

4. **Add Second Variable:**
   - Click **Add a variable** again
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** Your Supabase anon key (starts with `eyJ...` or `sb_publishable_...`)
   - **Scopes:** Leave as "All scopes"
   - Click **Save**

---

### Step 3: Redeploy (Critical!)

**After adding environment variables, you MUST redeploy:**

1. Go to **Deploys** tab
2. Click **Trigger deploy** button
3. Select **Deploy site** (or "Clear cache and deploy site")
4. Wait for deployment to complete (green checkmark)

**Important:** Environment variables only take effect after redeploying!

---

## 🔍 How to Find Your Supabase Keys

### Option 1: From Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. **Settings** → **API**
4. You'll see:
   - **Project URL** → Use for `VITE_SUPABASE_URL`
   - **anon public** key → Use for `VITE_SUPABASE_ANON_KEY`

### Option 2: From Your Local .env File

If you have a `.env` file locally:

```bash
cat .env | grep VITE_SUPABASE
```

This will show your local values (you can use the same ones in Netlify).

---

## ✅ After Adding Variables

1. **Redeploy** (Trigger deploy → Deploy site)
2. **Wait for deployment** to complete
3. **Hard refresh browser:** `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
4. **Check console** - errors should be gone!

---

## 🎯 Quick Checklist

- [ ] Get Supabase URL from Supabase dashboard
- [ ] Get Supabase anon key from Supabase dashboard
- [ ] Add `VITE_SUPABASE_URL` to Netlify
- [ ] Add `VITE_SUPABASE_ANON_KEY` to Netlify
- [ ] **Redeploy** (this is critical!)
- [ ] Hard refresh browser
- [ ] Check console - should work now!

---

## 🆘 If You Don't Have Supabase Keys

If you don't have access to Supabase dashboard:

1. Check if you have a `.env` file locally
2. Or check if someone else has the keys
3. Or you may need to create a new Supabase project

---

**Add the environment variables and redeploy - that will fix it!** 🚀





