-- ============================================================================
-- CRITICAL FIX #2: Webhook Idempotency Table
-- ============================================================================
-- This table prevents duplicate webhook processing by tracking processed events
-- Used by both GoCardless and Stripe webhook handlers

CREATE TABLE IF NOT EXISTS public.webhook_events (
  event_id TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,
  action TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cleanup queries (optional - for future maintenance)
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at 
ON public.webhook_events(processed_at);

-- No RLS needed - this is a system table accessed only by service role
-- Edge functions use SERVICE_ROLE_KEY which bypasses RLS

