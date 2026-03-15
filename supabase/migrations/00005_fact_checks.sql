-- debate_fact_checks: Tavily oracle search results per debate
-- Each row is one oracle lookup — triggered by background context scanning
-- or an agent explicitly requesting a fact-check

CREATE TABLE debate_fact_checks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id   UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  query       TEXT NOT NULL,
  answer      TEXT,
  sources     JSONB NOT NULL DEFAULT '[]',
  -- who triggered this (null = background oracle auto-search)
  triggered_by_agent_id UUID REFERENCES agents(id),
  triggered_by_turn_id  UUID REFERENCES debate_turns(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX debate_fact_checks_debate_idx ON debate_fact_checks(debate_id, created_at DESC);

ALTER TABLE debate_fact_checks ENABLE ROW LEVEL SECURITY;

-- Public can read fact-checks (they appear in the debate room feed)
CREATE POLICY "public_read_fact_checks" ON debate_fact_checks
  FOR SELECT USING (true);

-- Only service role inserts (the agent worker)
CREATE POLICY "service_insert_fact_checks" ON debate_fact_checks
  FOR INSERT WITH CHECK (true);
