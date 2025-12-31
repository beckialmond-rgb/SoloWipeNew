# RESEND_API_KEY Verification & Setup Guide

**Date:** 2025-01-30  
**Auditor:** DevOps & Security Engineer  
**Status:** ✅ **CODE AUDIT PASSED**

---

## Step 1: Code Usage Audit Results

### ✅ Code Implementation Status: **PASS**

**File:** `supabase/functions/send-email/index.ts`

#### 1.1 Secret Access Method ✅ SECURE
**Location:** Line 126

```typescript
const resendApiKey = Deno.env.get("RESEND_API_KEY");
```

**Assessment:** ✅ **CORRECT**
- Uses `Deno.env.get()` (proper for Deno Edge Functions)
- NOT using `process.env` (which would be incorrect for Deno)
- Follows Supabase Edge Function best practices

#### 1.2 Hardcoded Key Check ✅ SECURE
**Full File Scan:** No hardcoded API keys found

**Verification:**
- ✅ No string literals matching Resend API key pattern (`re_...`)
- ✅ No hardcoded keys in comments
- ✅ Key is only accessed via environment variable
- ✅ Proper error handling if key is missing (lines 127-136)

**Security Score:** ✅ **EXCELLENT** - No secrets in code

---

## Step 2: Environment Verification Plan

### 🔍 Remote Secrets Verification (Production)

#### Command to List All Remote Secrets:
```bash
# Navigate to project directory
cd /Users/rebeccaalmond/Downloads/solowipe-main

# List all secrets for linked Supabase project
npx supabase secrets list
```

**Expected Output (if RESEND_API_KEY exists):**
```
RESEND_API_KEY
```

**Expected Output (if RESEND_API_KEY missing):**
```
(empty list or other secrets only)
```

**If Project Not Linked:**
```bash
# Link to your Supabase project first
npx supabase link --project-ref owqjyaiptexqwafzmcwy

# Then list secrets
npx supabase secrets list
```

#### Command to Set RESEND_API_KEY (if missing):
```bash
# Set the secret (replace YOUR_RESEND_API_KEY with actual key)
npx supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY

# Verify it was set
npx supabase secrets list
```

**Get Your Resend API Key:**
1. Go to: https://resend.com/api-keys
2. Sign in to your Resend account
3. Create a new API key (or copy existing)
4. Key format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Security Note:** 
- ⚠️ Never commit API keys to git
- ⚠️ Never share API keys in screenshots or logs
- ✅ Keys are encrypted at rest in Supabase
- ✅ Keys are only accessible to edge functions (not client-side)

---

### 🏠 Local Development Secrets (Testing)

#### Local Environment File Location:

For local testing with `supabase functions serve`, create:

**File:** `.env.local` (in project root: `/Users/rebeccaalmond/Downloads/solowipe-main/.env.local`)

**Content:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Alternative:** Supabase CLI also supports `.env` file in the `supabase/` directory:

**File:** `supabase/.env.local` (alternative location)

**Content:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Test Local Edge Function:
```bash
# Start local Supabase (if not already running)
npx supabase start

# Serve edge functions locally (loads .env.local automatically)
npx supabase functions serve send-email --env-file .env.local

# Or serve all functions
npx supabase functions serve --env-file .env.local
```

**Verify Local Secret is Loaded:**
The function will log `[SEND-EMAIL] Function started` if it loads correctly. If the key is missing, you'll see:
```
[SEND-EMAIL] ERROR: RESEND_API_KEY not set
```

---

## Step 3: Verification Checklist

### ✅ Code Implementation Status: **PASS**
- [x] Uses `Deno.env.get("RESEND_API_KEY")` ✅
- [x] No hardcoded keys in code ✅
- [x] Proper error handling if key missing ✅
- [x] Key not logged or exposed ✅

### 🔍 Remote Secrets Verification

**Command to verify:**
```bash
npx supabase secrets list
```

**Expected result:**
- ✅ `RESEND_API_KEY` appears in list → **READY FOR SMOKE TEST**
- ❌ `RESEND_API_KEY` missing → Run setup command below

**If missing, run:**
```bash
npx supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY
```

**Verify after setting:**
```bash
npx supabase secrets list
```

### 🏠 Local Secrets Verification

**File to check/create:**
- [ ] `.env.local` exists in project root
- [ ] Contains `RESEND_API_KEY=re_...`
- [ ] File is in `.gitignore` (should not be committed)

**Verify local setup:**
```bash
# Check if .env.local exists
ls -la .env.local

# View contents (be careful - contains secret!)
cat .env.local | grep RESEND_API_KEY

# Test local function
npx supabase functions serve send-email --env-file .env.local
```

---

## Step 4: Quick Verification Script

Run this script to verify everything is set up:

```bash
#!/bin/bash
# Save as: verify-resend-key.sh

echo "🔍 Verifying RESEND_API_KEY Configuration..."
echo ""

# Check if Supabase project is linked
if ! npx supabase status &>/dev/null; then
    echo "⚠️  Supabase project not linked locally"
    echo "   Run: npx supabase link --project-ref owqjyaiptexqwafzmcwy"
    exit 1
fi

# Check remote secrets
echo "📋 Checking Remote Secrets..."
SECRETS=$(npx supabase secrets list 2>/dev/null)

if echo "$SECRETS" | grep -q "RESEND_API_KEY"; then
    echo "   ✅ RESEND_API_KEY found in remote secrets"
else
    echo "   ❌ RESEND_API_KEY NOT FOUND in remote secrets"
    echo "   Run: npx supabase secrets set RESEND_API_KEY=YOUR_KEY"
fi

# Check local .env file
echo ""
echo "📁 Checking Local Environment File..."
if [ -f ".env.local" ]; then
    if grep -q "RESEND_API_KEY" .env.local; then
        echo "   ✅ RESEND_API_KEY found in .env.local"
    else
        echo "   ⚠️  .env.local exists but RESEND_API_KEY not found"
    fi
else
    echo "   ⚠️  .env.local not found (optional for local testing)"
    echo "   Create .env.local with: RESEND_API_KEY=re_..."
fi

# Check code implementation
echo ""
echo "💻 Checking Code Implementation..."
if grep -q 'Deno.env.get("RESEND_API_KEY")' supabase/functions/send-email/index.ts; then
    echo "   ✅ Code uses Deno.env.get() correctly"
else
    echo "   ❌ Code implementation issue detected"
fi

if ! grep -q "re_[a-zA-Z0-9]" supabase/functions/send-email/index.ts; then
    echo "   ✅ No hardcoded API keys found"
else
    echo "   ⚠️  WARNING: Possible hardcoded key detected!"
fi

echo ""
echo "✅ Verification complete!"
```

**Make executable and run:**
```bash
chmod +x verify-resend-key.sh
./verify-resend-key.sh
```

---

## Step 5: Pre-Smoke Test Checklist

Before running the CURL smoke test from `READY_FOR_BATTLE.md`:

- [ ] **Code Audit:** ✅ PASSED (uses `Deno.env.get()`)
- [ ] **Remote Secret:** Verified with `npx supabase secrets list`
- [ ] **Local Secret:** Created `.env.local` (if testing locally)
- [ ] **Resend Account:** Have valid API key from https://resend.com/api-keys
- [ ] **Project Linked:** `npx supabase link` completed successfully

**If all checked:** ✅ **READY FOR SMOKE TEST**

---

## Troubleshooting

### Issue: `npx supabase secrets list` returns empty
**Fix:**
1. Verify project is linked: `npx supabase status`
2. If not linked: `npx supabase link --project-ref owqjyaiptexqwafzmcwy`
3. Set the secret: `npx supabase secrets set RESEND_API_KEY=your_key`

### Issue: Local function can't find RESEND_API_KEY
**Fix:**
1. Create `.env.local` in project root
2. Add: `RESEND_API_KEY=re_...`
3. Use: `npx supabase functions serve --env-file .env.local`

### Issue: Secret appears in list but function still fails
**Fix:**
1. Verify secret name is exactly `RESEND_API_KEY` (case-sensitive)
2. Redeploy function: `npx supabase functions deploy send-email`
3. Check function logs: Supabase Dashboard → Edge Functions → send-email → Logs

### Issue: Want to verify secret value (without exposing it)
**Fix:**
```bash
# Test by invoking function with test payload
# If key is wrong, you'll get Resend API error
# If key is missing, you'll get "RESEND_API_KEY not set" error
```

---

## Security Best Practices

✅ **DO:**
- Use `Deno.env.get()` for edge functions
- Store secrets in Supabase Dashboard (encrypted)
- Use `.env.local` for local testing (never commit)
- Rotate keys periodically
- Use different keys for dev/staging/production

❌ **DON'T:**
- Hardcode keys in source code
- Commit `.env` files to git
- Share keys in screenshots or logs
- Use production keys in development
- Store keys in client-side code

---

## Next Steps

1. ✅ **Code Audit:** Complete - Implementation is secure
2. 🔍 **Verify Remote Secret:** Run `npx supabase secrets list`
3. 🏠 **Setup Local Secret:** Create `.env.local` (optional)
4. 🔥 **Run Smoke Test:** Use CURL command from `READY_FOR_BATTLE.md`

**Status:** ✅ **READY TO VERIFY SECRETS**

