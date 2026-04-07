-- Track unique views per IP per report
CREATE TABLE report_views (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_call_id UUID        NOT NULL REFERENCES reporter_calls(id) ON DELETE CASCADE,
  ip_hash          TEXT        NOT NULL,
  user_id          UUID        REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_call_id, ip_hash)
);

CREATE INDEX idx_report_views_call ON report_views (reporter_call_id);

ALTER TABLE reporter_calls ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE report_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages views" ON report_views FOR ALL USING (true);
