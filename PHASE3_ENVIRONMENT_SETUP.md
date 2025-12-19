# Phase 3: Environment Configuration Guide

## Overview
This phase configures all environment variables needed for the application to run in production.

---

## Part 1: Netlify Frontend Environment Variables

### Required Variables

These variables are used by the React app (Vite) and must start with `VITE_` prefix.

| Variable Name | Value | Description | Where to Find |
|--------------|-------|-------------|---------------|
| `VITE_SUPABASE_URL` | `https://owqjyaiptexqwafzmcwy.supabase.co` | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_DikafC7lHxXB2lySytgEFQ_mHNZTSkF` | Supabase anon/publishable key | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_PROJECT_ID` | `owqjyaiptexqwafzmcwy` | Supabase project ID | Supabase Dashboard → Settings → General |

### Setup Steps

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com/
   - Select your site

2. **Navigate to Environment Variables**
   - Go to: **Site settings** → **Environment variables**
   - Or: **Site settings** → **Build & deploy** → **Environment**

3. **Add Each Variable**
   - Click **"Add a variable"** or **"Add variable"**
   - Enter variable name (exactly as shown above)
   - Enter variable value
   - Select scope:
     - ✅ **Production** (for live site)
     - ✅ **Deploy previews** (for PR previews)
     - ✅ **Branch deploys** (for staging)
   - Click **"Save"**

4. **Repeat for All Variables**
   - Add all 3 variables listed above
   - Double-check spelling and values

5. **Redeploy Site**
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**
   - Or push a new commit to trigger deployment

### Verification

After deployment, verify variables are loaded:

1. **Check Build Logs**
   - Go to **Deploys** → Latest deploy → **Deploy log**
   - Look for any environment variable warnings
   - Build should complete successfully

2. **Test in Browser**
   - Open your site
   - Open browser console (F12)
   - Check for errors related to Supabase
   - Variables should be accessible via `import.meta.env.VITE_SUPABASE_URL`

3. **Quick Test Query**
   ```javascript
   // In browser console on your site
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   console.log('Project ID:', import.meta.env.VITE_SUPABASE_PROJECT_ID);
   ```
   Should show your values (not undefined)

---

## Part 2: Supabase Edge Functions Secrets

### Required Secrets

These secrets are used by Supabase Edge Functions (server-side) and are encrypted.

| Secret Name | Description | Where to Find |
|------------|-------------|---------------|
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ **SECRET** - Service role key | Supabase Dashboard → Settings → API |
| `STRIPE_SECRET_KEY` | Stripe secret API key | Stripe Dashboard → Developers → API keys |
| `GOCARDLESS_CLIENT_ID` | GoCardless OAuth client ID | GoCardless Dashboard → Settings → API |
| `GOCARDLESS_CLIENT_SECRET` | ⚠️ **SECRET** - GoCardless client secret | GoCardless Dashboard → Settings → API |
| `GOCARDLESS_ENVIRONMENT` | `sandbox` or `live` | Set to `sandbox` for testing, `live` for production |
| `GOCARDLESS_WEBHOOK_SECRET` | ⚠️ **SECRET** - Webhook signing secret | GoCardless Dashboard → Webhooks → Endpoint secret |

### Setup Steps

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com/project/owqjyaiptexqwafzmcwy
   - Navigate to: **Project Settings** → **Edge Functions** → **Secrets**

2. **Add Each Secret**
   - Click **"Add new secret"**
   - Enter secret name (exactly as shown above)
   - Enter secret value
   - Click **"Add secret"**
   - ⚠️ **Important:** Secrets are encrypted and cannot be viewed after creation

3. **Repeat for All Secrets**
   - Add all 8 secrets listed above
   - Double-check spelling (case-sensitive!)

### Secret Details

#### Supabase Secrets
- **SUPABASE_URL**: `https://owqjyaiptexqwafzmcwy.supabase.co`
- **SUPABASE_ANON_KEY**: Found in Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
- **SUPABASE_SERVICE_ROLE_KEY**: ⚠️ **KEEP SECRET** - Found in Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`

#### Stripe Secrets
- **STRIPE_SECRET_KEY**: 
  - Test: `sk_test_...` (from Stripe Dashboard → Developers → API keys)
  - Live: `sk_live_...` (for production)
  - Get from: https://dashboard.stripe.com/apikeys

#### GoCardless Secrets
- **GOCARDLESS_CLIENT_ID**: Found in GoCardless Dashboard → Settings → API → OAuth credentials
- **GOCARDLESS_CLIENT_SECRET**: Found in GoCardless Dashboard → Settings → API → OAuth credentials
- **GOCARDLESS_ENVIRONMENT**: 
  - `sandbox` for testing
  - `live` for production
- **GOCARDLESS_WEBHOOK_SECRET**: Found in GoCardless Dashboard → Webhooks → Your webhook endpoint → Secret

### Verification

1. **Test Edge Function**
   - Go to Supabase Dashboard → Edge Functions
   - Try calling a function (e.g., `check-subscription`)
   - Check function logs for errors
   - Should not show "secret not found" errors

2. **Check Function Logs**
   - Go to **Edge Functions** → Select function → **Logs**
   - Look for any secret-related errors
   - Functions should be able to access secrets

---

## Part 3: Security Checklist

### ✅ No Hardcoded Secrets

Verify no secrets are hardcoded in code:

- [ ] No API keys in `src/` files
- [ ] No secrets in `public/` files
- [ ] No secrets in `.env` file (if committed)
- [ ] `.env` is in `.gitignore`
- [ ] No secrets in build output

### ✅ Environment Variable Usage

Verify code uses environment variables correctly:

- [ ] Frontend uses `import.meta.env.VITE_*`
- [ ] Edge Functions use `Deno.env.get()`
- [ ] No fallback to hardcoded values
- [ ] Error handling for missing variables

### ✅ Key Rotation

- [ ] Document where to rotate keys
- [ ] Know how to update keys if compromised
- [ ] Service role key is kept secret (never exposed to client)

---

## Part 4: Testing Environment Variables

### Frontend Testing

1. **Build Locally**
   ```bash
   npm run build
   npm run preview
   ```

2. **Check Build Output**
   - Variables should be replaced in build
   - No `undefined` values in console

3. **Test in Browser**
   - Open site
   - Check browser console
   - Verify Supabase connection works

### Edge Functions Testing

1. **Test Function Locally** (if using Supabase CLI)
   ```bash
   supabase functions serve check-subscription
   ```

2. **Test Function in Dashboard**
   - Go to Edge Functions → Invoke
   - Test with sample payload
   - Check logs for errors

3. **Verify Secrets Access**
   - Functions should access secrets without errors
   - Check function logs for "secret not found" errors

---

## Quick Reference: Where to Find Values

### Supabase Values
- **Dashboard**: https://app.supabase.com/project/owqjyaiptexqwafzmcwy
- **Settings → API**: All Supabase keys
- **Settings → General**: Project ID

### Stripe Values
- **Dashboard**: https://dashboard.stripe.com/
- **Developers → API keys**: Secret keys
- **Developers → Webhooks**: Webhook endpoints

### GoCardless Values
- **Dashboard**: https://manage.gocardless.com/
- **Settings → API**: OAuth credentials
- **Webhooks**: Webhook secrets

---

## Troubleshooting

### Issue: Variables not loading in Netlify
**Solutions:**
- ✅ Check variable names start with `VITE_`
- ✅ Redeploy site after adding variables
- ✅ Check build logs for errors
- ✅ Verify variables are set for correct environment (Production/Preview)

### Issue: Edge Functions can't access secrets
**Solutions:**
- ✅ Verify secret names match exactly (case-sensitive)
- ✅ Check function logs for specific error
- ✅ Ensure secrets are added (not just environment variables)
- ✅ Redeploy functions after adding secrets

### Issue: Build fails with undefined variables
**Solutions:**
- ✅ Check all required variables are set
- ✅ Verify variable names are correct
- ✅ Check for typos in variable names
- ✅ Ensure variables are set for correct environment

### Issue: Supabase connection fails
**Solutions:**
- ✅ Verify `VITE_SUPABASE_URL` is correct
- ✅ Verify `VITE_SUPABASE_PUBLISHABLE_KEY` is correct
- ✅ Check Supabase project is active
- ✅ Verify network/firewall allows connections

---

## Environment-Specific Configuration

### Development (Local)
- Use `.env` file (not committed)
- Copy from `.env.example` if exists
- Run `npm run dev`

### Staging/Preview
- Set variables in Netlify for "Deploy previews"
- Use test/sandbox API keys
- Set `GOCARDLESS_ENVIRONMENT=sandbox`

### Production
- Set variables in Netlify for "Production"
- Use live API keys
- Set `GOCARDLESS_ENVIRONMENT=live`
- ⚠️ Double-check all values before going live

---

## Checklist

### Netlify Environment Variables
- [ ] `VITE_SUPABASE_URL` added
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` added
- [ ] `VITE_SUPABASE_PROJECT_ID` added
- [ ] Variables set for Production
- [ ] Variables set for Deploy previews
- [ ] Site redeployed after adding variables
- [ ] Variables verified in browser console

### Supabase Edge Functions Secrets
- [ ] `SUPABASE_URL` added
- [ ] `SUPABASE_ANON_KEY` added
- [ ] `SUPABASE_SERVICE_ROLE_KEY` added ⚠️
- [ ] `STRIPE_SECRET_KEY` added
- [ ] `GOCARDLESS_CLIENT_ID` added
- [ ] `GOCARDLESS_CLIENT_SECRET` added ⚠️
- [ ] `GOCARDLESS_ENVIRONMENT` added
- [ ] `GOCARDLESS_WEBHOOK_SECRET` added ⚠️
- [ ] All secrets verified (no errors in function logs)

### Security
- [ ] No hardcoded secrets in code
- [ ] `.env` in `.gitignore`
- [ ] Service role key never exposed to client
- [ ] All secrets documented (for rotation)

### Testing
- [ ] Frontend variables tested locally
- [ ] Frontend variables tested in Netlify preview
- [ ] Edge Functions tested
- [ ] All features working with new variables

---

## Next Steps

Once all environment variables are configured:

1. ✅ Test all features work
2. ✅ Verify no errors in logs
3. ✅ Document any issues
4. ✅ Move to Phase 4: Payment Integrations Setup

---

## Important Notes

⚠️ **Security Warnings:**
- Never commit `.env` files to git
- Never expose service role keys to client
- Rotate keys if accidentally exposed
- Use different keys for staging/production

✅ **Best Practices:**
- Use environment-specific values
- Document where to find each value
- Test in staging before production
- Keep backup of production values (securely)
