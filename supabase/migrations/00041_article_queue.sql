-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00041: article_queue + feature_flags
--
-- Adds a queue table that backs the automated news-scout / article-writer
-- pipeline. The scout inserts pending rows + sends Telegram approval cards;
-- the user approves/rejects from Telegram; the writer drains 'approved' rows
-- and writes the article via skills/generate-article.md.
--
-- feature_flags is a tiny key/value table the scout and writer skills check
-- before doing any work, so the bot can be paused from Telegram without a
-- code deploy.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE article_queue_status AS ENUM (
  'pending',     -- scout inserted, awaiting Telegram approval
  'approved',    -- user tapped Approve, writer can pick it up
  'rejected',    -- user tapped Reject
  'generating',  -- writer claimed it, generation in progress
  'published',   -- successfully written, news_reports row exists
  'failed'       -- writer hit an unrecoverable error
);

CREATE TABLE article_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The story
  topic TEXT NOT NULL,                  -- short headline angle
  topic_summary TEXT,                   -- 1-3 sentence elaboration
  source_urls TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,                        -- one of the 20 valid news_reports categories

  -- Persona pick (the voice the article will be written in)
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,

  -- Lifecycle
  status article_queue_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ,

  -- Telegram correlation (so the console session can edit the right card)
  telegram_chat_id BIGINT,
  telegram_message_id BIGINT,

  -- Result correlation
  generated_report_id UUID REFERENCES news_reports(id) ON DELETE SET NULL,
  error TEXT,

  -- Audit: did the user override the scout's persona pick?
  reassigned_by_user BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_article_queue_status_created
  ON article_queue(status, created_at);

CREATE INDEX idx_article_queue_approved
  ON article_queue(approved_at)
  WHERE status = 'approved';

CREATE INDEX idx_article_queue_pending
  ON article_queue(created_at)
  WHERE status = 'pending';

-- ─────────────────────────────────────────────────────────────────────────────
-- feature_flags: small key/value table for runtime toggles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO feature_flags (key, enabled) VALUES
  ('article_scout_enabled', true),
  ('article_writer_enabled', true)
ON CONFLICT (key) DO NOTHING;
