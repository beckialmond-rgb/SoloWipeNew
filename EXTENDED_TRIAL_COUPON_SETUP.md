# Extended Trial Coupon Setup Guide

## Overview

SoloWipe supports extended trial periods (30 or 60 days) through Stripe coupon metadata. This allows you to offer longer trials to initial testers while maintaining the standard 7-day trial for regular signups.

---

## How It Works

1. **Default Trial:** All new subscriptions get a 7-day free trial
2. **Extended Trial:** When a coupon with trial metadata is used, it overrides the default trial period
3. **Coupon Codes:** Create special coupon codes in Stripe with metadata indicating trial days

---

## Setting Up Extended Trial Coupons in Stripe

### Step 1: Create a Coupon in Stripe Dashboard

1. Go to [Stripe Dashboard → Products → Coupons](https://dashboard.stripe.com/coupons)
2. Click **"Create coupon"**
3. Configure the coupon:
   - **Name:** e.g., "30 Day Extended Trial" or "Early Tester 60 Days"
   - **ID:** e.g., `TRIAL30` or `TRIAL60` (this is what users will enter)
   - **Type:** Choose your discount type (can be 100% off if you want free trial, or any other discount)
   - **Duration:** Choose based on your needs
   - **Redemption limits:** Optional - limit how many times it can be used

### Step 2: Add Trial Period Metadata

1. Scroll down to **"Metadata"** section
2. Click **"Add metadata"**
3. Add the following:
   - **Key:** `trial_days`
   - **Value:** `30` (for 30-day trial) or `60` (for 60-day trial)

**Example:**
```
Key: trial_days
Value: 30
```

### Step 3: Save the Coupon

Click **"Create coupon"** to save.

---

## Coupon Code Examples

### 30-Day Trial Coupon
- **Coupon ID:** `TRIAL30`
- **Metadata:**
  - `trial_days` = `30`

### 60-Day Trial Coupon
- **Coupon ID:** `TRIAL60`
- **Metadata:**
  - `trial_days` = `60`

### Free Trial + Discount Coupon
You can combine extended trial with discounts:
- **Coupon ID:** `SAVE20TRIAL30`
- **Discount:** 20% off first payment
- **Metadata:**
  - `trial_days` = `30`

---

## How Users Apply Coupons

1. User goes to **Settings → Subscription**
2. Clicks **"Have a coupon or promo code?"**
3. Enters coupon code (e.g., `TRIAL30`)
4. Clicks **"Start Free Trial"**
5. System detects metadata and applies extended trial period
6. User sees the extended trial duration in Stripe checkout

---

## Technical Details

### Checkout Function Logic

The `create-checkout` function:
1. Validates the coupon code
2. Checks for `trial_days` in coupon metadata
3. If found, uses that value instead of default 7 days
4. Creates Stripe checkout session with extended trial period

**Code Location:** `supabase/functions/create-checkout/index.ts`

```typescript
// Check for extended trial in coupon metadata
const trialDaysFromMetadata = coupon.metadata?.trial_days;
if (trialDaysFromMetadata) {
  const parsed = parseInt(trialDaysFromMetadata, 10);
  if (!isNaN(parsed) && parsed > 0) {
    extendedTrialDays = parsed;
  }
}

// Use extended trial or default to 7 days
const trialPeriodDays = extendedTrialDays || 7;
```

---

## Testing Extended Trial Coupons

### Test in Stripe Test Mode

1. Create test coupons with metadata
2. Use test mode checkout
3. Verify trial period in Stripe subscription details
4. Check that subscription status shows `trialing` with correct end date

### Test Flow

1. **Create Test Coupon:**
   - ID: `TEST30`
   - Metadata: `trial_days` = `30`

2. **Apply in App:**
   - Go to Settings
   - Enter `TEST30`
   - Start checkout

3. **Verify in Stripe:**
   - Check subscription in Stripe Dashboard
   - Verify `trial_end` date is 30 days from start
   - Verify `status` is `trialing`

---

## Important Notes

### Trial Period Limits
- Stripe supports trial periods from 1 to 730 days
- Recommended: 7, 30, or 60 days for SoloWipe

### Coupon Validation
- Coupon must be valid and not expired
- Coupon must exist in Stripe
- Metadata key must be exactly `trial_days`
- Metadata value must be a valid positive integer

### Existing Subscriptions
- Coupons with extended trials only apply to **new subscriptions**
- Cannot modify trial period of existing subscriptions
- Users must cancel and resubscribe to use extended trial coupon

### Best Practices
1. **Use descriptive coupon IDs:** `TRIAL30`, `EARLY60`, etc.
2. **Set redemption limits:** Prevent abuse
3. **Set expiration dates:** Make coupons time-limited if needed
4. **Document coupon codes:** Keep track of active coupons
5. **Test thoroughly:** Always test in Stripe test mode first

---

## Troubleshooting

### Coupon Not Applying Extended Trial

**Check:**
1. Coupon metadata has key `trial_days` (exact spelling)
2. Metadata value is a valid number (e.g., `30` not `"30 days"`)
3. Coupon is valid and not expired
4. Check Stripe Dashboard → Logs for errors

### Trial Period Still Shows 7 Days

**Possible Causes:**
1. Metadata not set correctly on coupon
2. Coupon not applied to checkout session
3. Check function logs for coupon validation errors

**Solution:**
1. Verify coupon metadata in Stripe Dashboard
2. Check edge function logs in Supabase
3. Re-test with a fresh coupon code

---

## Example Use Cases

### Early Beta Testers
- Create `BETA30` coupon with 30-day trial
- Share with select users
- They get extended trial period

### Launch Promotion
- Create `LAUNCH60` coupon with 60-day trial
- Use for launch marketing
- Limited redemption (e.g., first 100 users)

### Partner Discounts
- Combine extended trial with discount
- Example: 20% off + 30-day trial
- Metadata: `trial_days` = `30`

---

## Security Considerations

1. **Coupon IDs are case-sensitive:** `TRIAL30` ≠ `trial30`
2. **Validate on server:** Always validate in edge function (already implemented)
3. **Rate limiting:** Stripe has built-in rate limits
4. **Redemption limits:** Set limits to prevent abuse
5. **Monitor usage:** Check Stripe Dashboard for unusual patterns

---

## Summary

Extended trial coupons provide flexibility for:
- ✅ Offering longer trials to initial testers
- ✅ Running promotional campaigns
- ✅ Partner programs
- ✅ Special marketing offers

The system automatically detects and applies extended trials when coupon metadata includes `trial_days`, making it easy to manage different trial periods without code changes.





