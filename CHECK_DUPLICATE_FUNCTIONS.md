# Checking Duplicate Edge Functions

## 🔍 What You're Seeing

In the Supabase Functions dashboard, you're seeing `gocardless-callback` listed twice:
1. One deployed "4 days ago" (value: 9)
2. One deployed "28 minutes ago" (value: 2)

## ✅ Good News: These Are Not Duplicates

Supabase Edge Functions **don't create duplicates** when you deploy. What you're seeing is likely:

1. **Deployment History**: The dashboard may show deployment history or version tracking
2. **Display Artifact**: The UI might be showing cached data or multiple views

The **most recent deployment** (28 minutes ago) is the active one with our fixes.

## ✅ Verification: Logs Show Success

The log you shared shows a **successful connection**:
- ✅ Used redirect URI: `https://solowipe.co.uk/gocardless-callback`
- ✅ Environment: SANDBOX
- ✅ Token exchange successful
- ✅ Profile updated
- ✅ Connection confirmed

However, this log is from a **previous successful connection** (Dec 25, 19:05:52).

## 🔍 Current Issue: No Authorization Code

Your current issue is "No authorization code in URL" - this is a **different problem** from the logs shown.

### The Problem

When GoCardless redirects back to your app, it's not including the `code` parameter, which means:
- The redirect URI is either not registered, OR
- The redirect URI doesn't match exactly what was sent

### The Solution

The redirect URI `https://solowipe.co.uk/gocardless-callback` must be registered in your **SANDBOX** GoCardless Dashboard (since your environment is SANDBOX).

## 📋 Action Items

### 1. Verify Redirect URI Registration

Since your environment is SANDBOX, verify:

1. Go to: **https://manage-sandbox.gocardless.com/settings/api**
2. Check "Redirect URIs" section
3. Ensure `https://solowipe.co.uk/gocardless-callback` is registered
4. Verify:
   - ✅ No trailing slash
   - ✅ Exact match: `https://solowipe.co.uk/gocardless-callback`
   - ✅ Registered in SANDBOX dashboard (not live)

### 2. Check Current Logs (Not Old Ones)

To debug your current issue, check **recent** logs:

1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click on `gocardless-connect`
3. Check **recent** invocations (last few minutes/hours)
4. Look for:
   - `Using dynamic redirect_uri: ...`
   - `State parameter contents: ...`

5. Also check `gocardless-callback` logs:
   - Look for recent failed attempts
   - Check if callback is even being invoked

### 3. Test the Flow Again

1. Clear browser cache
2. Go to Settings → GoCardless
3. Click "Connect GoCardless"
4. Complete authorization
5. Check if code parameter is in callback URL

## 🎯 Summary

- **Duplicate Functions**: Not a problem - Supabase doesn't create duplicates
- **Old Successful Log**: Shows the fix works, but that was a previous connection
- **Current Issue**: Redirect URI likely not registered or doesn't match
- **Solution**: Register `https://solowipe.co.uk/gocardless-callback` in SANDBOX dashboard

## ✅ Next Steps

1. ✅ Verify redirect URI is registered in SANDBOX dashboard
2. ✅ Check recent Edge Function logs (not old ones)
3. ✅ Test OAuth flow again
4. ✅ Monitor logs for current attempts

The duplicate function entries are not an issue - focus on registering the redirect URI correctly.

