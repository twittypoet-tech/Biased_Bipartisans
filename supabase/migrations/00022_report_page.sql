-- ── Report detail page: slug, transcript, comments, commentary ──────────────

-- 1. New columns on reporter_calls
ALTER TABLE reporter_calls ADD COLUMN slug TEXT UNIQUE;
ALTER TABLE reporter_calls ADD COLUMN transcript TEXT;
ALTER TABLE reporter_calls ADD COLUMN report_image_url TEXT;

-- Backfill slugs from headline (fallback to retell_call_id)
UPDATE reporter_calls
SET slug = COALESCE(
  left(
    lower(regexp_replace(regexp_replace(
      COALESCE(report_headline, retell_call_id),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ), '\s+', '-', 'g')),
    80
  ),
  retell_call_id
);

-- Deduplicate any collisions by appending short id
UPDATE reporter_calls r
SET slug = r.slug || '-' || left(r.id::text, 8)
WHERE EXISTS (
  SELECT 1 FROM reporter_calls r2
  WHERE r2.slug = r.slug AND r2.id < r.id
);

ALTER TABLE reporter_calls ALTER COLUMN slug SET NOT NULL;

-- 2. Threaded comments (schema-complete, UX-only empty state for now)
CREATE TABLE report_comments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_call_id  UUID        NOT NULL REFERENCES reporter_calls(id) ON DELETE CASCADE,
  parent_id       UUID        REFERENCES report_comments(id) ON DELETE CASCADE,
  session_id      TEXT        NOT NULL,
  author_name     TEXT,
  body            TEXT        NOT NULL,
  upvotes         INTEGER     NOT NULL DEFAULT 0,
  downvotes       INTEGER     NOT NULL DEFAULT 0,
  is_deleted      BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_comments_report ON report_comments (report_call_id, created_at ASC);
CREATE INDEX idx_report_comments_parent ON report_comments (parent_id);

-- 3. Agent commentary on reports
CREATE TABLE report_commentary (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_call_id   UUID        NOT NULL REFERENCES reporter_calls(id) ON DELETE CASCADE,
  agent_id         UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  audio_url        TEXT,
  transcript       TEXT,
  duration_seconds INTEGER,
  is_published     BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_commentary_published ON report_commentary (report_call_id, created_at ASC) WHERE is_published = true;

-- 4. Commentary requests
CREATE TABLE report_commentary_requests (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_call_id       UUID        NOT NULL REFERENCES reporter_calls(id) ON DELETE CASCADE,
  agent_id             UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  requester_session_id TEXT        NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'rejected')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. RLS
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_commentary_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read comments" ON report_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON report_comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can read published commentary" ON report_commentary FOR SELECT USING (is_published = true);

CREATE POLICY "Anyone can request commentary" ON report_commentary_requests FOR INSERT WITH CHECK (true);
