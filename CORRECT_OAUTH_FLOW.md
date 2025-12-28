# Correct GoCardless OAuth Flow

## ✅ The Right Way

### Step 1: Start from Settings

1. Go to your app
2. Navigate to **Settings** → **GoCardless** section
3. Find the "Connect GoCardless" button
4. **Click "Connect GoCardless"**

### Step 2: Authorization in GoCardless

1. You'll be redirected to GoCardless authorization page
2. Login to your GoCardless account (if not already)
3. Review the permissions
4. **Click "Allow" or "Authorize"** to grant access

### Step 3: Redirect Back

1. GoCardless will redirect you back to your app
2. The URL should be: `https://solowipe.co.uk/gocardless-callback?code=abc123...&state=xyz...`
3. The callback page processes the code automatically

### Step 4: Success

1. You'll be redirected to Settings
2. GoCardless connection status shows "Connected"
3. You can now use GoCardless features

---

## ❌ What NOT to Do

**DO NOT:**
- ❌ Type `/gocardless-callback` directly in address bar
- ❌ Bookmark the callback URL and navigate there
- ❌ Navigate to callback page without starting OAuth flow

**If you do this, you'll get:**
- Error: "No authorization code received"
- No parameters in URL
- Connection fails

---

## 🔍 How to Tell if You Did It Wrong

**Wrong way symptoms:**
- URL is just `/gocardless-callback` (no query parameters)
- Error: "No authorization code received"
- No code, no error, no state parameters
- Missing localStorage data

**Right way:**
- URL is `/gocardless-callback?code=...&state=...` (has parameters)
- Code is processed automatically
- Connection succeeds

---

**The callback page is NOT meant to be accessed directly - it's the destination of the OAuth redirect from GoCardless.**





