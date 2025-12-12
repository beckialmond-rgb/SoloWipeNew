-- Add notes column to jobs table for per-visit notes
ALTER TABLE public.jobs 
ADD COLUMN notes TEXT;