# How to Create a 100% Off Coupon in Stripe

## Method 1: Stripe Dashboard (Easiest)

### Steps:
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Coupons**
3. Click **+ Create coupon**
4. Fill in the details:
   - **Name**: `FREE_TRIAL_100_OFF` (or any name you prefer)
   - **Discount**: Select **Percentage** and enter `100`
   - **Duration**: Choose one:
     - **Once**: Applies to one invoice only
     - **Forever**: Applies to all future invoices
     - **Repeating**: Applies for X months (e.g., 3 months free)
   - **Redemption limits**: Optional (e.g., max 100 uses)
   - **Expiration date**: Optional
5. Click **Create coupon**

### Result:
You'll get a coupon ID like: `FREE_TRIAL_100_OFF`

---

## Method 2: Stripe API

### Using Stripe CLI:
```bash
stripe coupons create \
  --id=FREE_TRIAL_100_OFF \
  --percent-off=100 \
  --duration=once
```

### Using Node.js/TypeScript:
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Create 100% off coupon (one-time use)
const coupon = await stripe.coupons.create({
  id: 'FREE_TRIAL_100_OFF',
  percent_off: 100,
  duration: 'once', // or 'forever' or 'repeating'
  name: '100% Off - Free Trial',
  // Optional:
  // max_redemptions: 100, // Limit number of uses
  // redeem_by: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // Expires in 30 days
});

console.log('Coupon created:', coupon.id);
```

### Using cURL:
```bash
curl https://api.stripe.com/v1/coupons \
  -u sk_test_YOUR_SECRET_KEY: \
  -d "id=FREE_TRIAL_100_OFF" \
  -d "percent_off=100" \
  -d "duration=once"
```

---

## Method 3: Apply Coupon to Checkout Session

### Update Your Checkout Function

To apply the coupon to your existing checkout flow, modify `supabase/functions/create-checkout/index.ts`:

```typescript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  customer_email: customerId ? undefined : user.email,
  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],
  mode: "subscription",
  subscription_data: {
    trial_period_days: 7,
  },
  // Add coupon support
  discounts: [
    {
      coupon: 'FREE_TRIAL_100_OFF', // Your coupon ID
    },
  ],
  success_url: `${origin}/settings?subscription=success`,
  cancel_url: `${origin}/settings?subscription=cancelled`,
  metadata: {
    user_id: user.id,
  },
});
```

### Or Make Coupon Optional (Pass as Parameter):

```typescript
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceType, couponCode } = await req.json();
    
    // ... existing code ...
    
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${origin}/settings?subscription=success`,
      cancel_url: `${origin}/settings?subscription=cancelled`,
      metadata: {
        user_id: user.id,
      },
    };
    
    // Add coupon if provided
    if (couponCode) {
      sessionConfig.discounts = [{ coupon: couponCode }];
    }
    
    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    // ... rest of code ...
  }
});
```

---

## Important Notes

### Duration Options:
- **`once`**: Applies to the first invoice only (subscription starts free, then charges)
- **`forever`**: Subscription is free forever (100% off all invoices)
- **`repeating`**: Free for X months, then full price

### For Free Trials:
If you want a **free trial** (no charge for first period), use:
- **Trial period** (what you currently have): `trial_period_days: 7`
- **100% coupon with `once` duration**: First invoice free, then charges

### Difference:
- **Trial**: Customer sees "7-day free trial, then £15/month"
- **100% coupon (once)**: Customer sees "First month free, then £15/month"

---

## Testing

### Test in Stripe Dashboard:
1. Go to **Products** → **Coupons**
2. Find your coupon
3. Click **Preview** to see how it looks
4. Use **Test mode** to test with test cards

### Test with Checkout:
1. Create checkout session with coupon
2. Use test card: `4242 4242 4242 4242`
3. Verify discount is applied
4. Complete checkout
5. Check subscription shows correct pricing

---

## Common Use Cases

### 1. First Month Free:
```typescript
// Coupon: 100% off, duration: once
discounts: [{ coupon: 'FIRST_MONTH_FREE' }]
```

### 2. Forever Free (for specific users):
```typescript
// Coupon: 100% off, duration: forever
discounts: [{ coupon: 'LIFETIME_FREE' }]
```

### 3. 2 Months Free:
```typescript
// Coupon: 100% off, duration: repeating, duration_in_months: 2
discounts: [{ coupon: '2_MONTHS_FREE' }]
```

### 4. 3 Months Free:
```typescript
// Coupon: 100% off, duration: repeating, duration_in_months: 3
discounts: [{ coupon: '3_MONTHS_FREE' }]
```

---

## Security Considerations

1. **Limit Redemptions**: Set `max_redemptions` to prevent abuse
2. **Expiration Dates**: Set `redeem_by` for time-limited offers
3. **Coupon Codes**: Use hard-to-guess IDs (not sequential)
4. **Validation**: Verify coupon exists and is valid before applying

---

## Example: Complete Implementation

```typescript
// Check if coupon is valid before applying
const coupon = await stripe.coupons.retrieve(couponCode);
if (!coupon.valid) {
  throw new Error('Invalid or expired coupon');
}

const session = await stripe.checkout.sessions.create({
  // ... other config ...
  discounts: [{ coupon: couponCode }],
});
```

