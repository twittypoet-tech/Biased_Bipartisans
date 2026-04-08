-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00037: Article Agent Authorship
-- Adds agent_id and story_group_id to news_reports for agent-authored articles.
-- Expands category CHECK to support general news categories.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── New columns ──────────────────────────────────────────────────────────────

ALTER TABLE news_reports ADD COLUMN agent_id UUID REFERENCES agents(id);
ALTER TABLE news_reports ADD COLUMN story_group_id TEXT;

CREATE INDEX idx_news_reports_agent
  ON news_reports(agent_id)
  WHERE is_published = true;

CREATE INDEX idx_news_reports_story_group
  ON news_reports(story_group_id)
  WHERE story_group_id IS NOT NULL;

-- ── Expand category CHECK ────────────────────────────────────────────────────
-- Keep original 8 academic categories, add 12 general news categories.

ALTER TABLE news_reports DROP CONSTRAINT news_reports_category_check;

ALTER TABLE news_reports ADD CONSTRAINT news_reports_category_check CHECK (category IN (
  -- Original 8
  'Environmental Science',
  'History & Politics',
  'Law & Jurisprudence',
  'Medicine & Healthcare',
  'Philosophy & Ethics',
  'Rhetoric & Persuasion',
  'Statistics & Data Science',
  'Technology & Innovation',
  -- General news categories
  'Economy & Business',
  'National Security & Defense',
  'Education & Culture',
  'Energy & Climate',
  'Science & Space',
  'Criminal Justice',
  'Immigration',
  'Infrastructure & Housing',
  'World Affairs',
  'Domestic Policy',
  'Tech & AI',
  'Social Issues'
));
