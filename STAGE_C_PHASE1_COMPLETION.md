# Stage C, Phase 1 - Database Schema Changes for Helper Billing

**Date:** 2025-02-06  
**Status:** ✅ Migration file created, ready for execution

---

## Overview

Phase 1 adds database schema changes to support helper billing (£5/month per helper). This phase is **schema-only** - no RLS policies, frontend, or backend code changes.

---

## Migration File

**File:** `supabase/migrations/20250206000000_add_helper_billing_fields.sql`

### Changes Made

#### 1. New Columns Added to `team_members` Table

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `is_active` | BOOLEAN | NOT NULL | `true` | Indicates if helper is active for billing |
| `billing_started_at` | TIMESTAMPTZ | NULL | NULL | Timestamp when billing started (when helper accepts invite) |
| `billing_stopped_at` | TIMESTAMPTZ | NULL | NULL | Timestamp when billing stopped (when helper is removed) |
| `stripe_subscription_item_id` | TEXT | NULL | NULL | Stripe subscription item ID (populated in Phase 2) |

#### 2. Data Migration Logic

For existing `team_members` records:
- ✅ `is_active` → Set to `true` for all existing helpers
- ✅ `billing_started_at` → Set to `COALESCE(invite_accepted_at, added_at)`
  - Uses `invite_accepted_at` if available (when helper actually accepted)
  - Falls back to `added_at` (when owner added them to team)
- ✅ `billing_stopped_at` → Left as `NULL` (no historical deactivations)
- ✅ `stripe_subscription_item_id` → Left as `NULL` (will be synced in Phase 2)

#### 3. Performance Indexes Created

- `idx_team_members_is_active` - Partial index on `is_active = true`
- `idx_team_members_billing_started_at` - Partial index on non-null `billing_started_at`
- `idx_team_members_stripe_subscription_item_id` - Partial index on non-null `stripe_subscription_item_id`

#### 4. Documentation

- Column comments added for all new fields
- Table comment updated to reflect billing functionality

---

## Key Design Decisions

### 1. `is_active` Defaults to `true`
**Rationale:** Helpers become active immediately upon accepting invite (no separate activation step). This simplifies the model and aligns with the requirement.

### 2. `billing_started_at` Uses `COALESCE(invite_accepted_at, added_at)`
**Rationale:** 
- For helpers who accepted invites → use `invite_accepted_at` (actual acceptance time)
- For helpers added before invite system → use `added_at` (when they joined team)
- Ensures all existing helpers have a billing start date

### 3. No `active_helper_count` Cache
**Rationale:** As per requirements, this is optional and deferred to a later phase. Can be added if needed for performance.

### 4. All New Columns Are Nullable (Except `is_active`)
**Rationale:** 
- Backward compatible with existing data
- `billing_stopped_at` and `stripe_subscription_item_id` are NULL until set
- `is_active` has a default, so NOT NULL is safe

---

## Verification

**Verification Script:** `supabase/migrations/20250206000000_verify_helper_billing_fields.sql`

Run the verification script after executing the migration to confirm:
- ✅ All columns exist with correct types
- ✅ All existing helpers are marked `is_active = true`
- ✅ All existing helpers have `billing_started_at` set correctly
- ✅ All indexes are created
- ✅ No NULL values in `is_active` column
- ✅ Data integrity checks pass

---

## Constraints & Limitations

✅ **No RLS Policy Changes** - Phase 1 is schema-only  
✅ **No Frontend Code Changes** - Phase 1 is schema-only  
✅ **No Backend Code Changes** - Phase 1 is schema-only  
✅ **No Stripe Logic** - Stripe integration happens in Phase 2  
✅ **No `active_helper_count` Cache** - Deferred to later phase  

---

## Next Steps (Phase 2)

Phase 2 will handle:
1. Stripe integration for helper billing
2. Setting `stripe_subscription_item_id` when helpers accept invites
3. Updating `billing_started_at` and `billing_stopped_at` via application code
4. Frontend/backend changes to support billing logic

---

## Migration Safety

- ✅ Wrapped in transaction (BEGIN/COMMIT) - all changes rollback on failure
- ✅ Uses `IF NOT EXISTS` - idempotent, can be run multiple times safely
- ✅ Non-breaking - all new columns are nullable except `is_active` (which has default)
- ✅ Backward compatible - existing application code continues to work

---

## Testing Checklist

After running the migration:

- [ ] Execute migration file in Supabase SQL Editor
- [ ] Run verification script (`20250206000000_verify_helper_billing_fields.sql`)
- [ ] Verify all columns exist
- [ ] Verify all existing helpers have `is_active = true`
- [ ] Verify all existing helpers have `billing_started_at` set
- [ ] Verify indexes are created
- [ ] Verify no NULL `is_active` values
- [ ] Test application still works (no breaking changes)

---

## Files Created

1. `supabase/migrations/20250206000000_add_helper_billing_fields.sql` - Main migration file
2. `supabase/migrations/20250206000000_verify_helper_billing_fields.sql` - Verification queries
3. `STAGE_C_PHASE1_COMPLETION.md` - This summary document

---

**Phase 1 Status:** ✅ Complete - Ready for execution

