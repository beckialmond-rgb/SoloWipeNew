# Phase 4: Payment Integrations - Quick Checklist

## 🚀 Stripe Setup (30 minutes)

### 1. Account & Keys
- [ ] Create/verify Stripe account: https://dashboard.stripe.com/
- [ ] Get API keys: **Developers** → **API keys**
- [ ] Add `STRIPE_SECRET_KEY` to Supabase secrets
- [ ] Use test key (`sk_test_...`) for development

### 2. Products & Prices
- [ ] Create product: "SoloWipe Pro"
- [ ] Add monthly price: £15/month
- [ ] Add annual price: £150/year
- [ ] Copy Price IDs
- [ ] Update `supabase/functions/create-checkout/index.ts`:
  ```typescript
  const PRICES = {
    monthly: "price_YOUR_MONTHLY_ID",
    annual: "price_YOUR_ANNUAL_ID",
  };
  ```

### 3. Webhooks
- [ ] Go to **Developers** → **Webhooks** → **Add endpoint**
- [ ] URL: `https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/check-subscription`
- [ ] Select events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Copy webhook signing secret (if needed)

### 4. Customer Portal
- [ ] Go to **Settings** → **Billing** → **Customer portal**
- [ ] Enable customer portal
- [ ] Configure allowed actions

### 5. Test Stripe
- [ ] Test checkout flow in app
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Verify subscription created
- [ ] Test customer portal access

---

## 💳 GoCardless Setup (30 minutes)

### 1. Account & Credentials
- [ ] Create/verify GoCardless account: https://manage.gocardless.com/
- [ ] Go to **Settings** → **API**
- [ ] Copy Client ID and Client Secret
- [ ] Add to Supabase secrets:
  - `GOCARDLESS_CLIENT_ID`
  - `GOCARDLESS_CLIENT_SECRET`
  - `GOCARDLESS_ENVIRONMENT` = `sandbox` (or `live`)

### 2. Redirect URLs
- [ ] Verify callback URL in code:
  ```
  https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-callback
  ```
- [ ] Trusted domains (in code):
  - `solowipe.co.uk`
  - `lovable.app`
  - `lovableproject.com`
  - `localhost` (dev)

### 3. Webhooks
- [ ] Go to **Webhooks** → **Add webhook**
- [ ] URL: `https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook`
- [ ] Select events:
  - `mandates.created`
  - `mandates.active`
  - `mandates.cancelled`
  - `payments.created`
  - `payments.confirmed`
  - `payments.failed`
  - `billing_requests.fulfilled`
- [ ] Copy webhook secret
- [ ] Add `GOCARDLESS_WEBHOOK_SECRET` to Supabase secrets

### 4. Test GoCardless
- [ ] Connect GoCardless account in app
- [ ] Create mandate for test customer
- [ ] Verify mandate created
- [ ] Test payment collection
- [ ] Verify webhook events processed

---

## ✅ Verification Checklist

### Stripe
- [ ] Checkout session creates successfully
- [ ] Subscription activates after payment
- [ ] Webhook updates subscription status
- [ ] Customer portal accessible
- [ ] Subscription cancellation works

### GoCardless
- [ ] OAuth connection successful
- [ ] Mandate creation works
- [ ] Payment collection works
- [ ] Webhook updates mandate/payment status
- [ ] All events processed correctly

---

## 🔗 Quick Links

### Stripe
- **Dashboard**: https://dashboard.stripe.com/
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Products**: https://dashboard.stripe.com/products
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **Test Cards**: https://stripe.com/docs/testing

### GoCardless
- **Dashboard**: https://manage.gocardless.com/
- **API Settings**: https://manage.gocardless.com/settings/api
- **Webhooks**: https://manage.gocardless.com/webhooks
- **Sandbox**: Use sandbox environment for testing

---

## 📝 Current Configuration

### Stripe Prices (Update if needed)
- **Monthly**: `price_1SdstJ4hy5D3Fg1bnepMLpw6` (£15/month)
- **Annual**: `price_1SdstJ4hy5D3Fg1bliu55p34` (£150/year)

**Files to update:**
- `supabase/functions/create-checkout/index.ts` (line 12-13)
- `src/constants/subscription.ts` (line 4, 12)

### GoCardless Endpoints
- **Callback**: `https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-callback`
- **Webhook**: `https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook`

---

## ⚠️ Important Notes

1. **Test Mode First**: Always test in sandbox/test mode before production
2. **Price IDs**: Update code with your actual Stripe Price IDs
3. **Webhook Secrets**: Keep webhook secrets secure
4. **Environment**: Use `sandbox` for testing, `live` for production
5. **Test Transactions**: Use small amounts for initial testing

---

## 🆘 Troubleshooting

**Stripe checkout not working?**
- Check `STRIPE_SECRET_KEY` is set
- Verify Price IDs match Stripe Dashboard
- Check function logs for errors

**GoCardless OAuth failing?**
- Verify credentials are set
- Check redirect URL is in trusted domains
- Verify environment matches (sandbox vs live)

**Webhooks not working?**
- Verify webhook URLs are correct
- Check webhook secrets are set
- Review function logs for errors

---

## Next Steps

Once both integrations are configured:
1. ✅ Test all flows end-to-end
2. ✅ Document any issues
3. ✅ Move to Phase 5: Security & Authentication Hardening
