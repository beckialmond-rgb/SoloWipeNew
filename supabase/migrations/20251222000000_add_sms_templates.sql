-- Add SMS Templates table to store user-customized templates
-- Templates are stored as JSONB for flexibility

CREATE TABLE IF NOT EXISTS public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('tomorrow_reminder', 'receipt', 'direct_debit_invite', 'unpaid_reminder', 'rain_check', 'general', 'on_my_way', 'review_request')),
  templates JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_template_id TEXT NOT NULL DEFAULT 'professional',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, category)
);

-- Enable RLS
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own SMS templates"
  ON public.sms_templates FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own SMS templates"
  ON public.sms_templates FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own SMS templates"
  ON public.sms_templates FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete their own SMS templates"
  ON public.sms_templates FOR DELETE
  USING (profile_id = auth.uid());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sms_templates_profile_category ON public.sms_templates(profile_id, category);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_templates_updated_at();

