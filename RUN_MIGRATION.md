# How to Run the Database Migration

## Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of: `supabase/migrations/20250126000000_add_usage_counters_and_grace_period.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify the migration succeeded (you should see success message)

## Option 2: Supabase CLI (if installed)

```bash
# Link to your project (if not already linked)
supabase link --project-ref owqjyaiptexqwafzmcwy

# Run the migration
supabase db push
```

## Verification Steps

After running the migration, verify it worked:

```sql
-- Check if usage_counters table exists
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'usage_counters';

-- Check if grace period columns were added to profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles' 
AND column_name IN ('grace_period_ends_at', 'subscription_grace_period');

-- Check if functions were created
SELECT proname 
FROM pg_proc 
WHERE proname IN ('increment_job_completion', 'increment_sms_send');

-- Check usage counters for existing users (should be initialized)
SELECT profile_id, jobs_completed_count, sms_sent_count, free_jobs_limit, free_sms_limit
FROM public.usage_counters
LIMIT 5;
```

## Expected Results

- ✅ `usage_counters` table created
- ✅ `grace_period_ends_at` column added to `profiles`
- ✅ `subscription_grace_period` column added to `profiles`
- ✅ `increment_job_completion()` function created
- ✅ `increment_sms_send()` function created
- ✅ Usage counters initialized for all existing users

