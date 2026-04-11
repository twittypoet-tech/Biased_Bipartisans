-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00043: article_disclosure_dismissals
-- Tracks which (article, ip) pairs have already seen the AI disclosure popup
-- so logged-out visitors only see it once per article. Mirrors the article_views
-- pattern (00038) — same shape, different concern.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE article_disclosure_dismissals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_report_id   UUID NOT NULL REFERENCES news_reports(id) ON DELETE CASCADE,
  ip_hash          TEXT NOT NULL,
  shown_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(news_report_id, ip_hash)
);

CREATE INDEX idx_adismiss_report ON article_disclosure_dismissals(news_report_id);

ALTER TABLE article_disclosure_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages disclosure dismissals"
  ON article_disclosure_dismissals FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Public can insert disclosure dismissals"
  ON article_disclosure_dismissals FOR INSERT
  WITH CHECK (true);
