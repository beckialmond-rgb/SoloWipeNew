-- Add order_index column to jobs table for route optimization
-- This allows saving the optimized order permanently

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT NULL;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_jobs_order_index 
ON public.jobs(order_index) 
WHERE order_index IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.jobs.order_index IS 'Custom order index for route optimization. Lower values appear first. NULL means no custom order (use scheduled_date).';

