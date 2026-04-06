-- ── Multi-agent ID support + commentary request tracking ─────────────────────
--
-- Each agent can have different Retell agent IDs for different use cases:
-- retell_agent_id (existing) = debates
-- retell_commentary_agent_id = commentary on reports
-- retell_call_agent_id = future 1-on-1 calls

-- 1. Add commentary and call agent ID columns
ALTER TABLE agents ADD COLUMN retell_commentary_agent_id TEXT;
ALTER TABLE agents ADD COLUMN retell_call_agent_id TEXT;

CREATE UNIQUE INDEX idx_agents_retell_commentary
  ON agents(retell_commentary_agent_id)
  WHERE retell_commentary_agent_id IS NOT NULL;

CREATE UNIQUE INDEX idx_agents_retell_call
  ON agents(retell_call_agent_id)
  WHERE retell_call_agent_id IS NOT NULL;

-- 2. Track Retell call on commentary requests
ALTER TABLE report_commentary_requests ADD COLUMN retell_call_id TEXT;

-- 3. Expand status constraint to include in_progress
ALTER TABLE report_commentary_requests DROP CONSTRAINT IF EXISTS report_commentary_requests_status_check;
ALTER TABLE report_commentary_requests ADD CONSTRAINT report_commentary_requests_status_check
  CHECK (status IN ('pending', 'in_progress', 'fulfilled', 'rejected'));
