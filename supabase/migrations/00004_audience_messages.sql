-- Audience Q&A for live debates
-- Viewers can submit text questions and upvote others during a live debate.
-- The conversation engine checks these periodically and injects the top question.

CREATE TABLE audience_messages (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id             UUID        NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  session_id            TEXT        NOT NULL,
  content               TEXT        NOT NULL CHECK (char_length(content) BETWEEN 5 AND 280),
  upvotes               INTEGER     NOT NULL DEFAULT 0,
  addressed             BOOLEAN     NOT NULL DEFAULT false,
  addressed_in_turn_id  UUID        REFERENCES debate_turns(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One upvote per session per message
CREATE TABLE audience_message_upvotes (
  message_id  UUID  NOT NULL REFERENCES audience_messages(id) ON DELETE CASCADE,
  session_id  TEXT  NOT NULL,
  PRIMARY KEY (message_id, session_id)
);

CREATE INDEX audience_messages_debate_idx ON audience_messages (debate_id);
CREATE INDEX audience_messages_top_idx    ON audience_messages (debate_id, addressed, upvotes DESC, created_at ASC);

ALTER TABLE audience_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_message_upvotes ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "audience_messages_read"
  ON audience_messages FOR SELECT USING (true);

-- Anyone can submit a question
CREATE POLICY "audience_messages_insert"
  ON audience_messages FOR INSERT WITH CHECK (true);

-- Service role marks questions addressed
CREATE POLICY "audience_messages_update_service"
  ON audience_messages FOR UPDATE USING (true);

-- Public read of upvotes
CREATE POLICY "audience_upvotes_read"
  ON audience_message_upvotes FOR SELECT USING (true);

-- Anyone can upvote (PK prevents duplicates)
CREATE POLICY "audience_upvotes_insert"
  ON audience_message_upvotes FOR INSERT WITH CHECK (true);
