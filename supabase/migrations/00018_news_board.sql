-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00018: News Board
-- news_reports, report_images, agent_commentary, commentary_requests
-- ─────────────────────────────────────────────────────────────────────────────

-- ── news_reports ─────────────────────────────────────────────────────────────
CREATE TABLE news_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,
  headline              TEXT NOT NULL,
  subheadline           TEXT,
  summary               TEXT NOT NULL,
  -- Ordered array of content blocks: {type, content, level?}
  body                  JSONB NOT NULL DEFAULT '[]',
  category              TEXT NOT NULL CHECK (category IN (
    'Environmental Science',
    'History & Politics',
    'Law & Jurisprudence',
    'Medicine & Healthcare',
    'Philosophy & Ethics',
    'Rhetoric & Persuasion',
    'Statistics & Data Science',
    'Technology & Innovation'
  )),
  hero_image_url        TEXT,
  hero_image_caption    TEXT,
  audio_url             TEXT,
  audio_duration_seconds INT,
  is_published          BOOLEAN NOT NULL DEFAULT false,
  is_featured           BOOLEAN NOT NULL DEFAULT false,
  -- Array of callout objects: {type, content, block_order?}
  callouts              JSONB NOT NULL DEFAULT '[]',
  -- Array of source objects: {label, url?, timestamp?}
  sources               JSONB NOT NULL DEFAULT '[]',
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_reports_published ON news_reports (published_at DESC) WHERE is_published = true;
CREATE INDEX idx_news_reports_featured  ON news_reports (published_at DESC) WHERE is_featured = true AND is_published = true;
CREATE INDEX idx_news_reports_category  ON news_reports (category) WHERE is_published = true;

-- ── report_images ─────────────────────────────────────────────────────────────
CREATE TABLE report_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID NOT NULL REFERENCES news_reports(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  caption       TEXT,
  alt_text      TEXT,
  display_order INT NOT NULL,  -- controls injection point between body blocks
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_images_report ON report_images (report_id, display_order ASC);

-- ── agent_commentary ──────────────────────────────────────────────────────────
CREATE TABLE agent_commentary (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id        UUID NOT NULL REFERENCES news_reports(id) ON DELETE CASCADE,
  agent_id         UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  audio_url        TEXT,
  transcript       TEXT,
  duration_seconds INT,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_commentary_report ON agent_commentary (report_id, created_at ASC) WHERE is_published = true;

-- ── commentary_requests ───────────────────────────────────────────────────────
CREATE TABLE commentary_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id            UUID NOT NULL REFERENCES news_reports(id) ON DELETE CASCADE,
  agent_id             UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  -- Anonymous session ID matching audience_messages pattern
  requester_session_id TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'rejected')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commentary_requests_report ON commentary_requests (report_id);
CREATE INDEX idx_commentary_requests_status ON commentary_requests (status);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE news_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commentary     ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentary_requests  ENABLE ROW LEVEL SECURITY;

-- news_reports: public reads published only
CREATE POLICY "Public read published news reports"
  ON news_reports FOR SELECT
  USING (is_published = true);

CREATE POLICY "Service role manages news reports"
  ON news_reports FOR ALL
  USING (auth.role() = 'service_role');

-- report_images: public reads all (images are only linked to published reports in practice)
CREATE POLICY "Public read report images"
  ON report_images FOR SELECT
  USING (true);

CREATE POLICY "Service role manages report images"
  ON report_images FOR ALL
  USING (auth.role() = 'service_role');

-- agent_commentary: public reads published only
CREATE POLICY "Public read published commentary"
  ON agent_commentary FOR SELECT
  USING (is_published = true);

CREATE POLICY "Service role manages agent commentary"
  ON agent_commentary FOR ALL
  USING (auth.role() = 'service_role');

-- commentary_requests: anyone can insert (session-based, no auth required)
CREATE POLICY "Anyone can submit commentary requests"
  ON commentary_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role manages commentary requests"
  ON commentary_requests FOR ALL
  USING (auth.role() = 'service_role');
