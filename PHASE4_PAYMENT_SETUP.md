# Phase 4: Payment Integrations Setup Guide

## Overview
This phase configures Stripe (for app subscriptions) and GoCardless (for customer Direct Debit payments).

---

## Part 1: Stripe Configuration

### Step 1: Create/Verify Stripe Account

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/
   - Sign up or log in

2. **Complete Account Setup** (if new)
   - Add business information
   - Verify email
   - Add payment method (for payouts)

3. **Switch to Test Mode** (for testing)
   - Toggle "Test mode" in top right
   - Use test keys for development

### Step 2: Get Stripe API Keys

1. **Go to API Keys**
   - Navigate to: **Developers** → **API keys**
   - Or: https://dashboard.stripe.com/apikeys

2. **Copy Keys**
   - **Publishable key**: `pk_test_...` (for test) or `pk_live_...` (for production)
   - **Secret key**: `sk_test_...` (for test) or `sk_live_...` (for production)
   - ⚠️ **Keep secret key secure** - Never expose to client

3. **Add to Supabase Secrets**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Add: `STRIPE_SECRET_KEY` = Your secret key
   - Use test key for development, live key for production

### Step 3: Create Stripe Products & Prices

Your app uses these subscription tiers:

#### Monthly Subscription
- **Price**: £15/month
- **Price ID**: `price_1SdstJ4hy5D3Fg1bnepMLpw6` (update if needed)

#### Annual Subscription  
- **Price**: £150/year (saves £30)
- **Price ID**: `price_1SdstJ4hy5D3Fg1bliu55p34` (update if needed)

#### Setup Steps:

1. **Go to Products**
   - Navigate to: **Products** → **Add product**
   - Or: https://dashboard.stripe.com/products

2. **Create Product**
   - **Name**: "SoloWipe Pro"
   - **Description**: "Window cleaning business management app"
   - **Type**: Service

3. **Add Monthly Price**
   - Click **"Add price"**
   - **Billing**: Recurring
   - **Price**: £15.00
   - **Billing period**: Monthly
   - **Currency**: GBP
   - Click **"Save"**
   - **Copy the Price ID** (starts with `price_...`)

4. **Add Annual Price**
   - Click **"Add another price"**
   - **Billing**: Recurring
   - **Price**: £150.00
   - **Billing period**: Yearly
   - **Currency**: GBP
   - Click **"Save"**
   - **Copy the Price ID** (starts with `price_...`)

5. **Update Code with Price IDs**
   - Edit: `supabase/functions/create-checkout/index.ts`
   - Update `PRICES` object with your new Price IDs:
   ```typescript
   const PRICES = {
     monthly: "price_YOUR_MONTHLY_PRICE_ID",
     annual: "price_YOUR_ANNUAL_PRICE_ID",
   };
   ```

### Step 4: Configure Stripe Webhooks

1. **Go to Webhooks**
   - Navigate to: **Developers** → **Webhooks**
   - Or: https://dashboard.stripe.com/webhooks

2. **Add Endpoint**
   - Click **"Add endpoint"**
   - **Endpoint URL**: 
     ```
     https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/check-subscription
     ```
   - **Description**: "SoloWipe subscription status updates"

3. **Select Events**
   - Click **"Select events"**
   - Select these events:
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `checkout.session.completed`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
   - Click **"Add events"**

4. **Save Endpoint**
   - Click **"Add endpoint"**
   - **Copy the Signing secret** (starts with `whsec_...`)
   - ⚠️ **Save this securely** - You'll need it for webhook verification

5. **Add Signing Secret to Supabase** (if needed)
   - If your webhook handler verifies signatures, add:
   - `STRIPE_WEBHOOK_SECRET` = Your webhook signing secret

### Step 5: Configure Stripe Customer Portal

1. **Go to Customer Portal**
   - Navigate to: **Settings** → **Billing** → **Customer portal**
   - Or: https://dashboard.stripe.com/settings/billing/portal

2. **Enable Customer Portal**
   - Toggle **"Enable customer portal"** ON

3. **Configure Settings**
   - **Business information**: Add your business name
   - **Allowed actions**: 
     - ✅ Update payment method
     - ✅ Cancel subscription
     - ✅ Update billing information
   - **Save changes**

4. **Test Portal**
   - Use test customer to verify portal works
   - Test cancellation flow

### Step 6: Test Stripe Integration

#### Test Checklist:
- [ ] **Create Checkout Session**
  - Go to Settings → Subscription
  - Click "Subscribe" (Monthly or Annual)
  - Should redirect to Stripe Checkout

- [ ] **Complete Test Payment**
  - Use Stripe test card: `4242 4242 4242 4242`
  - Expiry: Any future date
  - CVC: Any 3 digits
  - Complete checkout

- [ ] **Verify Subscription Created**
  - Check Stripe Dashboard → Customers → Subscriptions
  - Should see active subscription
  - Check Supabase `profiles` table
  - `subscription_status` should be `active`

- [ ] **Test Webhook**
  - Check Supabase Edge Functions → `check-subscription` → Logs
  - Should see webhook events processed
  - Subscription status should update in database

- [ ] **Test Customer Portal**
  - Go to Settings → Subscription
  - Click "Manage subscription"
  - Should open Stripe Customer Portal
  - Test cancellation (can reactivate)

---

## Part 2: GoCardless Configuration

### Step 1: Create/Verify GoCardless Account

1. **Go to GoCardless Dashboard**
   - Visit: https://manage.gocardless.com/
   - Sign up or log in

2. **Complete Account Setup** (if new)
   - Add business information
   - Verify email
   - Complete business verification

3. **Switch to Sandbox** (for testing)
   - Use sandbox environment for development
   - Switch to live for production

### Step 2: Get GoCardless API Credentials

1. **Go to API Settings**
   - Navigate to: **Settings** → **API**
   - Or: https://manage.gocardless.com/settings/api

2. **Get OAuth Credentials**
   - **Client ID**: Copy this value
   - **Client Secret**: ⚠️ Copy this value (keep secret)
   - **Environment**: Note if sandbox or live

3. **Add to Supabase Secrets**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Add: `GOCARDLESS_CLIENT_ID` = Your client ID
   - Add: `GOCARDLESS_CLIENT_SECRET` = Your client secret
   - Add: `GOCARDLESS_ENVIRONMENT` = `sandbox` (or `live`)

### Step 3: Configure GoCardless Redirect URLs

Your app uses dynamic redirect URLs. The callback endpoint is:

**Callback URL:**
```
https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-callback
```

**Trusted Domains** (configured in code):
- `lovable.app`
- `lovableproject.com`
- `solowipe.co.uk`
- `localhost` (for development)

#### Setup Steps:

1. **Go to OAuth Settings**
   - Navigate to: **Settings** → **API** → **OAuth**
   - Or: https://manage.gocardless.com/settings/api/oauth

2. **Add Redirect URI** (if required)
   - Some GoCardless accounts require explicit redirect URIs
   - Add: `https://solowipe.co.uk/settings?gocardless=callback`
   - Add: `https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-callback`
   - Save changes

3. **Verify Code Configuration**
   - Check: `supabase/functions/gocardless-connect/index.ts`
   - Verify trusted domains match your domains
   - Update if needed

### Step 4: Configure GoCardless Webhook

1. **Go to Webhooks**
   - Navigate to: **Webhooks** → **Add webhook**
   - Or: https://manage.gocardless.com/webhooks

2. **Add Webhook Endpoint**
   - **URL**: 
     ```
     https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook
     ```
   - **Description**: "SoloWipe payment and mandate updates"

3. **Select Events**
   - Select these events:
     - ✅ `mandates.created`
     - ✅ `mandates.active`
     - ✅ `mandates.cancelled`
     - ✅ `payments.created`
     - ✅ `payments.confirmed`
     - ✅ `payments.failed`
     - ✅ `billing_requests.fulfilled`
   - Save webhook

4. **Get Webhook Secret**
   - After creating webhook, copy the **Webhook secret**
   - ⚠️ **Save this securely**

5. **Add to Supabase Secrets**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Add: `GOCARDLESS_WEBHOOK_SECRET` = Your webhook secret

### Step 5: Test GoCardless Integration

#### Test Checklist:

- [ ] **Connect GoCardless Account**
  - Go to Settings → GoCardless
  - Click "Connect GoCardless"
  - Should redirect to GoCardless OAuth
  - Complete OAuth flow
  - Should redirect back to app

- [ ] **Verify Connection**
  - Check Settings → GoCardless section
  - Should show "Connected" status
  - Check Supabase `profiles` table
  - `gocardless_organisation_id` should be set
  - `gocardless_access_token_encrypted` should be set

- [ ] **Create Mandate**
  - Go to Customers → Select customer
  - Click "Set up Direct Debit"
  - Complete mandate creation flow
  - Should create billing request
  - Customer should receive mandate link

- [ ] **Verify Mandate Created**
  - Check GoCardless Dashboard → Mandates
  - Should see mandate
  - Check Supabase `customers` table
  - `gocardless_id` should be set
  - `gocardless_mandate_status` should be `pending` or `active`

- [ ] **Test Payment Collection**
  - Complete a job for customer with mandate
  - Payment should be collected automatically
  - Check GoCardless Dashboard → Payments
  - Should see payment
  - Check Supabase `jobs` table
  - `gocardless_payment_id` should be set
  - `payment_status` should be `paid`

- [ ] **Test Webhook**
  - Check Supabase Edge Functions → `gocardless-webhook` → Logs
  - Should see webhook events processed
  - Mandate/payment status should update in database

---

## Part 3: Testing Both Integrations

### End-to-End Test Scenarios

#### Scenario 1: New User Subscription Flow
1. User signs up
2. User sees trial gate (7-day trial)
3. User subscribes via Stripe
4. Subscription activates
5. User can access all features

#### Scenario 2: Customer Direct Debit Setup
1. User connects GoCardless account
2. User adds customer
3. User sets up Direct Debit for customer
4. Customer completes mandate
5. Customer mandate becomes active

#### Scenario 3: Payment Collection
1. User completes job for customer with mandate
2. Payment collected automatically via GoCardless
3. Job marked as paid
4. Payment appears in earnings

#### Scenario 4: Subscription Management
1. User goes to Settings → Subscription
2. User clicks "Manage subscription"
3. Stripe Customer Portal opens
4. User can update payment method
5. User can cancel subscription

---

## Troubleshooting

### Stripe Issues

**Checkout not working?**
- ✅ Verify `STRIPE_SECRET_KEY` is set in Supabase secrets
- ✅ Check Price IDs match Stripe Dashboard
- ✅ Verify webhook endpoint is correct
- ✅ Check function logs for errors

**Webhook not receiving events?**
- ✅ Verify webhook URL is correct
- ✅ Check webhook is enabled in Stripe
- ✅ Verify events are selected
- ✅ Check function logs for webhook calls

**Subscription not updating?**
- ✅ Check `check-subscription` function logs
- ✅ Verify webhook secret is correct
- ✅ Check database for subscription status

### GoCardless Issues

**OAuth not working?**
- ✅ Verify `GOCARDLESS_CLIENT_ID` and `GOCARDLESS_CLIENT_SECRET` are set
- ✅ Check redirect URL is in trusted domains
- ✅ Verify environment (sandbox vs live) matches
- ✅ Check function logs for errors

**Mandate not creating?**
- ✅ Verify GoCardless account is connected
- ✅ Check customer has mobile phone number
- ✅ Verify `gocardless-create-mandate` function logs
- ✅ Check GoCardless Dashboard for billing requests

**Payment not collecting?**
- ✅ Verify mandate is active
- ✅ Check `gocardless-collect-payment` function logs
- ✅ Verify customer has `gocardless_id` set
- ✅ Check GoCardless Dashboard for payments

**Webhook not working?**
- ✅ Verify webhook URL is correct
- ✅ Check `GOCARDLESS_WEBHOOK_SECRET` is set
- ✅ Verify webhook events are selected
- ✅ Check function logs for webhook calls

---

## Security Checklist

- [ ] Stripe secret key never exposed to client
- [ ] GoCardless client secret never exposed to client
- [ ] Webhook secrets stored securely
- [ ] All API keys rotated if compromised
- [ ] Test keys used in development
- [ ] Live keys used only in production

---

## Production Checklist

Before going live:

- [ ] Switch Stripe to live mode
- [ ] Switch GoCardless to live environment
- [ ] Update `GOCARDLESS_ENVIRONMENT` secret to `live`
- [ ] Use live Stripe secret key
- [ ] Use live GoCardless credentials
- [ ] Test with small real transaction
- [ ] Verify webhooks work in production
- [ ] Set up monitoring/alerts

---

## Next Steps

Once both integrations are configured and tested:

1. ✅ Document any issues found
2. ✅ Fix any problems discovered
3. ✅ Move to Phase 5: Security & Authentication Hardening

---

## Quick Reference

### Stripe
- **Dashboard**: https://dashboard.stripe.com/
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Products**: https://dashboard.stripe.com/products
- **Webhooks**: https://dashboard.stripe.com/webhooks
- **Customer Portal**: https://dashboard.stripe.com/settings/billing/portal

### GoCardless
- **Dashboard**: https://manage.gocardless.com/
- **API Settings**: https://manage.gocardless.com/settings/api
- **Webhooks**: https://manage.gocardless.com/webhooks
- **Sandbox**: Use sandbox environment for testing
- **Live**: Switch to live for production
