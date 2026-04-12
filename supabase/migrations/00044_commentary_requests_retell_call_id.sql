-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00044: commentary_requests.retell_call_id
-- Adds the retell_call_id column so the news-article commentary flow can
-- match a finished Retell call back to the pending request, and the webhook
-- handler can write the finished audio + transcript into agent_commentary.
--
-- Mirrors the shape that already exists on the legacy
-- report_commentary_requests table (used by the reporter-call flow).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE commentary_requests
  ADD COLUMN IF NOT EXISTS retell_call_id TEXT;

CREATE INDEX IF NOT EXISTS idx_commentary_requests_retell_call_id
  ON commentary_requests(retell_call_id)
  WHERE retell_call_id IS NOT NULL;
