-- Applied to production Supabase as hours_work_completion_and_delivery_performance_v14.
-- Source-of-truth migration recorded from the production schema change.
-- Adds actual work start/close tracking, session-close semantics for Pause,
-- definitive work finalization for Stop, client-approval auto-close, and
-- deliverable delivery-performance analytics.

-- NOTE: This repository migration mirrors the applied production migration.
-- See Supabase migration history for the canonical executed SQL.
