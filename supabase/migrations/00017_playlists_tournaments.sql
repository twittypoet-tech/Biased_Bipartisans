-- Migration 017: Playlists and Tournaments
--
-- Adds two new spectator-facing features:
--   1. Playlists  — curated, ordered collections of debates
--   2. Tournaments — single-elimination AI-agent bracket competitions
--
-- Also adds:
--   - playlist_id / tournament_id FK columns to debates
--   - trophy_count column to agents
--   - agent_trophies table for tournament wins

-- ── New ENUM types ────────────────────────────────────────────────────────────

CREATE TYPE tournament_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE matchup_status   AS ENUM ('pending', 'scheduled', 'live', 'completed', 'bye');

-- ── Playlists ─────────────────────────────────────────────────────────────────

CREATE TABLE playlists (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  slug            TEXT        NOT NULL UNIQUE,
  description     TEXT        NOT NULL DEFAULT '',
  theme           TEXT        NOT NULL DEFAULT '',
  cover_image_url TEXT,
  display_order   INT         NOT NULL DEFAULT 0,
  is_published    BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_playlists_published ON playlists(is_published, display_order);

CREATE TABLE playlist_debates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  debate_id   UUID NOT NULL REFERENCES debates(id)   ON DELETE CASCADE,
  position    INT  NOT NULL DEFAULT 0,
  UNIQUE(playlist_id, debate_id)
);

CREATE INDEX idx_playlist_debates_playlist ON playlist_debates(playlist_id, position);

-- ── Tournaments ───────────────────────────────────────────────────────────────

CREATE TABLE tournaments (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT             NOT NULL,
  slug              TEXT             NOT NULL UNIQUE,
  description       TEXT             NOT NULL DEFAULT '',
  topic_title       TEXT             NOT NULL,
  topic_framing     JSONB            NOT NULL DEFAULT '{}',
  format_id         UUID             NOT NULL REFERENCES debate_format_definitions(id),
  status            tournament_status NOT NULL DEFAULT 'pending',
  bracket_size      INT              NOT NULL CHECK (bracket_size IN (4, 8, 16, 32)),
  current_round     INT              NOT NULL DEFAULT 0,
  total_rounds      INT              NOT NULL,
  champion_agent_id UUID             REFERENCES agents(id),
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_tournaments_status ON tournaments(status);

-- ── Tournament Rounds ─────────────────────────────────────────────────────────

CREATE TABLE tournament_rounds (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID          NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number  INT           NOT NULL,
  label         TEXT          NOT NULL,
  status        matchup_status NOT NULL DEFAULT 'pending',
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  UNIQUE(tournament_id, round_number)
);

CREATE INDEX idx_tournament_rounds_tournament ON tournament_rounds(tournament_id, round_number);

-- ── Tournament Matchups ───────────────────────────────────────────────────────
-- Self-referential next_matchup_id means later rounds must be inserted before
-- earlier rounds when building the initial bracket.

CREATE TABLE tournament_matchups (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID          NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id        UUID          NOT NULL REFERENCES tournament_rounds(id) ON DELETE CASCADE,
  round_number    INT           NOT NULL,
  matchup_number  INT           NOT NULL,
  status          matchup_status NOT NULL DEFAULT 'pending',
  agent_a_id      UUID          REFERENCES agents(id),
  agent_b_id      UUID          REFERENCES agents(id),
  winner_agent_id UUID          REFERENCES agents(id),
  debate_id       UUID          REFERENCES debates(id),
  next_matchup_id UUID          REFERENCES tournament_matchups(id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, round_number, matchup_number)
);

CREATE INDEX idx_tournament_matchups_tournament ON tournament_matchups(tournament_id, round_number);
CREATE INDEX idx_tournament_matchups_debate     ON tournament_matchups(debate_id)       WHERE debate_id IS NOT NULL;
CREATE INDEX idx_tournament_matchups_next       ON tournament_matchups(next_matchup_id) WHERE next_matchup_id IS NOT NULL;

-- ── Agent Trophies ────────────────────────────────────────────────────────────

CREATE TABLE agent_trophies (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID        NOT NULL REFERENCES agents(id)      ON DELETE CASCADE,
  tournament_id UUID        NOT NULL REFERENCES tournaments(id)  ON DELETE CASCADE,
  trophy_type   TEXT        NOT NULL DEFAULT 'champion',
  awarded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, tournament_id)
);

CREATE INDEX idx_agent_trophies_agent      ON agent_trophies(agent_id);
CREATE INDEX idx_agent_trophies_tournament ON agent_trophies(tournament_id);

-- ── FK columns on existing tables ────────────────────────────────────────────

ALTER TABLE debates
  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id),
  ADD COLUMN IF NOT EXISTS playlist_id   UUID REFERENCES playlists(id);

CREATE INDEX idx_debates_tournament ON debates(tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX idx_debates_playlist   ON debates(playlist_id)   WHERE playlist_id   IS NOT NULL;

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS trophy_count INT NOT NULL DEFAULT 0;

-- ── Updated-at triggers ───────────────────────────────────────────────────────

CREATE TRIGGER set_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_tournament_matchups_updated_at
  BEFORE UPDATE ON tournament_matchups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE playlists          ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_debates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_rounds  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trophies     ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "playlists_public_read"
  ON playlists FOR SELECT
  USING (is_published = true);

CREATE POLICY "playlist_debates_public_read"
  ON playlist_debates FOR SELECT
  USING (true);

CREATE POLICY "tournaments_public_read"
  ON tournaments FOR SELECT
  USING (true);

CREATE POLICY "tournament_rounds_public_read"
  ON tournament_rounds FOR SELECT
  USING (true);

CREATE POLICY "tournament_matchups_public_read"
  ON tournament_matchups FOR SELECT
  USING (true);

CREATE POLICY "agent_trophies_public_read"
  ON agent_trophies FOR SELECT
  USING (true);

-- Service-role full access (backend writes)
CREATE POLICY "playlists_service_write"
  ON playlists FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "playlist_debates_service_write"
  ON playlist_debates FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "tournaments_service_write"
  ON tournaments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "tournament_rounds_service_write"
  ON tournament_rounds FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "tournament_matchups_service_write"
  ON tournament_matchups FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "agent_trophies_service_write"
  ON agent_trophies FOR ALL
  USING (auth.role() = 'service_role');
