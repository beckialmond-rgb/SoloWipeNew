# 🚨 Redeploy Function to Fix Error Handling

## Critical: Function Code Updated But Not Deployed

The function code has been updated to properly return error messages, but **it needs to be redeployed** for the changes to take effect.

## Quick Deploy

Run this command:

```bash
npx supabase functions deploy gocardless-create-mandate --project-ref owqjyaiptexqwafzmcwy
```

## Why Redeploy?

The updated function now:
1. ✅ Returns proper error messages for "Access token not active"
2. ✅ Includes `requiresReconnect: true` flag in response
3. ✅ Better error parsing from GoCardless API

The frontend code has been updated to handle these errors, but the **function must be redeployed** for it to work.

## After Redeploying

1. Try the invite again
2. You should see: **"GoCardless connection expired. Please reconnect in Settings."**
3. Go to Settings → GoCardless → Reconnect
4. Complete OAuth flow
5. Try invite again - should work!

