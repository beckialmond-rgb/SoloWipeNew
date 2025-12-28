# Create 100% Off Coupon for 2 Months

## Quick Method: Stripe Dashboard

### Steps:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Products** → **Coupons**
2. Click **+ Create coupon**
3. Fill in:
   - **Name/ID**: `2_MONTHS_FREE` (or any name you prefer)
   - **Discount**: `100` (Percentage)
   - **Duration**: Select **Repeating**
   - **Duration in months**: `2`
   - **Redemption limits**: Optional (e.g., max 100 uses)
   - **Expiration date**: Optional
4. Click **Create coupon**

### Result:
- First 2 months: **100% off (FREE)**
- After 2 months: **Normal pricing** (£15/month or £150/year)

---

## Method 2: Stripe API

### Using Stripe CLI:
```bash
stripe coupons create \
  --id=2_MONTHS_FREE \
  --percent-off=100 \
  --duration=repeating \
  --duration-in-months=2 \
  --name="2 Months Free - 100% Off"
```

### Using Node.js:
```javascript
const stripe = require('stripe')('sk_test_YOUR_SECRET_KEY');

const coupon = await stripe.coupons.create({
  id: '2_MONTHS_FREE',
  percent_off: 100,
  duration: 'repeating',
  duration_in_months: 2,
  name: '2 Months Free - 100% Off',
});
```

### Using cURL:
```bash
curl https://api.stripe.com/v1/coupons \
  -u sk_test_YOUR_SECRET_KEY: \
  -d "id=2_MONTHS_FREE" \
  -d "percent_off=100" \
  -d "duration=repeating" \
  -d "duration_in_months=2" \
  -d "name=2 Months Free - 100% Off"
```

---

## How It Works

### For Monthly Subscription (£15/month):
- **Month 1**: FREE (100% off)
- **Month 2**: FREE (100% off)
- **Month 3+**: £15/month (normal price)

### For Annual Subscription (£150/year):
- **First 2 months**: FREE (100% off)
- **Remaining 10 months**: £150/year (normal price)

---

## Testing

### Test in Stripe Dashboard:
1. Create the coupon in **Test mode**
2. Go to your app's subscription page
3. Click "Have a coupon code?"
4. Enter: `2_MONTHS_FREE`
5. Select a plan and complete checkout
6. Verify in Stripe Dashboard that:
   - First invoice shows £0.00
   - Second invoice shows £0.00
   - Third invoice shows normal price

### Test with Test Card:
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

---

## Important Notes

### Duration Options Explained:
- **`once`**: Applies to first invoice only (1 month free)
- **`forever`**: Subscription always free (not what you want)
- **`repeating`**: Free for X months, then normal price ✅ **Use this for 2 months**

### Coupon vs Trial:
- **7-day trial** (current): No charge for 7 days, then charges
- **2-month coupon**: First 2 invoices are free, then charges
- **Both can work together**: User gets 7-day trial + 2 months free = ~2.2 months total free

---

## Example: Complete Flow

### User Experience:
1. User signs up → Gets 10 free jobs (usage-based)
2. User subscribes → Gets 7-day free trial
3. User applies `2_MONTHS_FREE` coupon → Gets 2 additional months free
4. **Total free period**: ~2.2 months
5. After that: Normal pricing

### Timeline:
```
Day 0:   Sign up (10 free jobs)
Day 1:   Subscribe with coupon
Day 1-7: Free trial (no charge)
Day 8:   First invoice - FREE (coupon applied)
Day 38:  Second invoice - FREE (coupon applied)
Day 68:  Third invoice - £15/month (normal price)
```

---

## Security & Limits

### Recommended Settings:
```javascript
{
  id: '2_MONTHS_FREE',
  percent_off: 100,
  duration: 'repeating',
  duration_in_months: 2,
  max_redemptions: 100,        // Limit to 100 uses
  redeem_by: 1735689600,       // Expires Dec 31, 2024 (Unix timestamp)
}
```

### Best Practices:
- ✅ Use descriptive coupon IDs
- ✅ Set redemption limits to prevent abuse
- ✅ Set expiration dates for time-limited offers
- ✅ Test in test mode first
- ✅ Monitor coupon usage in Stripe Dashboard

---

## Using the Coupon

### In Your App:
1. User goes to subscription page
2. Clicks "Have a coupon code?"
3. Enters: `2_MONTHS_FREE`
4. Selects monthly or annual plan
5. Completes checkout
6. Coupon automatically applied ✅

### Programmatically:
```typescript
// In your code
const url = await createCheckout('monthly', '2_MONTHS_FREE');
```

---

## Troubleshooting

### Coupon Not Working?
1. ✅ Check coupon ID is correct (case-sensitive)
2. ✅ Verify coupon is valid (not expired)
3. ✅ Check redemption limit hasn't been reached
4. ✅ Ensure coupon is in same Stripe mode (test/live)
5. ✅ Check Stripe Dashboard for coupon status

### Common Errors:
- **"Coupon code not found"**: Check ID spelling
- **"Invalid or expired coupon"**: Create new coupon or extend expiration
- **"Maximum redemptions reached"**: Increase limit or create new coupon

---

## Next Steps

1. **Create the coupon** using one of the methods above
2. **Test it** in your app with test mode
3. **Deploy** to production when ready
4. **Share coupon code** with users (via email, landing page, etc.)

---

## Alternative: Different Free Periods

### 1 Month Free:
```javascript
duration: 'once'  // or 'repeating' with duration_in_months: 1
```

### 3 Months Free:
```javascript
duration: 'repeating',
duration_in_months: 3
```

### 6 Months Free:
```javascript
duration: 'repeating',
duration_in_months: 6
```





