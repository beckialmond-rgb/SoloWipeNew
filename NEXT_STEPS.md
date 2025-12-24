# Next Steps After Migration Success ✅

The database migration has been successfully applied! Here's what to do next:

## 1. Verify Migration ✅ (Optional but Recommended)

Run the verification queries in `verify_migration_success.sql` to confirm:
- ✅ `usage_counters` table created
- ✅ Grace period columns added to `profiles`
- ✅ Database functions created
- ✅ RLS policies in place
- ✅ Existing users have usage counters initialized

## 2. Configure Stripe Webhook 🔧 (Required)

### Step 1: Get Your Webhook Endpoint URL
Your Supabase project webhook endpoint:
```
https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/stripe-webhook
```

### Step 2: Add Webhook in Stripe Dashboard
1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your endpoint URL (from Step 1)
4. Select these events to listen to:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
   - `checkout.session.completed` (optional, for logging)
5. Click **"Add endpoint"**

### Step 3: Get Webhook Secret
1. After creating the webhook, click on it
2. Find **"Signing secret"** (starts with `whsec_...`)
3. Copy the secret

### Step 4: Add Secret to Supabase
1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Add new secret:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** (paste the webhook secret from Step 3)
3. Click **"Save"**

### Step 5: Test Webhook (Optional)
Use Stripe CLI to test:
```bash
stripe listen --forward-to https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/stripe-webhook
stripe trigger customer.subscription.updated
```

## 3. Test the Subscription Flow 🧪

### Test Case 1: New User Signup
1. Create a new account
2. Verify usage counter is created (should start at 0 jobs, 0 SMS)
3. Complete 10 jobs
4. Verify modal appears after 10th job
5. Try to complete 11th job → should show paywall

### Test Case 2: Existing User Migration
1. Check an existing user's usage counter
2. Verify it shows their historical completed job count
3. SMS count should be 0 (no historical tracking)

### Test Case 3: Grace Period
1. Simulate payment failure in Stripe (test mode)
2. Verify `grace_period_ends_at` is set to 7 days from now
3. Verify user can view customers but actions are disabled
4. Simulate payment recovery
5. Verify grace period is cleared

### Test Case 4: Subscription Status
1. Subscribe a test user
2. Verify subscription status shows as `active` or `trialing`
3. Complete jobs → should work without limit
4. Send SMS → should work without limit

## 4. Update Environment Variables (If Needed)

Make sure these are set in your Supabase project:
- ✅ `STRIPE_SECRET_KEY` (should already be set)
- ✅ `STRIPE_WEBHOOK_SECRET` (new - add this after webhook setup)

## 5. Monitor & Debug 🔍

### Check Edge Function Logs
1. Supabase Dashboard → Edge Functions → `stripe-webhook`
2. View logs to see webhook events

### Check Database
Monitor these queries:
```sql
-- Check subscription statuses
SELECT 
    id,
    business_name,
    subscription_status,
    grace_period_ends_at,
    subscription_grace_period
FROM profiles
WHERE subscription_status IS NOT NULL;

-- Check usage counters approaching limits
SELECT 
    profile_id,
    jobs_completed_count,
    sms_sent_count,
    free_jobs_limit,
    free_sms_limit,
    jobs_limit_hit_at,
    sms_limit_hit_at
FROM usage_counters
WHERE jobs_completed_count >= 8 OR sms_sent_count >= 8
ORDER BY jobs_completed_count DESC, sms_sent_count DESC;
```

## 6. Important Notes ⚠️

### SMS Tracking
- SMS tracking starts from migration date (existing users start at 0)
- Only SMS sends after migration are counted
- This is expected behavior

### Grace Period Logic
- Grace period is **7 days** from payment failure
- During grace period: users can view data, but actions are disabled
- After grace period: hard lock (paywall shown)

### Usage Limits
- Default: **10 free jobs** and **10 free SMS**
- Can be adjusted per user by updating `free_jobs_limit` and `free_sms_limit` in `usage_counters` table

## 7. Troubleshooting 🐛

### Issue: Usage counters not incrementing
- Check edge function logs
- Verify RLS policies allow updates
- Check database function permissions

### Issue: Webhook not receiving events
- Verify webhook URL is correct
- Check `STRIPE_WEBHOOK_SECRET` is set
- Verify webhook is enabled in Stripe Dashboard
- Check Stripe webhook logs for delivery status

### Issue: Grace period not working
- Verify `grace_period_ends_at` is being set by webhook
- Check profile query includes grace period fields
- Verify `useSoftPaywall` hook is checking grace period correctly

---

**Migration Status:** ✅ Complete  
**Next Required Step:** Configure Stripe Webhook  
**Ready for Testing:** ✅ Yes (after webhook setup)

