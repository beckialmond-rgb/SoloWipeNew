# Switch GoCardless to Live Mode

This guide will help you switch GoCardless from sandbox to live/production mode.

## ⚠️ Important Notes

- **Test thoroughly in sandbox first** before switching to live
- **Live mode processes real payments** - ensure you're ready
- **Backup your current sandbox credentials** in case you need to rollback

## Step 1: Get Live Credentials from GoCardless

1. **Go to GoCardless Live Dashboard:**
   - Visit: https://manage.gocardless.com/
   - **Important:** Make sure you're in **Live** mode (not Sandbox)
   - Look for the environment toggle in the top right

2. **Get Your Live Credentials:**
   - Go to: **Settings** → **API**
   - Copy the following:
     - **Client ID** (Live)
     - **Client Secret** (Live)
     - **Webhook Secret** (from Webhooks section)

3. **Verify Redirect URIs:**
   - In the same API Settings page, check **Redirect URIs**
   - Ensure this is registered: `https://solowipe.co.uk/gocardless-callback`
   - **No trailing slash** - must be exact match

## Step 2: Update Supabase Edge Function Secrets

1. **Go to Supabase Dashboard:**
   - Navigate to: **Edge Functions** → **Secrets**
   - Or: Your Supabase Project → Settings → Edge Functions → Secrets

2. **Update the following secrets:**

   | Secret Name | Current Value | New Value |
   |------------|---------------|-----------|
   | `GOCARDLESS_ENVIRONMENT` | `sandbox` | `live` |
   | `GOCARDLESS_CLIENT_ID` | (sandbox client ID) | (live client ID) |
   | `GOCARDLESS_CLIENT_SECRET` | (sandbox secret) | (live secret) |
   | `GOCARDLESS_WEBHOOK_SECRET` | (sandbox webhook secret) | (live webhook secret) |

3. **Save each secret** after updating

## Step 3: Update GoCardless Webhook Endpoint

1. **Go to GoCardless Live Dashboard:**
   - Visit: https://manage.gocardless.com/webhooks
   - Make sure you're in **Live** mode

2. **Update/Create Webhook:**
   - **Webhook URL:** `https://[your-supabase-project].supabase.co/functions/v1/gocardless-webhook`
     - Replace `[your-supabase-project]` with your actual Supabase project reference ID
     - Example: `https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-webhook`
   
3. **Select Webhook Events:**
   - Ensure these events are selected:
     - `payments` (all sub-events)
     - `mandates` (all sub-events)
     - `subscriptions` (if applicable)
     - `payouts` (if applicable)

4. **Save the webhook secret** - you'll need this for Step 2

## Step 4: Verify Code Configuration

The code is already configured to use the environment variable. It will automatically:
- Use `https://api.gocardless.com` when `GOCARDLESS_ENVIRONMENT=live`
- Use `https://connect.gocardless.com` when `GOCARDLESS_ENVIRONMENT=live`

**No code changes needed** - the switch is controlled entirely by the environment variable.

## Step 5: Test Live Connection

1. **Clear any existing connections:**
   - Users may need to disconnect and reconnect GoCardless
   - This ensures they connect with live credentials

2. **Test Connection:**
   - Go to Settings → GoCardless
   - Click "Connect GoCardless"
   - Complete the authorization flow
   - Verify connection succeeds

3. **Test Webhook:**
   - Create a test mandate (if possible in live)
   - Verify webhook receives events
   - Check Supabase Edge Function logs for `gocardless-webhook`

## Step 6: Monitor and Verify

1. **Check Edge Function Logs:**
   - Supabase Dashboard → Edge Functions → `gocardless-connect` → Logs
   - Supabase Dashboard → Edge Functions → `gocardless-callback` → Logs
   - Supabase Dashboard → Edge Functions → `gocardless-webhook` → Logs
   - Look for any errors or warnings

2. **Verify Environment in Logs:**
   - Logs should show: `Environment: live`
   - API calls should go to `api.gocardless.com` (not `api-sandbox`)

3. **Test Payment Flow:**
   - Create a test mandate
   - Process a test payment (if possible)
   - Verify payment appears in GoCardless Live Dashboard

## Rollback Plan

If you need to rollback to sandbox:

1. **Update Supabase Secrets:**
   - Set `GOCARDLESS_ENVIRONMENT` back to `sandbox`
   - Restore sandbox credentials

2. **Users will need to reconnect:**
   - Disconnect GoCardless
   - Reconnect with sandbox credentials

## Checklist

Before going live, verify:

- [ ] Live credentials obtained from GoCardless Dashboard
- [ ] Redirect URI registered in GoCardless Live Dashboard: `https://solowipe.co.uk/gocardless-callback`
- [ ] Supabase secret `GOCARDLESS_ENVIRONMENT` set to `live`
- [ ] Supabase secret `GOCARDLESS_CLIENT_ID` updated to live value
- [ ] Supabase secret `GOCARDLESS_CLIENT_SECRET` updated to live value
- [ ] Supabase secret `GOCARDLESS_WEBHOOK_SECRET` updated to live value
- [ ] Webhook endpoint configured in GoCardless Live Dashboard
- [ ] Test connection successful
- [ ] Webhook receiving events (check logs)
- [ ] Payment flow tested (if possible)

## Support

If you encounter issues:

1. **Check Supabase Edge Function logs** for errors
2. **Check GoCardless Dashboard** for connection status
3. **Verify all secrets are set correctly** in Supabase
4. **Ensure redirect URI matches exactly** in GoCardless Dashboard

## Important URLs

- **GoCardless Live Dashboard:** https://manage.gocardless.com/
- **GoCardless API Settings:** https://manage.gocardless.com/settings/api
- **GoCardless Webhooks:** https://manage.gocardless.com/webhooks
- **Supabase Dashboard:** Your project dashboard

---

**Last Updated:** 2025-01-26
**Status:** Ready for live deployment





