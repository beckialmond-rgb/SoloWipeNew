-- Verification Queries for Helper Billing Fields Migration
-- Date: 2025-02-06
-- Stage: C, Phase 1 - Database Schema Changes for Helper Role Model + Billing
-- Description: Run these queries after executing 20250206000000_add_helper_billing_fields.sql
--              to verify the migration completed successfully
--
-- Usage: Run each query section individually and verify the results match expectations

-- ============================================================================
-- VERIFICATION 1: Verify all columns exist
-- ============================================================================
-- Expected: Should show 4 new columns:
--   - is_active (boolean, not null, default true)
--   - billing_started_at (timestamp with time zone, nullable)
--   - billing_stopped_at (timestamp with time zone, nullable)
--   - stripe_subscription_item_id (text, nullable)

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'team_members'
ORDER BY ordinal_position;

-- ============================================================================
-- VERIFICATION 2: Verify existing helpers are marked active
-- ============================================================================
-- Expected: 
--   - total_helpers: Total count of team_members records
--   - active_helpers: Should equal total_helpers (all existing helpers should be active)
--   - helpers_with_billing_start: Should equal total_helpers (all should have billing_started_at set)

SELECT 
  COUNT(*) as total_helpers,
  COUNT(*) FILTER (WHERE is_active = true) as active_helpers,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_helpers,
  COUNT(*) FILTER (WHERE billing_started_at IS NOT NULL) as helpers_with_billing_start,
  COUNT(*) FILTER (WHERE billing_stopped_at IS NOT NULL) as helpers_with_billing_stop,
  COUNT(*) FILTER (WHERE stripe_subscription_item_id IS NOT NULL) as helpers_with_stripe_id
FROM public.team_members;

-- ============================================================================
-- VERIFICATION 3: Verify billing_started_at is set correctly
-- ============================================================================
-- Expected: 
--   - All records should show 'OK' in validation column
--   - billing_started_at should equal COALESCE(invite_accepted_at, added_at)
--   - If any show 'MISMATCH', investigate those records

SELECT 
  id,
  helper_email,
  added_at,
  invite_accepted_at,
  billing_started_at,
  CASE 
    WHEN billing_started_at = COALESCE(invite_accepted_at, added_at) THEN 'OK'
    ELSE 'MISMATCH'
  END as validation
FROM public.team_members
ORDER BY added_at DESC
LIMIT 20;

-- ============================================================================
-- VERIFICATION 4: Verify indexes exist
-- ============================================================================
-- Expected: Should show 3 new indexes:
--   - idx_team_members_is_active
--   - idx_team_members_billing_started_at
--   - idx_team_members_stripe_subscription_item_id

SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'team_members'
  AND indexname LIKE 'idx_team_members_%'
ORDER BY indexname;

-- ============================================================================
-- VERIFICATION 5: Verify no NULL is_active values
-- ============================================================================
-- Expected: Should return 0 (all records should have is_active set)

SELECT COUNT(*) as null_is_active_count
FROM public.team_members
WHERE is_active IS NULL;

-- ============================================================================
-- VERIFICATION 6: Verify data integrity - helpers with invite_accepted_at
-- ============================================================================
-- Expected: For helpers who have accepted invites, billing_started_at should equal invite_accepted_at

SELECT 
  COUNT(*) as total_with_accepted_invite,
  COUNT(*) FILTER (WHERE billing_started_at = invite_accepted_at) as correctly_set_from_accepted_at,
  COUNT(*) FILTER (WHERE billing_started_at != invite_accepted_at) as mismatched_from_accepted_at
FROM public.team_members
WHERE invite_accepted_at IS NOT NULL;

-- ============================================================================
-- VERIFICATION 7: Verify data integrity - helpers without invite_accepted_at
-- ============================================================================
-- Expected: For helpers without accepted invites, billing_started_at should equal added_at

SELECT 
  COUNT(*) as total_without_accepted_invite,
  COUNT(*) FILTER (WHERE billing_started_at = added_at) as correctly_set_from_added_at,
  COUNT(*) FILTER (WHERE billing_started_at != added_at) as mismatched_from_added_at
FROM public.team_members
WHERE invite_accepted_at IS NULL;

-- ============================================================================
-- VERIFICATION 8: Sample data check - show first 10 records with all new fields
-- ============================================================================
-- Expected: Review sample records to ensure data looks correct

SELECT 
  id,
  helper_email,
  is_active,
  added_at,
  invite_accepted_at,
  billing_started_at,
  billing_stopped_at,
  stripe_subscription_item_id
FROM public.team_members
ORDER BY added_at DESC
LIMIT 10;

-- ============================================================================
-- VERIFICATION 9: Check for any edge cases
-- ============================================================================
-- Expected: Should return 0 rows (no edge cases)

-- Check for helpers with billing_stopped_at but is_active = true (shouldn't happen)
SELECT COUNT(*) as active_but_stopped_count
FROM public.team_members
WHERE billing_stopped_at IS NOT NULL AND is_active = true;

-- Check for helpers with billing_started_at in the future (shouldn't happen)
SELECT COUNT(*) as future_billing_start_count
FROM public.team_members
WHERE billing_started_at > NOW();

-- ============================================================================
-- SUMMARY: All verification checks
-- ============================================================================
-- Run this final query to get a summary of all checks

SELECT 
  'Migration Verification Summary' as check_type,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE billing_started_at IS NOT NULL) as billing_started_count,
  COUNT(*) FILTER (WHERE billing_stopped_at IS NOT NULL) as billing_stopped_count,
  COUNT(*) FILTER (WHERE stripe_subscription_item_id IS NOT NULL) as stripe_id_count,
  COUNT(*) FILTER (WHERE is_active IS NULL) as null_is_active_count,
  COUNT(*) FILTER (WHERE billing_started_at != COALESCE(invite_accepted_at, added_at)) as billing_mismatch_count
FROM public.team_members;

