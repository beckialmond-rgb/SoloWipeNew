-- Phase 7: Database Index Optimization
-- Run this in Supabase SQL Editor to add performance indexes

-- ============================================================================
-- VERIFY EXISTING INDEXES
-- ============================================================================

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'customers', 'jobs')
ORDER BY tablename, indexname;

-- ============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Index for filtering active customers (common query)
CREATE INDEX IF NOT EXISTS idx_customers_status 
ON customers(status) 
WHERE status = 'active';

-- Index for filtering customers by profile_id (already used in RLS, but helps performance)
CREATE INDEX IF NOT EXISTS idx_customers_profile_id 
ON customers(profile_id);

-- Index for filtering jobs by scheduled date (common query)
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date 
ON jobs(scheduled_date);

-- Index for filtering jobs by status (common query)
CREATE INDEX IF NOT EXISTS idx_jobs_status 
ON jobs(status);

-- Index for filtering jobs by customer_id (common query)
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id 
ON jobs(customer_id);

-- Composite index for common job queries (customer + status + date)
CREATE INDEX IF NOT EXISTS idx_jobs_customer_status_date 
ON jobs(customer_id, status, scheduled_date);

-- Index for filtering completed jobs by date
CREATE INDEX IF NOT EXISTS idx_jobs_completed_at 
ON jobs(completed_at) 
WHERE completed_at IS NOT NULL;

-- Index for filtering unpaid jobs (common query)
CREATE INDEX IF NOT EXISTS idx_jobs_unpaid 
ON jobs(payment_status, status) 
WHERE payment_status = 'unpaid' AND status = 'completed';

-- Index for customer search (name and address)
CREATE INDEX IF NOT EXISTS idx_customers_name_search 
ON customers USING gin(to_tsvector('english', name || ' ' || COALESCE(address, '')));

-- Index for filtering customers with mobile phone (for DD setup)
CREATE INDEX IF NOT EXISTS idx_customers_mobile_phone 
ON customers(mobile_phone) 
WHERE mobile_phone IS NOT NULL;

-- ============================================================================
-- VERIFY INDEXES WERE CREATED
-- ============================================================================

SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'customers', 'jobs')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- ANALYZE TABLES (Update statistics for query planner)
-- ============================================================================

ANALYZE profiles;
ANALYZE customers;
ANALYZE jobs;

-- ============================================================================
-- CHECK INDEX USAGE (Run after some usage to verify indexes are being used)
-- ============================================================================

-- Note: This requires pg_stat_statements extension
-- Enable if needed: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'customers', 'jobs')
ORDER BY idx_scan DESC;
