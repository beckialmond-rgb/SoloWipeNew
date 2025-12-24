# Required Supabase Edge Function Secrets

## ✅ Secrets You Need to Add (6 total)

Since Supabase blocks secrets starting with "SUPABASE_" prefix, you only need to add these:

### 1. Service Role Key
- **Name**: `SERVICE_ROLE_KEY`
- **Value**: Your Supabase service_role key (from Dashboard → Settings → API)
- **Format**: JWT starting with `eyJ...`
- **⚠️ Keep Secret** - This is sensitive!

### 2. Stripe Secret Key
- **Name**: `STRIPE_SECRET_KEY`
- **Value**: Your Stripe secret API key
- **Test**: `sk_test_...` (from https://dashboard.stripe.com/apikeys)
- **Live**: `sk_live_...` (for production)
- **⚠️ Keep Secret**

### 3-6. GoCardless Secrets
- **Name**: `GOCARDLESS_CLIENT_ID`
  - **Value**: OAuth client ID from GoCardless Dashboard → Settings → API

- **Name**: `GOCARDLESS_CLIENT_SECRET`
  - **Value**: OAuth client secret from GoCardless Dashboard → Settings → API
  - **⚠️ Keep Secret**

- **Name**: `GOCARDLESS_ENVIRONMENT`
  - **Value**: `sandbox` (for testing) or `live` (for production)

- **Name**: `GOCARDLESS_WEBHOOK_SECRET`
  - **Value**: Webhook signing secret from GoCardless Dashboard → Webhooks
  - **⚠️ Keep Secret**

---

## ℹ️ Auto-Injected Variables (No Need to Add)

These are automatically available in Edge Functions - **do NOT add them as secrets**:

- `SUPABASE_URL` - Automatically injected by Supabase
- `SUPABASE_ANON_KEY` - Automatically injected by Supabase

The code uses `Deno.env.get('SUPABASE_URL')` and `Deno.env.get('SUPABASE_ANON_KEY')`, which will work with the auto-injected values.

---

## 📝 Complete Setup Checklist

### Add to Supabase Secrets (6 items):
- [ ] `SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `GOCARDLESS_CLIENT_ID`
- [ ] `GOCARDLESS_CLIENT_SECRET`
- [ ] `GOCARDLESS_ENVIRONMENT` = `sandbox` (or `live`)
- [ ] `GOCARDLESS_WEBHOOK_SECRET`

### Verify Auto-Injected Variables:
- [ ] Test an edge function to confirm `SUPABASE_URL` is available
- [ ] Check function logs for any "undefined" errors
- [ ] If functions fail, check Supabase Edge Functions documentation

---

## 🧪 Testing

After adding the secrets:

1. Go to Supabase Dashboard → Edge Functions
2. Try invoking a function (e.g., `check-subscription`)
3. Check the function logs for errors
4. If you see "SUPABASE_URL is undefined", contact Supabase support as these should be auto-injected

---

## 🔍 Where to Find Values

### SERVICE_ROLE_KEY
- Supabase Dashboard → **Settings** → **API** → **Project API keys**
- Look for `service_role` key (JWT format: `eyJ...`)
- **⚠️ Never expose this publicly**

### STRIPE_SECRET_KEY
- Stripe Dashboard → **Developers** → **API keys**
- Use test key (`sk_test_...`) for development
- Use live key (`sk_live_...`) for production

### GoCardless Credentials
- GoCardless Dashboard → **Settings** → **API**
- Copy Client ID and Client Secret
- GoCardless Dashboard → **Webhooks** → Copy webhook secret

