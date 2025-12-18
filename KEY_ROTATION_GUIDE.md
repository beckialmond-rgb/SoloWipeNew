# Supabase Key Rotation Guide

## Which Key to Rotate

### ✅ ROTATE THIS (Critical):
**Service Role Key** (Legacy JWT format)
- Location: Supabase Dashboard → Project Settings → API → **Legacy tab** → **service_role** heading
- Format: Starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Why: This was exposed in git history and has admin privileges
- Used in: Supabase Edge Functions (as `SERVICE_ROLE_KEY`)

### ❌ DON'T ROTATE (Safe):
1. **anon/public key** (Legacy JWT format)
   - Location: Legacy tab → anon heading
   - Why: Public key, safe to expose, already in your frontend code

2. **Publishable key** (New format: `sb_publishable_...`)
   - Location: Publishable keys tab
   - Why: Public key, safe to expose, already in your frontend code

## Steps to Rotate Service Role Key:

1. **In Supabase Dashboard:**
   - Go to Project Settings → API
   - Click on **Legacy** tab (or wherever you see "service_role")
   - Find the **service_role** key (starts with `eyJ...`)
   - Click **Revoke** or **Reset** to generate a new one
   - Copy the new key

2. **Update Local .env file:**
   - Open `.env` file
   - Replace the value after `SERVICE_ROLE_KEY=`
   - Save the file

3. **Update Supabase Edge Functions Secrets:**
   - Go to Project Settings → Edge Functions → Secrets
   - Find `SERVICE_ROLE_KEY`
   - Update the value with the new key
   - Save

4. **Test:**
   - Deploy/test your Edge Functions to ensure they work with the new key

## Visual Guide:

```
Supabase Dashboard → Project Settings → API
├── Publishable Keys Tab
│   └── sb_publishable_... (DON'T ROTATE - Public)
└── Legacy Tab
    ├── anon (DON'T ROTATE - Public)
    └── service_role (✅ ROTATE THIS - Secret Admin Key)
```
