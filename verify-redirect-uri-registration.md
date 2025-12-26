# Verify Redirect URI Registration - Quick Checklist

## 🎯 Your Exact Redirect URI

Based on the logs, your app is using:
```
https://solowipe.co.uk/gocardless-callback
```

## ✅ Verification Steps

### Step 1: Check Your Environment

Your logs show `Environment: SANDBOX`, so you need to check the **SANDBOX** dashboard.

### Step 2: Verify in GoCardless SANDBOX Dashboard

1. **Go to:** https://manage-sandbox.gocardless.com/settings/api
2. **Login** to your sandbox account
3. **Scroll to** "Redirect URIs" section
4. **Check** if this exact URI is in the list:
   ```
   https://solowipe.co.uk/gocardless-callback
   ```

### Step 3: Verify Exact Match

The URI must match **EXACTLY**:

✅ **Correct:**
```
https://solowipe.co.uk/gocardless-callback
```

❌ **Wrong (common mistakes):**
```
https://solowipe.co.uk/gocardless-callback/    ← Trailing slash
http://solowipe.co.uk/gocardless-callback      ← Wrong protocol
https://www.solowipe.co.uk/gocardless-callback ← www prefix
```

### Step 4: If Not Registered

If the URI is **NOT** in the list:

1. Click **"Add"** or **"Add Redirect URI"** button
2. Paste: `https://solowipe.co.uk/gocardless-callback`
3. Make sure there's **NO trailing slash**
4. Click **"Save"**
5. Wait 1-2 minutes for changes to propagate

### Step 5: Test Again

1. Clear browser cache (Cmd+Shift+R)
2. Go to your app → Settings → GoCardless
3. Click "Connect GoCardless"
4. Complete authorization
5. Should now redirect with `code` parameter ✅

## 🔍 Quick Test

After registering, when you click "Connect GoCardless" and complete authorization, you should be redirected to:

```
https://solowipe.co.uk/gocardless-callback?code=abc123...&state=xyz...
```

If you're redirected to:

```
https://solowipe.co.uk/gocardless-callback
```

(without the `code` parameter), then the redirect URI is still not registered correctly.

