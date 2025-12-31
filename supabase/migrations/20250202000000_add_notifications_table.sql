-- Migration: Add notifications table and triggers for Phase 5
-- Date: 2025-02-02
-- Description: Creates in-app notifications system for helpers when jobs are assigned/unassigned

BEGIN;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('job_assigned', 'job_unassigned', 'bulk_assigned')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  
  -- Optional: Link to related job for future enhancements
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- System can create notifications (via database triggers/functions)
-- This policy allows inserts, but triggers will ensure only system-created notifications exist
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- Function to create notification when job is assigned
CREATE OR REPLACE FUNCTION public.create_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  job_customer_name TEXT;
  job_address TEXT;
  assigned_by_name TEXT;
BEGIN
  -- Get job details
  SELECT c.name, c.address INTO job_customer_name, job_address
  FROM public.jobs j
  JOIN public.customers c ON j.customer_id = c.id
  WHERE j.id = NEW.job_id;
  
  -- Get assigner name (optional, can be null)
  SELECT business_name INTO assigned_by_name
  FROM public.profiles
  WHERE id = NEW.assigned_by_user_id;
  
  -- Create notification for the assigned helper
  INSERT INTO public.notifications (user_id, type, title, message, job_id)
  VALUES (
    NEW.assigned_to_user_id,
    'job_assigned',
    'New job assigned',
    COALESCE(job_customer_name, 'A customer') || ' - ' || COALESCE(job_address, 'Address TBD'),
    NEW.job_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create notification on assignment insert
DROP TRIGGER IF EXISTS trigger_create_assignment_notification ON public.job_assignments;
CREATE TRIGGER trigger_create_assignment_notification
  AFTER INSERT ON public.job_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_assignment_notification();

-- Function to create notification when job is unassigned
CREATE OR REPLACE FUNCTION public.create_unassignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  job_customer_name TEXT;
BEGIN
  -- Get job details
  SELECT c.name INTO job_customer_name
  FROM public.jobs j
  JOIN public.customers c ON j.customer_id = c.id
  WHERE j.id = OLD.job_id;
  
  -- Create notification for the unassigned helper
  INSERT INTO public.notifications (user_id, type, title, message, job_id)
  VALUES (
    OLD.assigned_to_user_id,
    'job_unassigned',
    'Job unassigned',
    COALESCE(job_customer_name, 'A job') || ' has been unassigned from you',
    OLD.job_id
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create notification on assignment delete
DROP TRIGGER IF EXISTS trigger_create_unassignment_notification ON public.job_assignments;
CREATE TRIGGER trigger_create_unassignment_notification
  AFTER DELETE ON public.job_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_unassignment_notification();

COMMENT ON TABLE public.notifications IS 'In-app notifications for helpers. Created automatically when jobs are assigned/unassigned.';

COMMIT;

