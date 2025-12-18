# Phase 4: Current Payment Configuration

## Stripe Configuration

### Current Price IDs (Hardcoded)
**File:** `supabase/functions/create-checkout/index.ts`

```typescript
const PRICES = {
  monthly: "price_1SdstJ4hy5D3Fg1bnepMLpw6", // £15/month
  annual: "price_1SdstJ4hy5D3Fg1bliu55p34",  // £150/year (save £30)
};
```

**File:** `src/constants/subscription.ts`

```typescript
export const SUBSCRIPTION_TIERS = {
  monthly: {
    price_id: "price_1SdstJ4hy5D3Fg1bnepMLpw6",
    product_id: "prod_Tb5gxc2at1xv9q",
    // ...
  },
  annual: {
    price_id: "price_1SdstJ4hy5D3Fg1bliu55p34",
    product_id: "prod_Tb5gDMeCzU9gNN",
    // ...
  },
};
```

### Webhook Endpoint
```
https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/check-subscription
```

### Customer Portal
- Enabled: Yes (configure in Stripe Dashboard)
- Success URL: `${origin}/settings?subscription=success`
- Cancel URL: `${origin}/settings?subscription=cancelled`

### Trial Period
- 7 days free trial configured

---

## GoCardless Configuration

### OAuth Endpoints
**Sandbox:**
- Base URL: `https://connect-sandbox.gocardless.com`
- Authorization: `/oauth/authorize`
- Token Exchange: `/oauth/access_token`

**Live:**
- Base URL: `https://connect.gocardless.com`
- Authorization: `/oauth/authorize`
- Token Exchange: `/oauth/access_token`

### Callback URL
```
https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-callback
```

### Webhook Endpoint
```
https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook
```

### Trusted Domains (in code)
**File:** `supabase/functions/gocardless-connect/index.ts`

```typescript
const trustedDomains = ['lovable.app', 'lovableproject.com', 'solowipe.co.uk'];
```

Also allows: `localhost` and `127.0.0.1` for development

### Redirect URL Logic
**File:** `src/components/GoCardlessSection.tsx`

```typescript
const redirectUrl = window.location.hostname === 'solowipe.co.uk'
  ? 'https://solowipe.co.uk/settings?gocardless=callback'
  : 'http://localhost:3000/settings?gocardless=callback';
```

---

## Required Supabase Secrets

### Stripe
- `STRIPE_SECRET_KEY` - Stripe secret API key

### GoCardless
- `GOCARDLESS_CLIENT_ID` - OAuth client ID
- `GOCARDLESS_CLIENT_SECRET` - OAuth client secret
- `GOCARDLESS_ENVIRONMENT` - `sandbox` or `live`
- `GOCARDLESS_WEBHOOK_SECRET` - Webhook signing secret

### Supabase (for functions)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

---

## Action Items

### Before Production:
1. ✅ Verify Stripe Price IDs match your Stripe Dashboard
2. ✅ Update Price IDs if you created new prices
3. ✅ Configure Stripe webhook endpoint
4. ✅ Configure GoCardless webhook endpoint
5. ✅ Test both integrations end-to-end
6. ✅ Switch to live mode/environment for production

### If Creating New Stripe Prices:
1. Create prices in Stripe Dashboard
2. Copy new Price IDs
3. Update `supabase/functions/create-checkout/index.ts`
4. Update `src/constants/subscription.ts`
5. Redeploy functions and frontend

---

## Testing

### Stripe Test Card
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

### GoCardless Sandbox
- Use sandbox environment for testing
- Test mandates and payments in sandbox
- Switch to live only after thorough testing
