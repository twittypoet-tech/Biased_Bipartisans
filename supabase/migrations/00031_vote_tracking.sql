-- ── Vote tracking tables ─────────────────────────────────────────────────────
-- Track individual user votes to prevent duplicates while keeping
-- denormalized upvotes/downvotes integers on parent tables for fast reads.

-- 1. Report votes
CREATE TABLE reporter_call_votes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_call_id  UUID        NOT NULL REFERENCES reporter_calls(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  direction         TEXT        NOT NULL CHECK (direction IN ('up', 'down')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reporter_call_id, user_id)
);

CREATE INDEX idx_reporter_call_votes_call ON reporter_call_votes (reporter_call_id);
CREATE INDEX idx_reporter_call_votes_user ON reporter_call_votes (user_id);

-- 2. Commentary votes
CREATE TABLE commentary_votes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  commentary_id  UUID        NOT NULL REFERENCES report_commentary(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  direction      TEXT        NOT NULL CHECK (direction IN ('up', 'down')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (commentary_id, user_id)
);

CREATE INDEX idx_commentary_votes_commentary ON commentary_votes (commentary_id);

-- 3. RLS
ALTER TABLE reporter_call_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentary_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read report votes" ON reporter_call_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can insert report votes" ON reporter_call_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own report votes" ON reporter_call_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own report votes" ON reporter_call_votes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read commentary votes" ON commentary_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can insert commentary votes" ON commentary_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own commentary votes" ON commentary_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own commentary votes" ON commentary_votes FOR DELETE USING (auth.uid() = user_id);
