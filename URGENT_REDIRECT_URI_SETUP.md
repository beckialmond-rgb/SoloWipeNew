# ⚠️ URGENT: Register Redirect URI in GoCardless Dashboard

## 🚨 Current Error

```
Connection Failed
No authorization code received from GoCardless.
```

**This means the redirect URI is NOT registered in GoCardless Dashboard.**

---

## ⚡ Quick Fix (2 minutes)

### Your Redirect URI

Your app is sending this redirect URI:
```
https://solowipe.co.uk/gocardless-callback
```

### Register It Now

**Step 1:** Determine your environment
- Check Supabase: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/settings/functions
- Look for `GOCARDLESS_ENVIRONMENT` value

**Step 2:** Go to the correct dashboard

**If SANDBOX:**
- URL: https://manage-sandbox.gocardless.com/settings/api
- Login with your sandbox account

**If LIVE:**
- URL: https://manage.gocardless.com/settings/api
- Login with your live account

**Step 3:** Add Redirect URI

1. Scroll to "Redirect URIs" section
2. Click "Add" or "Add Redirect URI"
3. Paste: `https://solowipe.co.uk/gocardless-callback`
4. **NO trailing slash!**
5. Click Save

**Step 4:** Test

1. Wait 1-2 minutes
2. Clear browser cache
3. Try connecting again

---

## ✅ Exact Requirements

```
✅ https://solowipe.co.uk/gocardless-callback
```

```
❌ https://solowipe.co.uk/gocardless-callback/
❌ http://solowipe.co.uk/gocardless-callback
❌ https://www.solowipe.co.uk/gocardless-callback
```

---

**That's it! This is purely a GoCardless Dashboard configuration step.**

