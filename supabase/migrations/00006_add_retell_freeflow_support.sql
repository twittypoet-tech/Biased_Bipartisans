-- Migration 006: Retell integration + freeflow debate format support
--
-- Changes:
--   agents                   → retell_agent_id (links to Retell agent)
--   debate_format_definitions → debate_style, min/max duration
--   debates                  → retell_call_ids, duration_override_minutes
--   debate_fact_checks       → addressed, addressed_in_turn_id
--   indexes                  → relay server realtime watchers

-- ── 1. Link agents to Retell ──────────────────────────────────────────────────
ALTER TABLE agents ADD COLUMN retell_agent_id TEXT;
CREATE UNIQUE INDEX idx_agents_retell_agent_id ON agents(retell_agent_id) WHERE retell_agent_id IS NOT NULL;

-- ── 2. Debate format: style + timing ─────────────────────────────────────────
ALTER TABLE debate_format_definitions
  ADD COLUMN debate_style TEXT NOT NULL DEFAULT 'freeflow'
    CHECK (debate_style IN ('structured', 'freeflow')),
  ADD COLUMN min_duration_minutes INT NOT NULL DEFAULT 15,
  ADD COLUMN max_duration_minutes INT NOT NULL DEFAULT 30;

-- Existing formats have round_sequence data — they are structured
UPDATE debate_format_definitions SET debate_style = 'structured';

-- ── 3. Debates: Retell call tracking + per-debate timing override ─────────────
-- retell_call_ids: { "<supabase_agent_uuid>": "<retell_call_id>" }
ALTER TABLE debates
  ADD COLUMN retell_call_ids JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN duration_override_minutes INT;

-- ── 4. Fact checks: addressed tracking (mirrors audience_messages) ────────────
ALTER TABLE debate_fact_checks
  ADD COLUMN addressed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN addressed_in_turn_id UUID REFERENCES debate_turns(id);

CREATE INDEX idx_fact_checks_debate_addressed
  ON debate_fact_checks(debate_id, addressed)
  WHERE addressed = false;

-- ── 5. Audience messages: index for relay server realtime watcher ─────────────
CREATE INDEX IF NOT EXISTS idx_audience_messages_debate_addressed
  ON audience_messages(debate_id, addressed)
  WHERE addressed = false;
