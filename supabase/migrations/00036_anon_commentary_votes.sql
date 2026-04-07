-- Allow anonymous commentary votes tracked by IP hash
ALTER TABLE commentary_votes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE commentary_votes ADD COLUMN ip_hash TEXT;

ALTER TABLE commentary_votes DROP CONSTRAINT IF EXISTS commentary_votes_commentary_id_user_id_key;

CREATE UNIQUE INDEX idx_commentary_votes_auth
  ON commentary_votes (commentary_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_commentary_votes_anon
  ON commentary_votes (commentary_id, ip_hash)
  WHERE user_id IS NULL AND ip_hash IS NOT NULL;

DROP POLICY IF EXISTS "Auth users can insert commentary votes" ON commentary_votes;
DROP POLICY IF EXISTS "Auth users can vote on commentary" ON commentary_votes;

CREATE POLICY "Anyone can vote on commentary" ON commentary_votes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can change own commentary vote" ON commentary_votes;
DROP POLICY IF EXISTS "Users can delete own commentary vote" ON commentary_votes;

CREATE POLICY "Users can update own commentary vote" ON commentary_votes
  FOR UPDATE USING (auth.uid() = user_id OR (user_id IS NULL AND ip_hash IS NOT NULL));

CREATE POLICY "Users can delete own commentary vote" ON commentary_votes
  FOR DELETE USING (auth.uid() = user_id OR (user_id IS NULL AND ip_hash IS NOT NULL));
