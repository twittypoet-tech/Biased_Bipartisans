

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_worldviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_phrasebanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_epistemic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_format_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_eval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trait_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_argument_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_argument_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_topic_confidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_drift_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_evolution_snapshots ENABLE ROW LEVEL SECURITY;

-- ─── Public Read Access (anon + authenticated) ───

-- Agents: public can read all agents
CREATE POLICY "agents_public_read" ON agents
  FOR SELECT USING (true);

-- Agent configs: public can read ACTIVE configs only
CREATE POLICY "worldviews_public_read_active" ON agent_worldviews
  FOR SELECT USING (status = 'active');

CREATE POLICY "style_profiles_public_read_active" ON agent_style_profiles
  FOR SELECT USING (status = 'active');

CREATE POLICY "phrasebanks_public_read_active" ON agent_phrasebanks
  FOR SELECT USING (status = 'active');

CREATE POLICY "epistemic_profiles_public_read_active" ON agent_epistemic_profiles
  FOR SELECT USING (status = 'active');

-- Debate formats: public read
CREATE POLICY "formats_public_read" ON debate_format_definitions
  FOR SELECT USING (true);

-- Debates: public read
CREATE POLICY "debates_public_read" ON debates
  FOR SELECT USING (true);

-- Debate participants: public read
CREATE POLICY "participants_public_read" ON debate_participants
  FOR SELECT USING (true);

-- Debate turns: public read
CREATE POLICY "turns_public_read" ON debate_turns
  FOR SELECT USING (true);

-- Debate votes: public read + authenticated insert
CREATE POLICY "votes_public_read" ON debate_votes
  FOR SELECT USING (true);

CREATE POLICY "votes_authenticated_insert" ON debate_votes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─── Service Role Full Access (for backend services: agent worker, jobs) ───
-- Service role bypasses RLS by default in Supabase, so these are primarily
-- for tables that need explicit backend-only write access.

-- Agent relationships: service role only
CREATE POLICY "relationships_service_read" ON agent_relationships
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "relationships_service_write" ON agent_relationships
  FOR ALL USING (auth.role() = 'service_role');

-- Agent memories: service role only
CREATE POLICY "memories_service_read" ON agent_memories
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "memories_service_write" ON agent_memories
  FOR ALL USING (auth.role() = 'service_role');

-- Eval runs: service role only
CREATE POLICY "eval_runs_service_read" ON agent_eval_runs
  FOR SELECT USING (auth.role() = 'service_role');

CREATE POLICY "eval_runs_service_write" ON agent_eval_runs
  FOR ALL USING (auth.role() = 'service_role');

-- Evolution tables: service role only
CREATE POLICY "trait_vectors_service" ON agent_trait_vectors
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "argument_library_service" ON agent_argument_library
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "argument_performance_service" ON agent_argument_performance
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "topic_confidence_service" ON agent_topic_confidence
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "reflections_service" ON agent_reflections
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "drift_events_service" ON agent_drift_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "evolution_snapshots_service" ON agent_evolution_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- ─── Service Role Write Access for Admin-Managed Tables ───

CREATE POLICY "agents_service_write" ON agents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "worldviews_service_write" ON agent_worldviews
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "style_profiles_service_write" ON agent_style_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "phrasebanks_service_write" ON agent_phrasebanks
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "epistemic_profiles_service_write" ON agent_epistemic_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "formats_service_write" ON debate_format_definitions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "debates_service_write" ON debates
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "participants_service_write" ON debate_participants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "turns_service_write" ON debate_turns
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "votes_service_write" ON debate_votes
  FOR ALL USING (auth.role() = 'service_role');
