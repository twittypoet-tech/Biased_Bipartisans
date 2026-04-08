-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00038: News Reports — key_entities, view_count, article_views
-- Adds fields for parity with reporter_calls display + unique view tracking.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE news_reports ADD COLUMN key_entities TEXT;
ALTER TABLE news_reports ADD COLUMN view_count INT NOT NULL DEFAULT 0;

-- ── article_views (unique view tracking, mirrors report_views pattern) ───────

CREATE TABLE article_views (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_report_id   UUID NOT NULL REFERENCES news_reports(id) ON DELETE CASCADE,
  ip_hash          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(news_report_id, ip_hash)
);

CREATE INDEX idx_article_views_report ON article_views(news_report_id);

ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages article views"
  ON article_views FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public can insert article views"
  ON article_views FOR INSERT
  WITH CHECK (true);
