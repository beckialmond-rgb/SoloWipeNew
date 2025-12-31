# Testing the Accept Invite Flow

## 🎯 Overview

This guide will help you test the new "Activation" flow for helper invites. The flow activates existing placeholder users instead of creating new ones.

---

## Step 1: Deploy the Edge Function

### Option A: Deploy via Supabase CLI (Recommended)

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main

# Login to Supabase (if not already logged in)
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref owqjyaiptexqwafzmcwy

# Deploy the accept-invite function
npx supabase functions deploy accept-invite
```

### Option B: Deploy via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click **"Create Function"** or **"New Function"**
3. Name it: `accept-invite`
4. Copy the code from: `supabase/functions/accept-invite/index.ts`
5. Paste into the editor
6. Click **"Deploy"**

---

## Step 2: Verify Function is Deployed

### Check in Dashboard:
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Look for `accept-invite` in the list
3. Status should be **"Active"** or **"Deployed"**

### Test Function Directly (Browser Console):

Open your browser console (F12) and run:

```javascript
// Replace with your actual Supabase URL and anon key
const SUPABASE_URL = 'https://owqjyaiptexqwafzmcwy.supabase.co';
const ANON_KEY = 'your-anon-key-here';

// Test OPTIONS (CORS preflight)
fetch(`${SUPABASE_URL}/functions/v1/accept-invite`, {
  method: 'OPTIONS'
})
.then(r => {
  console.log('CORS Status:', r.status);
  return r.text();
})
.then(text => console.log('CORS Response:', text))
.catch(err => console.error('CORS Error:', err));
```

**Expected:** Status 200 (CORS preflight should work)

---

## Step 3: Create a Test Scenario

### 3.1: Create an Owner Account (if you don't have one)

1. Sign up as an owner at: `http://localhost:8080/auth`
2. Create a business profile
3. Note your user ID (check browser console or Supabase Dashboard)

### 3.2: Invite a Helper

1. Log in as the owner
2. Go to Settings → Helpers (or wherever helper management is)
3. Invite a helper with email: `test-helper@example.com`
4. **Important:** Note the invite token from the response or check `team_members` table

### 3.3: Verify Placeholder User Exists

In Supabase Dashboard → SQL Editor, run:

```sql
-- Find the invite token and helper_id
SELECT 
  id,
  owner_id,
  helper_id,
  helper_email,
  invite_token,
  invite_accepted_at,
  invite_expires_at
FROM team_members
WHERE helper_email = 'test-helper@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** You should see:
- A `helper_id` (UUID) - this is the placeholder user
- An `invite_token` (UUID)
- `invite_accepted_at` should be NULL
- `invite_expires_at` should be in the future

### 3.4: Verify Placeholder User in Auth

```sql
-- Check if placeholder user exists in auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE id = (
  SELECT helper_id 
  FROM team_members 
  WHERE helper_email = 'test-helper@example.com'
  ORDER BY created_at DESC 
  LIMIT 1
);
```

**Expected:** 
- User exists with the `helper_id`
- `email_confirmed_at` should be NULL (not confirmed yet)
- Email matches `test-helper@example.com`

---

## Step 4: Test the Accept Invite Flow

### 4.1: Open the Invite Link

1. Get the invite URL from the email (or construct it):
   ```
   http://localhost:8080/auth?token=<INVITE_TOKEN>
   ```

2. Open this URL in a **new incognito/private window** (to simulate a new user)

3. **Expected behavior:**
   - Page loads with invite banner showing owner's name
   - Email field is pre-filled with `test-helper@example.com`
   - Form shows "Create Account" mode

### 4.2: Submit Password Form

1. Enter a password (minimum 8 characters)
2. Confirm the password
3. Accept terms and conditions
4. Click **"Create Account"**

### 4.3: Monitor the Flow

**Browser Console (F12):**
Look for these logs:
```
[Auth] Account activated, signing in { email: "test-helper@example.com" }
```

**Supabase Function Logs:**
1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/functions
2. Click `accept-invite`
3. Click **"Logs"** tab
4. Look for:
   ```
   [ACCEPT-INVITE] Function started
   [ACCEPT-INVITE] Validating invite token
   [ACCEPT-INVITE] Invite validated
   [ACCEPT-INVITE] Updating user password and confirming email
   [ACCEPT-INVITE] User updated successfully
   [ACCEPT-INVITE] Team member updated
   [ACCEPT-INVITE] Invite accepted successfully
   ```

### 4.4: Verify Success

**Check Database:**

```sql
-- Verify invite was accepted
SELECT 
  id,
  helper_id,
  helper_email,
  invite_token,
  invite_accepted_at,
  invite_expires_at
FROM team_members
WHERE helper_email = 'test-helper@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- `invite_accepted_at` should be set (not NULL)
- `helper_id` should remain the same (placeholder user ID)

**Check Auth:**

```sql
-- Verify user is activated
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at
FROM auth.users
WHERE email = 'test-helper@example.com';
```

**Expected:**
- `email_confirmed_at` should be set (not NULL)
- User can now sign in with password

**Check Frontend:**
- User should be automatically signed in
- Should redirect to `/dashboard`
- Should see welcome message: "Welcome to [Owner Name]'s team!"

---

## Step 5: Test Error Cases

### 5.1: Test Expired Invite

```sql
-- Manually expire an invite
UPDATE team_members
SET invite_expires_at = NOW() - INTERVAL '1 day'
WHERE helper_email = 'test-helper@example.com'
AND invite_accepted_at IS NULL;
```

Then try to accept the invite again.

**Expected:** Error toast: "This invitation has expired"

### 5.2: Test Already Accepted Invite

Try using the same invite token twice.

**Expected:** Error toast: "This invitation has already been accepted"

### 5.3: Test Invalid Token

Use a fake token: `http://localhost:8080/auth?token=fake-token-123`

**Expected:** Error toast: "Invalid or expired invitation token"

### 5.4: Test Weak Password

Try password less than 8 characters.

**Expected:** Error toast: "Password must be at least 8 characters"

---

## Step 6: Test Normal Signup (No Invite)

1. Go to: `http://localhost:8080/auth`
2. Sign up with a **new email** (not invited)
3. **Expected:** Normal signup flow works as before

---

## 🐛 Troubleshooting

### Error: "Function not found" (404)

**Fix:** Deploy the function:
```bash
npx supabase functions deploy accept-invite
```

### Error: "User account not found"

**Cause:** Placeholder user wasn't created when invite was sent.

**Fix:** 
1. Check if `helper_id` exists in `auth.users`
2. If not, the invite flow might need to create the placeholder user first
3. Check `invite-helper` function logs

### Error: "Email mismatch"

**Cause:** Email in `team_members` doesn't match email in `auth.users`.

**Fix:** Verify both emails match exactly (case-insensitive).

### Error: "Failed to activate account"

**Cause:** Admin API call failed.

**Fix:**
1. Check Supabase function logs
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Check if user exists and is in correct state

### CORS Errors

**Fix:** The function should handle CORS automatically. If you see CORS errors:
1. Check function is deployed correctly
2. Verify CORS headers in function response
3. Check browser console for detailed error

---

## ✅ Success Criteria

The test is successful if:

1. ✅ Function deploys without errors
2. ✅ Invite link loads and validates token
3. ✅ Password form submits successfully
4. ✅ Placeholder user is activated (password set, email confirmed)
5. ✅ `team_members.invite_accepted_at` is set
6. ✅ User is automatically signed in
7. ✅ User is redirected to dashboard
8. ✅ Error cases show appropriate messages
9. ✅ Normal signup (no invite) still works

---

## 📝 Test Checklist

- [ ] Function deployed successfully
- [ ] Function responds to OPTIONS (CORS)
- [ ] Created test owner account
- [ ] Sent helper invite
- [ ] Verified placeholder user exists
- [ ] Opened invite link
- [ ] Submitted password form
- [ ] Verified user activation in database
- [ ] Verified automatic sign-in
- [ ] Tested expired invite error
- [ ] Tested already accepted error
- [ ] Tested invalid token error
- [ ] Tested normal signup (no invite)

---

## 🚀 Quick Test Script

Save this as `test-accept-invite.sh`:

```bash
#!/bin/bash

echo "🧪 Testing Accept Invite Flow"
echo ""

# Get Supabase URL from .env or set manually
SUPABASE_URL="${SUPABASE_URL:-https://owqjyaiptexqwafzmcwy.supabase.co}"

echo "1. Testing CORS preflight..."
curl -X OPTIONS "${SUPABASE_URL}/functions/v1/accept-invite" \
  -H "Content-Type: application/json" \
  -v 2>&1 | grep -i "access-control"

echo ""
echo "2. Testing function exists..."
curl -X POST "${SUPABASE_URL}/functions/v1/accept-invite" \
  -H "Content-Type: application/json" \
  -d '{"invite_token":"test","password":"test"}' \
  -s | jq '.' || echo "Function responded (expected error for test data)"

echo ""
echo "✅ Basic function test complete!"
echo "Next: Test with real invite token in browser"
```

Make it executable:
```bash
chmod +x test-accept-invite.sh
./test-accept-invite.sh
```

