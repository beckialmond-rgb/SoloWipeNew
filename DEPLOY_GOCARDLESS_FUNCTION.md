# Deploy GoCardless Create Mandate Function

## 🚨 Issue: "Unable to reach server" when inviting to Direct Debit

This error means the `gocardless-create-mandate` edge function is not deployed or not accessible.

## ✅ Quick Fix: Deploy the Function

### Option 1: Deploy via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions

2. **Check if function exists:**
   - Look for `gocardless-create-mandate` in the list
   - If it's missing, you need to deploy it

3. **If function exists but not working:**
   - Click on the function
   - Check the logs for errors
   - Try redeploying it

### Option 2: Deploy via CLI (Recommended)

1. **Login to Supabase:**
   ```bash
   cd /Users/rebeccaalmond/Downloads/solowipe-main
   npx supabase login
   ```
   - This will open a browser to authenticate

2. **Link to your project:**
   ```bash
   npx supabase link --project-ref owqjyaiptexqwafzmcwy
   ```

3. **Deploy the function:**
   ```bash
   npx supabase functions deploy gocardless-create-mandate
   ```

4. **Verify deployment:**
   - Go to Supabase Dashboard → Edge Functions
   - You should see `gocardless-create-mandate` in the list
   - Status should be "Active"

---

## 🔍 Verify Function is Working

### Test in Browser Console:

1. Open your app in browser
2. Open DevTools (F12) → Console
3. Run this test:
   ```javascript
   const { data, error } = await supabase.functions.invoke('gocardless-create-mandate', {
     body: { 
       customerId: 'test-id',
       customerName: 'Test Customer',
       exitUrl: window.location.origin + '/customers',
       successUrl: window.location.origin + '/customers?mandate=success'
     }
   });
   console.log('Result:', { data, error });
   ```

### Expected Results:

**If function is deployed:**
- You'll get an error about invalid customer ID (expected)
- This confirms the function is reachable

**If function is NOT deployed:**
- You'll get "Failed to send request" or network error
- This confirms the function needs deployment

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] **Supabase CLI is installed:**
  ```bash
  npm install -g supabase
  # OR use npx (no install needed)
  ```

- [ ] **Function file exists:**
  - Check: `supabase/functions/gocardless-create-mandate/index.ts`
  - File should exist and have code

- [ ] **Secrets are configured in Supabase:**
  - Go to: Supabase Dashboard → Edge Functions → Secrets
  - Required secrets:
    - `SERVICE_ROLE_KEY`
    - `GOCARDLESS_CLIENT_ID`
    - `GOCARDLESS_CLIENT_SECRET`
    - `GOCARDLESS_ENVIRONMENT`
    - `GOCARDLESS_WEBHOOK_SECRET` (optional for mandate creation)

---

## 🛠️ Troubleshooting

### Error: "Access token not provided"
**Fix:** Run `npx supabase login` first

### Error: "Function not found"
**Fix:** Make sure you're in the project root directory with `supabase/functions/gocardless-create-mandate/` folder

### Error: "Failed to deploy"
**Fix:** 
- Check function code for syntax errors
- Verify all imports are correct
- Check Supabase Dashboard for deployment logs

### Error: "Function deployed but still can't reach"
**Fix:**
- Wait 1-2 minutes for deployment to propagate
- Clear browser cache
- Check browser console for specific error
- Verify Supabase URL is correct in your app

---

## ✅ After Deployment

1. **Test the invite flow:**
   - Open a customer detail modal
   - Click "Invite to Direct Debit"
   - Should work without "unable to reach server" error

2. **Check function logs:**
   - Supabase Dashboard → Edge Functions → `gocardless-create-mandate` → Logs
   - Should see request logs when you try to invite

3. **If still getting errors:**
   - Check browser console for detailed error
   - Check function logs in Supabase Dashboard
   - Verify GoCardless is connected in Settings

---

## 🚀 Quick Deploy Command

Run this single command (after login):
```bash
npx supabase functions deploy gocardless-create-mandate --project-ref owqjyaiptexqwafzmcwy
```

