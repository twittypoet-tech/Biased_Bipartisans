-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00045: expand commentary_requests.status vocabulary
--
-- The original check constraint only allowed 'pending' | 'fulfilled' |
-- 'rejected'. The news-article commentary flow emits 'in_progress' (once
-- the Retell call is created) and needs 'failed' for cleanup, both of
-- which were silently violating the constraint and leaving retell_call_id
-- unwritten on every request.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE commentary_requests
  DROP CONSTRAINT IF EXISTS commentary_requests_status_check;

ALTER TABLE commentary_requests
  ADD CONSTRAINT commentary_requests_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'fulfilled'::text, 'rejected'::text, 'failed'::text]));
