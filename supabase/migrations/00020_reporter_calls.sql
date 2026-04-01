-- ── The Reporter: post-call news feed ────────────────────────────────────────
--
-- Every call to The Reporter agent is analysed by Retell post-call.
-- Results land here via the /api/webhooks/retell endpoint.
-- Only rows where call_successful AND report_delivered = true are published.

-- 1. Extend enums (must be separate statements)
ALTER TYPE agent_archetype ADD VALUE IF NOT EXISTS 'reporter';
ALTER TYPE agent_role      ADD VALUE IF NOT EXISTS 'reporter';

-- 2. reporter_calls table
CREATE TABLE reporter_calls (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  retell_call_id    TEXT        UNIQUE NOT NULL,

  -- Retell preset analysis fields
  call_summary      TEXT,
  call_successful   BOOLEAN,
  user_sentiment    TEXT        CHECK (user_sentiment IN ('Positive', 'Neutral', 'Negative')),

  -- Custom post-call analysis fields
  report_headline   TEXT,
  report_category   TEXT        CHECK (report_category IN (
    'Environmental Science',
    'History & Politics',
    'Law & Jurisprudence',
    'Medicine & Healthcare',
    'Philosophy & Ethics',
    'Rhetoric & Persuasion',
    'Statistics & Data Science',
    'Technology & Innovation'
  )),
  source_count      INTEGER,
  key_entities      TEXT,
  sources_mentioned TEXT,
  report_delivered  BOOLEAN,
  sources_cited     BOOLEAN,
  report_quality    TEXT        CHECK (report_quality IN ('Complete', 'Partial', 'Failed')),

  -- Call metadata
  recording_url     TEXT,
  call_language     TEXT        NOT NULL DEFAULT 'en-US',
  user_query        TEXT,
  duration_seconds  INTEGER,

  -- Forum engagement
  upvotes           INTEGER     NOT NULL DEFAULT 0,
  downvotes         INTEGER     NOT NULL DEFAULT 0,

  -- Visibility gate: set by webhook when call_successful AND report_delivered
  is_published      BOOLEAN     NOT NULL DEFAULT false,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reporter_calls_published_at_idx  ON reporter_calls (created_at DESC) WHERE is_published = true;
CREATE INDEX reporter_calls_published_cat_idx ON reporter_calls (report_category) WHERE is_published = true;
CREATE INDEX reporter_calls_upvotes_idx       ON reporter_calls (upvotes DESC)    WHERE is_published = true;

-- 3. The Reporter agent row
INSERT INTO agents (
  id,
  name,
  slug,
  archetype,
  role,
  status,
  retell_agent_id,
  short_bio,
  evolution_stage,
  llm_provider,
  llm_model,
  expertise
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  'The Reporter',
  'the-reporter',
  'reporter',
  'reporter',
  'official',
  'agent_0fd7ecb17c2e5717f23ed69511',
  'The Reporter is BIPI''s straight-shooting news anchor. No opinions. No editorializing. Just verified facts, sourced live, delivered with precision.',
  'stable',
  'anthropic',
  'claude-sonnet-4-6',
  ARRAY[
    'Environmental Science',
    'History & Politics',
    'Law & Jurisprudence',
    'Medicine & Healthcare',
    'Philosophy & Ethics',
    'Rhetoric & Persuasion',
    'Statistics & Data Science',
    'Technology & Innovation'
  ]
) ON CONFLICT (slug) DO NOTHING;
