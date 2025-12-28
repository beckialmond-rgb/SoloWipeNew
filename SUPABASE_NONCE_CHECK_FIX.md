# Fix: Enable "Skip Nonce Checks" for Mobile OAuth

## 🎯 The Issue

Google OAuth fails on mobile devices (especially iOS) because Supabase validates the nonce parameter in OAuth flows. Mobile browsers don't always preserve the nonce correctly, causing OAuth to fail.

## ✅ The Solution

Enable "Skip nonce checks" in Supabase Authentication settings.

---

## 📍 Where to Find This Setting

### Step 1: Go to Supabase Dashboard

1. Visit: https://supabase.com/dashboard
2. Select your project

### Step 2: Navigate to Authentication Settings

1. Click **"Authentication"** in the left sidebar
2. Click **"Providers"** (or look for provider settings)
3. Find **"Google"** provider
4. Look for **"Skip nonce checks"** option

### Step 3: Enable the Setting

- ✅ **Check/Enable** "Skip nonce checks"
- Click **"Save"** or the save button

---

## 🔍 What This Setting Does

**"Skip nonce checks"** allows:
- ID tokens with any nonce to be accepted
- OAuth to work on mobile browsers that don't preserve nonces correctly
- Especially important for iOS Safari

**Security Note:**
- This is **less secure** than validating nonces
- However, it's **necessary** for mobile OAuth flows
- Safe for development and testing
- Consider your security requirements for production

---

## 📱 Why Mobile Needs This

### The Problem:
1. OAuth flow generates a nonce (random value)
2. Nonce is sent to Google OAuth
3. Google includes nonce in the ID token
4. Supabase validates the nonce matches
5. **Mobile browsers (especially iOS) don't always preserve nonces correctly**
6. Validation fails → OAuth fails

### The Solution:
- Skip nonce validation for mobile compatibility
- Allows OAuth to complete successfully
- Required for iOS and some Android browsers

---

## ⚠️ Security Considerations

### When to Enable:
- ✅ **Development/Testing** - Always safe
- ✅ **Mobile OAuth** - Required for iOS
- ✅ **If OAuth fails with nonce errors** - This fixes it

### When to Consider Disabling:
- ⚠️ **Production** - More secure with nonce validation
- ⚠️ **If you can ensure nonce preservation** - Better security
- ⚠️ **Desktop-only apps** - May not need it

### Best Practice:
- **Enable for development** - Get OAuth working
- **Test in production** - See if it works without it
- **Keep enabled if mobile is important** - Better UX than security risk
- **Monitor for issues** - Watch Supabase logs

---

## 🧪 Testing After Enabling

### Test Steps:

1. **Enable "Skip nonce checks"** in Supabase
2. **Clear browser cache** on mobile
3. **Try OAuth again:**
   - Click "Sign in with Google"
   - Should redirect to Google
   - After authentication, should redirect back
   - Should complete successfully ✅

### Expected Behavior:

**Before (with nonce checks):**
- OAuth starts
- Redirects to Google
- User authenticates
- Redirects back
- ❌ Fails with nonce validation error

**After (skip nonce checks):**
- OAuth starts
- Redirects to Google
- User authenticates
- Redirects back
- ✅ Completes successfully
- User logged in

---

## 📋 Quick Checklist

- [ ] Go to Supabase Dashboard
- [ ] Navigate to Authentication → Providers → Google
- [ ] Find "Skip nonce checks" option
- [ ] Enable/Check the option
- [ ] Save changes
- [ ] Test OAuth on mobile
- [ ] Verify it works ✅

---

## 🔗 Related Settings

While you're in Authentication settings, also verify:

1. **Redirect URLs:**
   - `http://[your-ip]:8080/dashboard` (for mobile)
   - `http://localhost:8080/dashboard` (for desktop)
   - `https://solowipe.co.uk/dashboard` (for production)

2. **Google Provider Enabled:**
   - Make sure Google provider is toggled ON
   - Client ID and Secret are configured

3. **Site URL:**
   - Set to your app URL
   - For local: `http://localhost:8080` or `http://[your-ip]:8080`

---

## 🎯 Summary

**The Fix:**
1. Enable "Skip nonce checks" in Supabase
2. This allows mobile OAuth to work
3. Required for iOS Safari compatibility

**Why It Works:**
- Mobile browsers don't preserve nonces correctly
- Skipping validation allows OAuth to complete
- Safe for development and testing

**Security:**
- Less secure than nonce validation
- But necessary for mobile OAuth
- Consider your security requirements

---

## ✅ After Enabling

Once enabled, your mobile OAuth flow should work:

1. ✅ OAuth redirects to Google
2. ✅ User selects account
3. ✅ Redirects back to app
4. ✅ Authentication completes
5. ✅ User is logged in
6. ✅ Redirects to dashboard

No more nonce validation errors! 🎉





