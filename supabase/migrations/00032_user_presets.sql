-- ── Personalized user presets ─────────────────────────────────────────────────
-- Generated daily by OpenAI based on user interests.
-- Mirrors reporter_presets pattern but per-user with interest tagging.

CREATE TABLE user_presets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  query_template TEXT        NOT NULL,
  interest       TEXT,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active      BOOLEAN     NOT NULL DEFAULT true
);

CREATE INDEX idx_user_presets_user ON user_presets (user_id, is_active, sort_order)
  WHERE is_active = true;

-- RLS
ALTER TABLE user_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own presets" ON user_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages presets" ON user_presets FOR ALL
  USING (true);
