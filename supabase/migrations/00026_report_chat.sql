-- Report chat: live discussion with The Reporter via Retell Chat Agent

-- Chat session ID on reporter_calls (created lazily on first question)
ALTER TABLE reporter_calls ADD COLUMN IF NOT EXISTS chat_id TEXT;

-- Chat messages (local mirror of Retell chat + user attribution)
CREATE TABLE report_chat_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_call_id  UUID        NOT NULL REFERENCES reporter_calls(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES user_profiles(id),
  display_name    TEXT,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'reporter')),
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_chat ON report_chat_messages (report_call_id, created_at ASC);

-- RLS
ALTER TABLE report_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read chat messages" ON report_chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert" ON report_chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
