-- Migration: Add assignment_templates table
-- Date: 2025-02-03
-- Description: Phase 7 - Enables owners to save and reuse helper assignment templates

BEGIN;

-- Create assignment_templates table
CREATE TABLE IF NOT EXISTS public.assignment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  helper_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT assignment_templates_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT assignment_templates_helper_ids_not_empty CHECK (array_length(helper_ids, 1) > 0)
);

-- Create index for owner queries
CREATE INDEX IF NOT EXISTS idx_assignment_templates_owner_id 
  ON public.assignment_templates(owner_id);

-- Enable RLS
ALTER TABLE public.assignment_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Owners can view their own templates
DROP POLICY IF EXISTS "Owners can view their own templates" ON public.assignment_templates;
CREATE POLICY "Owners can view their own templates"
  ON public.assignment_templates FOR SELECT
  USING (owner_id = auth.uid());

-- Owners can create templates
DROP POLICY IF EXISTS "Owners can create templates" ON public.assignment_templates;
CREATE POLICY "Owners can create templates"
  ON public.assignment_templates FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their templates
DROP POLICY IF EXISTS "Owners can update their own templates" ON public.assignment_templates;
CREATE POLICY "Owners can update their own templates"
  ON public.assignment_templates FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Owners can delete their own templates
DROP POLICY IF EXISTS "Owners can delete their own templates" ON public.assignment_templates;
CREATE POLICY "Owners can delete their own templates"
  ON public.assignment_templates FOR DELETE
  USING (owner_id = auth.uid());

-- Add comment
COMMENT ON TABLE public.assignment_templates IS 
  'Stores assignment templates created by owners. Templates contain a set of helper IDs that can be quickly applied to multiple jobs.';

COMMIT;

