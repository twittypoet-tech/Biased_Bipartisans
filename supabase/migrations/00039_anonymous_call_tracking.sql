-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00039: Anonymous Call Tracking
-- One free 5-minute call per IP address. Tracks usage for conversion funnel.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE anonymous_calls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash           TEXT NOT NULL,
  report_slug       TEXT NOT NULL,
  retell_call_id    TEXT,
  duration_seconds  INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One free call per IP, ever
CREATE UNIQUE INDEX idx_anonymous_calls_ip ON anonymous_calls(ip_hash);

ALTER TABLE anonymous_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages anonymous calls"
  ON anonymous_calls FOR ALL
  USING (auth.role() = 'service_role');

-- Allow anonymous inserts (the API route handles validation)
CREATE POLICY "Public can insert anonymous calls"
  ON anonymous_calls FOR INSERT
  WITH CHECK (true);

-- Allow public reads so the CTA can check if IP already used
CREATE POLICY "Public can read anonymous calls"
  ON anonymous_calls FOR SELECT
  USING (true);
