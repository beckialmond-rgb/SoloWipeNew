# Stripe Checkout Payment Error Fix

## 🔍 Issue Identified

**Error:** "Failed to send a request to Edge Function" when clicking "Start Free Trial" or "£150/year" buttons in the paywall modal.

**Root Cause:** The `create-checkout` edge function was not deployed to Supabase.

---

## ✅ Fix Applied

### Deployed Missing Edge Functions

1. **`create-checkout`** - Creates Stripe checkout sessions for subscriptions
   - Deployed successfully ✅
   - Handles monthly (£15/month) and annual (£150/year) plans
   - Includes 7-day free trial

2. **`check-subscription`** - Checks user's current subscription status
   - Deployed successfully ✅
   - Used to verify subscription status

3. **`customer-portal`** - Opens Stripe customer portal for subscription management
   - Deployed successfully ✅
   - Allows users to manage their subscription

---

## 🧪 Testing

### Test Subscription Flow:

1. **Complete 10 jobs** to trigger paywall
2. **Click "Start Free Trial"** button
   - Should redirect to Stripe checkout
   - Should show 7-day free trial
   - Should show £15/month after trial

3. **Or click "£150/year"** button
   - Should redirect to Stripe checkout
   - Should show 7-day free trial
   - Should show £150/year after trial

### Expected Behavior:

- ✅ Paywall modal appears when limit reached
- ✅ Clicking subscription buttons redirects to Stripe
- ✅ No "Failed to send request" errors
- ✅ Checkout session created successfully

---

## 📋 Function Details

### `create-checkout` Function

**Location:** `supabase/functions/create-checkout/index.ts`

**Features:**
- Creates Stripe checkout sessions
- Supports monthly and annual plans
- Includes 7-day free trial
- Checks for existing subscriptions
- Returns checkout URL for redirect

**Required Secrets:**
- `STRIPE_SECRET_KEY` - Stripe API secret key

**Price IDs:**
- Monthly: `price_1SdstJ4hy5D3Fg1bnepMLpw6` (£15/month)
- Annual: `price_1SdstJ4hy5D3Fg1bliu55p34` (£150/year)

---

## 🔧 Troubleshooting

### If you still see errors:

1. **Check function is deployed:**
   ```bash
   npx supabase functions list --project-ref owqjyaiptexqwafzmcwy
   ```
   Look for `create-checkout` in the list.

2. **Check Stripe secret key:**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Ensure `STRIPE_SECRET_KEY` is set
   - Must be a valid Stripe secret key (starts with `sk_`)

3. **Check browser console:**
   - Open DevTools (F12) → Console
   - Look for detailed error logs
   - Check Network tab for HTTP errors

4. **Verify price IDs:**
   - Ensure Stripe price IDs match in `create-checkout/index.ts`
   - Price IDs must exist in your Stripe account

---

## ✅ Status

**All subscription functions are now deployed and ready to use!**

- ✅ `create-checkout` - Deployed
- ✅ `check-subscription` - Deployed  
- ✅ `customer-portal` - Deployed

The payment flow should now work correctly when users click subscription buttons in the paywall modal.

