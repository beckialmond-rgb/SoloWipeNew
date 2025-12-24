-- Verification Queries for Usage Counters Migration
-- Run these in Supabase SQL Editor to verify the migration succeeded

-- 1. Check if usage_counters table exists and has correct structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'usage_counters'
ORDER BY ordinal_position;

-- 2. Check if grace period columns were added to profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('grace_period_ends_at', 'subscription_grace_period')
ORDER BY column_name;

-- 3. Check if functions were created
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname IN ('increment_job_completion', 'increment_sms_send', 'update_usage_counters_updated_at')
ORDER BY proname;

-- 4. Check if RLS policies exist for usage_counters
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'usage_counters'
ORDER BY policyname;

-- 5. Check usage counters for existing users (should be initialized)
SELECT 
    uc.profile_id,
    p.business_name,
    uc.jobs_completed_count,
    uc.sms_sent_count,
    uc.free_jobs_limit,
    uc.free_sms_limit,
    uc.created_at
FROM public.usage_counters uc
JOIN public.profiles p ON p.id = uc.profile_id
ORDER BY uc.created_at DESC
LIMIT 10;

-- 6. Count total usage counters (should match number of profiles)
SELECT 
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.usage_counters) as total_usage_counters,
    CASE 
        WHEN (SELECT COUNT(*) FROM public.profiles) = (SELECT COUNT(*) FROM public.usage_counters)
        THEN '✅ All profiles have usage counters'
        ELSE '⚠️ Mismatch - some profiles missing usage counters'
    END as status;

-- 7. Check indexes on usage_counters
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'usage_counters'
  AND schemaname = 'public';

