# Deploy manage-helper-billing Edge Function

## ✅ Function Created

The `manage-helper-billing` edge function has been created at:
- `supabase/functions/manage-helper-billing/index.ts`

## 📋 Pre-Deployment Checklist

### 1. Set Required Environment Variable

**CRITICAL:** You must add `STRIPE_HELPER_PRICE_ID` to Supabase secrets before deploying.

1. **Go to Stripe Dashboard:**
   - Create a price for helper billing (£5/month per helper)
   - Or use an existing price ID
   - Copy the Price ID (starts with `price_...`)

2. **Add to Supabase Secrets:**
   - Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/settings/secrets
   - Click **"Add new secret"**
   - Name: `STRIPE_HELPER_PRICE_ID`
   - Value: Your Stripe price ID (e.g., `price_1ABC...`)
   - Click **"Save"**

### 2. Verify Existing Secrets

Make sure these secrets are already set:
- ✅ `STRIPE_SECRET_KEY` - Stripe API secret key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

---

## 🚀 Deployment Options

### Option 1: Deploy via Supabase CLI (Recommended)

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main

# Login to Supabase (if not already logged in)
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref owqjyaiptexqwafzmcwy

# Deploy the function
npx supabase functions deploy manage-helper-billing
```

### Option 2: Deploy via Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - Navigate to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/functions

2. **Create New Function:**
   - Click **"Create a new function"** or **"New Function"**
   - Name: `manage-helper-billing`

3. **Copy Code:**
   - Open: `supabase/functions/manage-helper-billing/index.ts`
   - Copy ALL the code (Cmd+A, Cmd+C)

4. **Paste and Deploy:**
   - Paste code into the Supabase code editor
   - Click **"Deploy"** or **"Save"**
   - Wait for deployment (10-30 seconds)

---

## ✅ Verify Deployment

1. **Check Function Status:**
   - Go to: https://app.supabase.com/project/owqjyaiptexqwafzmcwy/functions
   - Find `manage-helper-billing` in the list
   - Status should be **"Active"**

2. **Check Function Logs:**
   - Click on `manage-helper-billing`
   - Go to **"Logs"** tab
   - Should see recent log entries (may be empty until first call)

3. **Test the Function:**
   - Use your app's helper management UI
   - Or test via browser console:
   ```javascript
   const { data, error } = await supabase.functions.invoke('manage-helper-billing', {
     headers: {
       Authorization: `Bearer ${session.access_token}`
     },
     body: {
       action: 'activate',
       helper_id: '<team_members.id>'
     }
   });
   console.log('Result:', { data, error });
   ```

---

## 🔍 Function Details

### Endpoint
```
POST /functions/v1/manage-helper-billing
```

### Request Body
```json
{
  "action": "activate" | "deactivate",
  "helper_id": "<UUID>"
}
```

### Response (Success)
```json
{
  "success": true,
  "message": "Helper activated" | "Helper deactivated",
  "subscription_item_id": "<ID or null>"
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Meaningful error message"
}
```

### Security
- ✅ Only owners can call (helpers are blocked)
- ✅ Validates helper belongs to owner
- ✅ Requires active subscription
- ✅ Validates authentication

---

## 🐛 Troubleshooting

### Error: "STRIPE_HELPER_PRICE_ID not set"
- **Solution:** Add the secret to Supabase Dashboard → Settings → Secrets

### Error: "Helper not found or access denied"
- **Solution:** Verify `helper_id` is the correct `team_members.id` and belongs to the owner

### Error: "Owner must have an active subscription"
- **Solution:** Owner needs to have `subscription_status = 'active'` in their profile

### Function not appearing in dashboard
- **Solution:** Wait 1-2 minutes for deployment to propagate, then refresh

---

## 📝 Next Steps

After deployment:
1. ✅ Function is deployed and active
2. ✅ `STRIPE_HELPER_PRICE_ID` secret is set
3. ⏭️ Integrate function calls into frontend helper management UI
4. ⏭️ Test activation/deactivation flows
5. ⏭️ Monitor function logs for any issues

---

## 🔗 Related Files

- Function code: `supabase/functions/manage-helper-billing/index.ts`
- Database migration: `supabase/migrations/20250206000000_add_helper_billing_fields.sql`
- Verification queries: `supabase/migrations/20250206000000_verify_helper_billing_fields.sql`

