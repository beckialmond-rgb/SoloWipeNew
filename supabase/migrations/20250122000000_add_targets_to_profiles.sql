-- Add weekly_target and monthly_goal columns to profiles table
-- These allow users to set custom financial targets for business insights

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS weekly_target NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_goal NUMERIC DEFAULT NULL;

-- Add indexes for potential filtering/queries
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_target 
ON public.profiles(weekly_target) 
WHERE weekly_target IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_monthly_goal 
ON public.profiles(monthly_goal) 
WHERE monthly_goal IS NOT NULL;

-- Add comments explaining the columns
COMMENT ON COLUMN public.profiles.weekly_target IS 'User-defined weekly revenue target in GBP. Used for progress tracking and goal setting in Business Insights.';
COMMENT ON COLUMN public.profiles.monthly_goal IS 'User-defined monthly revenue goal in GBP. Used for progress tracking and goal setting in Business Insights.';
