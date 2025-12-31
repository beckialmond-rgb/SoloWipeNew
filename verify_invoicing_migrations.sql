-- ============================================================================
-- Helper Invoicing System - Migration Verification Script
-- ============================================================================
-- Run this script AFTER running migrations to verify everything is set up correctly
-- ============================================================================

-- Check Tables Exist
SELECT 
  'Tables Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 4 tables'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('helper_invoices', 'helper_invoice_items', 'helper_payments', 'helper_invoice_audit_log');

-- List Tables
SELECT 
  'Table List' as check_type,
  table_name,
  '✅ EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('helper_invoices', 'helper_invoice_items', 'helper_payments', 'helper_invoice_audit_log')
ORDER BY table_name;

-- Check Functions Exist
SELECT 
  'Functions Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 5 functions'
  END as status
FROM pg_proc 
WHERE proname IN (
  'generate_helper_invoice',
  'issue_helper_invoice',
  'record_helper_payment',
  'get_helper_invoice_summary',
  'get_jobs_available_for_invoicing'
);

-- List Functions
SELECT 
  'Function List' as check_type,
  proname as function_name,
  '✅ EXISTS' as status
FROM pg_proc 
WHERE proname IN (
  'generate_helper_invoice',
  'issue_helper_invoice',
  'record_helper_payment',
  'get_helper_invoice_summary',
  'get_jobs_available_for_invoicing'
)
ORDER BY proname;

-- Check RLS Enabled
SELECT 
  'RLS Check' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('helper_invoices', 'helper_invoice_items', 'helper_payments', 'helper_invoice_audit_log')
ORDER BY tablename;

-- Check RLS Policies Count
SELECT 
  'RLS Policies Check' as check_type,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS POLICIES'
    ELSE '❌ NO POLICIES'
  END as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('helper_invoices', 'helper_invoice_items', 'helper_payments', 'helper_invoice_audit_log')
GROUP BY tablename
ORDER BY tablename;

-- Check Triggers Exist
SELECT 
  'Triggers Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected at least 3 triggers'
  END as status
FROM pg_trigger 
WHERE tgname IN (
  'update_helper_invoices_updated_at',
  'update_helper_payments_updated_at',
  'update_invoice_on_payment_change'
);

-- List Triggers
SELECT 
  'Trigger List' as check_type,
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  '✅ EXISTS' as status
FROM pg_trigger 
WHERE tgname IN (
  'update_helper_invoices_updated_at',
  'update_helper_payments_updated_at',
  'update_invoice_on_payment_change'
)
ORDER BY tgname;

-- Check Indexes Exist (sample check)
SELECT 
  'Indexes Check' as check_type,
  COUNT(*) as index_count,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ PASS'
    ELSE '⚠️ WARNING - May need more indexes'
  END as status
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('helper_invoices', 'helper_invoice_items', 'helper_payments', 'helper_invoice_audit_log');

-- Summary
SELECT 
  '=== VERIFICATION SUMMARY ===' as summary,
  '' as details;

SELECT 
  'Next Steps:' as step,
  '1. Test invoice generation with a helper who has completed jobs' as details
UNION ALL
SELECT 
  '2. Test invoice issuing',
  '3. Test payment recording'
UNION ALL
SELECT 
  '4. Test helper access',
  '5. Test CSV exports';

