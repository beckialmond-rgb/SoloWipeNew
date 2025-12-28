# Deploy Updated Edge Functions - Guide

**Date:** 2025-01-27  
**Functions to Deploy:** 3 functions updated in Phase 1

---

## Functions Updated

1. ✅ `gocardless-collect-payment` - Payment status fix
2. ✅ `gocardless-callback` - Security fix (removed fallback secret)
3. ✅ `gocardless-webhook` - Payment status handling fix

---

## Option 1: Deploy via Supabase Dashboard (Recommended - No CLI Required)

### Step 1: Access Supabase Dashboard

1. Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/edge-functions
2. Log in if needed

### Step 2: Deploy Each Function

#### Function 1: gocardless-collect-payment

1. Click on **"gocardless-collect-payment"** in the functions list
2. Click **"Edit"** or **"View Code"** button
3. **Copy** the entire contents of: `supabase/functions/gocardless-collect-payment/index.ts`
4. **Paste** into the Supabase editor (replace all existing code)
5. Click **"Deploy"** or **"Save"**
6. Wait for deployment to complete (check for success message)

#### Function 2: gocardless-callback

1. Click on **"gocardless-callback"** in the functions list
2. Click **"Edit"** or **"View Code"** button
3. **Copy** the entire contents of: `supabase/functions/gocardless-callback/index.ts`
4. **Paste** into the Supabase editor (replace all existing code)
5. Click **"Deploy"** or **"Save"**
6. Wait for deployment to complete

#### Function 3: gocardless-webhook

1. Click on **"gocardless-webhook"** in the functions list
2. Click **"Edit"** or **"View Code"** button
3. **Copy** the entire contents of: `supabase/functions/gocardless-webhook/index.ts`
4. **Paste** into the Supabase editor (replace all existing code)
5. Click **"Deploy"** or **"Save"**
6. Wait for deployment to complete

### Step 3: Verify Deployment

1. Check function logs for any errors
2. Verify all three functions show as "Active" or "Deployed"
3. Test one function if possible (e.g., check-subscription)

---

## Option 2: Deploy via Supabase CLI (Faster for Multiple Functions)

### Step 1: Install Supabase CLI

**macOS (using Homebrew):**
```bash
brew install supabase/tap/supabase
```

**Or using npm:**
```bash
npm install -g supabase
```

**Or using Deno:**
```bash
deno install --allow-all --name supabase https://deno.land/x/supabase@1.0.0/cli.ts
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window for authentication.

### Step 3: Link Your Project

```bash
supabase link --project-ref owqjyaiptexqwafzmcwy
```

### Step 4: Deploy Functions

Deploy all three updated functions:

```bash
# Deploy gocardless-collect-payment
supabase functions deploy gocardless-collect-payment

# Deploy gocardless-callback
supabase functions deploy gocardless-callback

# Deploy gocardless-webhook
supabase functions deploy gocardless-webhook
```

### Step 5: Verify Deployment

```bash
# List all functions to verify
supabase functions list
```

---

## Verification Checklist

After deployment, verify:

- [ ] All three functions deployed successfully
- [ ] No errors in function logs
- [ ] Functions show as "Active" in dashboard
- [ ] Environment variables are still set correctly
- [ ] Test a function call if possible

---

## Troubleshooting

### Error: "Function not found"
- Make sure the function name matches exactly
- Check that the function exists in your project

### Error: "Environment variable not set"
- Go to: Project Settings → Edge Functions → Secrets
- Verify `SERVICE_ROLE_KEY` is set (required after security fix)
- Verify all other required secrets are present

### Error: "Deployment failed"
- Check function logs for syntax errors
- Verify all imports are correct
- Check that TypeScript/Deno syntax is valid

### Function logs show errors
- Check Supabase Dashboard → Edge Functions → [Function Name] → Logs
- Look for runtime errors or missing environment variables

---

## Post-Deployment Testing

1. **Test GoCardless Connection:**
   - Go to Settings → GoCardless
   - Try connecting (if not already connected)
   - Verify connection succeeds

2. **Test Payment Collection:**
   - Complete a job with a GoCardless customer
   - Verify payment status is set to 'processing'
   - Check that webhook updates status correctly

3. **Monitor Logs:**
   - Watch function logs for 24 hours
   - Check for any errors or warnings

---

## Rollback Plan

If deployment causes issues:

1. **Via Dashboard:**
   - Go to function → View previous versions
   - Restore previous version

2. **Via CLI:**
   - Revert to previous commit
   - Redeploy previous version

---

## Files to Deploy

Make sure you're deploying these exact files:

1. `supabase/functions/gocardless-collect-payment/index.ts`
2. `supabase/functions/gocardless-callback/index.ts`
3. `supabase/functions/gocardless-webhook/index.ts`

---

**Next Steps:** After deployment, proceed to Phase 2 (Testing & QA)





