-- Bipi Initial Schema
-- Covers all 5 core systems: Persona, Debate, Epistemic, Evolution, Audience

-- ─── Custom Types ───

CREATE TYPE agent_archetype AS ENUM (
  'hawk', 'dove', 'technocrat', 'populist',
  'cynic', 'conspiracy_theorist', 'institutionalist', 'libertarian'
);

CREATE TYPE agent_role AS ENUM ('debater', 'moderator');
CREATE TYPE agent_status AS ENUM ('official', 'guest', 'sandbox');
CREATE TYPE config_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE debate_status AS ENUM ('draft', 'scheduled', 'live', 'ended', 'cancelled');

CREATE TYPE room_format AS ENUM (
  'duel', 'triangle', 'panel_clash', 'tribunal', 'crossfire', 'synthesis'
);

CREATE TYPE round_phase AS ENUM (
  'opening', 'rebuttal', 'pressure', 'audience_evidence', 'closing'
);

CREATE TYPE claim_tier AS ENUM (
  'verified', 'plausible_inference', 'speculative', 'narrative_rhetoric'
);

CREATE TYPE vote_type AS ENUM (
  'strongest_argument', 'best_evidence', 'round_winner',
  'most_persuasive', 'most_evasive', 'best_rebuttal',
  'best_concession', 'extend_clash'
);

CREATE TYPE speaker_type AS ENUM ('agent', 'moderator', 'audience');
CREATE TYPE memory_status AS ENUM ('candidate', 'approved', 'rejected', 'canon');

CREATE TYPE evolution_stage AS ENUM (
  'stable', 'variant', 'hybrid', 'reclassification_candidate', 'reclassified'
);

CREATE TYPE update_class AS ENUM ('auto', 'slow_adaptive', 'protected');
CREATE TYPE llm_provider AS ENUM ('anthropic', 'openai');

-- ─── Agents ───

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  archetype agent_archetype NOT NULL,
  role agent_role NOT NULL DEFAULT 'debater',
  status agent_status NOT NULL DEFAULT 'official',
  evolution_stage evolution_stage NOT NULL DEFAULT 'stable',
  llm_provider llm_provider NOT NULL DEFAULT 'anthropic',
  llm_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  voice_id TEXT,
  avatar_url TEXT,
  short_bio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agents_archetype ON agents(archetype);
CREATE INDEX idx_agents_status ON agents(status);

-- ─── Agent Worldviews (versioned) ───

CREATE TABLE agent_worldviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status config_status NOT NULL DEFAULT 'draft',
  core_thesis TEXT NOT NULL,
  issue_lenses JSONB NOT NULL DEFAULT '{}',
  values TEXT[] NOT NULL DEFAULT '{}',
  belief_rules TEXT[] NOT NULL DEFAULT '{}',
  source_rules TEXT[] NOT NULL DEFAULT '{}',
  concession_rules TEXT[] NOT NULL DEFAULT '{}',
  red_lines TEXT[] NOT NULL DEFAULT '{}',
  archetype_traits TEXT[] NOT NULL DEFAULT '{}',
  doctrine TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, version)
);

CREATE INDEX idx_agent_worldviews_agent ON agent_worldviews(agent_id);
CREATE INDEX idx_agent_worldviews_status ON agent_worldviews(agent_id, status);

-- ─── Agent Style Profiles (versioned) ───

CREATE TABLE agent_style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status config_status NOT NULL DEFAULT 'draft',
  temperament TEXT NOT NULL,
  rhetorical_os TEXT[] NOT NULL DEFAULT '{}',
  tone TEXT NOT NULL DEFAULT '',
  pace TEXT NOT NULL DEFAULT '',
  humor_level REAL NOT NULL DEFAULT 0.5 CHECK (humor_level BETWEEN 0 AND 1),
  certainty_level REAL NOT NULL DEFAULT 0.5 CHECK (certainty_level BETWEEN 0 AND 1),
  interruption_tendency REAL NOT NULL DEFAULT 0.5 CHECK (interruption_tendency BETWEEN 0 AND 1),
  abstraction_level REAL NOT NULL DEFAULT 0.5 CHECK (abstraction_level BETWEEN 0 AND 1),
  warmth REAL NOT NULL DEFAULT 0.5 CHECK (warmth BETWEEN 0 AND 1),
  rhetorical_devices TEXT[] NOT NULL DEFAULT '{}',
  sentence_style TEXT NOT NULL DEFAULT '',
  signature_behaviors TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, version)
);

CREATE INDEX idx_agent_style_profiles_agent ON agent_style_profiles(agent_id);

-- ─── Agent Phrase Banks (versioned) ───

CREATE TABLE agent_phrasebanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status config_status NOT NULL DEFAULT 'draft',
  openers TEXT[] NOT NULL DEFAULT '{}',
  attacks TEXT[] NOT NULL DEFAULT '{}',
  rebuttals TEXT[] NOT NULL DEFAULT '{}',
  concessions TEXT[] NOT NULL DEFAULT '{}',
  closers TEXT[] NOT NULL DEFAULT '{}',
  audience_callouts TEXT[] NOT NULL DEFAULT '{}',
  topic_specific_phrases JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, version)
);

CREATE INDEX idx_agent_phrasebanks_agent ON agent_phrasebanks(agent_id);

-- ─── Agent Epistemic Profiles (versioned) — from the Epistemic Charter ───

CREATE TABLE agent_epistemic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  status config_status NOT NULL DEFAULT 'draft',
  default_claim_tier_tendency claim_tier NOT NULL DEFAULT 'plausible_inference',
  evidence_preferences TEXT[] NOT NULL DEFAULT '{}',
  epistemic_red_lines TEXT[] NOT NULL DEFAULT '{}',
  speculation_tolerance REAL NOT NULL DEFAULT 0.3 CHECK (speculation_tolerance BETWEEN 0 AND 1),
  high_risk_caution_topics TEXT[] NOT NULL DEFAULT '{}',
  source_quality_threshold TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, version)
);

CREATE INDEX idx_agent_epistemic_profiles_agent ON agent_epistemic_profiles(agent_id);

-- ─── Agent Relationships ───

CREATE TABLE agent_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  target_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  respect_score REAL NOT NULL DEFAULT 0.5 CHECK (respect_score BETWEEN 0 AND 1),
  distrust_score REAL NOT NULL DEFAULT 0.5 CHECK (distrust_score BETWEEN 0 AND 1),
  rivalry_score REAL NOT NULL DEFAULT 0.5 CHECK (rivalry_score BETWEEN 0 AND 1),
  relationship_type TEXT NOT NULL DEFAULT 'neutral',
  attack_angles TEXT[] NOT NULL DEFAULT '{}',
  known_weak_points TEXT[] NOT NULL DEFAULT '{}',
  shared_history_summary TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, target_agent_id)
);

CREATE INDEX idx_agent_relationships_agent ON agent_relationships(agent_id);

-- ─── Debate Format Definitions ───

CREATE TABLE debate_format_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  room_format room_format NOT NULL,
  min_participants INT NOT NULL DEFAULT 2,
  max_participants INT NOT NULL DEFAULT 2,
  round_sequence JSONB NOT NULL DEFAULT '[]',
  moderator_behavior JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Debates ───

CREATE TABLE debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  topic_framing JSONB NOT NULL DEFAULT '{}',
  format_id UUID NOT NULL REFERENCES debate_format_definitions(id),
  status debate_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  room_name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debates_status ON debates(status);
CREATE INDEX idx_debates_scheduled ON debates(scheduled_at);

-- ─── Debate Participants ───

CREATE TABLE debate_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  role agent_role NOT NULL DEFAULT 'debater',
  speaking_order INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ,
  UNIQUE(debate_id, agent_id)
);

CREATE INDEX idx_debate_participants_debate ON debate_participants(debate_id);

-- ─── Debate Turns ───

CREATE TABLE debate_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  speaker_type speaker_type NOT NULL,
  speaker_id UUID NOT NULL,
  round_phase round_phase NOT NULL,
  turn_index INT NOT NULL,
  transcript TEXT NOT NULL DEFAULT '',
  claim_tier claim_tier,
  claim_tags TEXT[] NOT NULL DEFAULT '{}',
  evidence_metadata JSONB,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debate_turns_debate ON debate_turns(debate_id);
CREATE INDEX idx_debate_turns_speaker ON debate_turns(speaker_id);
CREATE INDEX idx_debate_turns_order ON debate_turns(debate_id, turn_index);

-- ─── Debate Votes ───

CREATE TABLE debate_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL,
  vote_type vote_type NOT NULL,
  target_agent_id UUID REFERENCES agents(id),
  target_turn_id UUID REFERENCES debate_turns(id),
  round_phase round_phase,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debate_votes_debate ON debate_votes(debate_id);
CREATE INDEX idx_debate_votes_type ON debate_votes(debate_id, vote_type);

-- ─── Agent Evaluation Runs ───

CREATE TABLE agent_eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  epistemic_discipline_score REAL,
  persuasion_quality_score REAL,
  distinctiveness_score REAL,
  rivalry_dynamics_score REAL,
  participation_balance_score REAL,
  cast_chemistry_score REAL,
  overall_score REAL,
  scoring_details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(debate_id, agent_id)
);

CREATE INDEX idx_agent_eval_runs_agent ON agent_eval_runs(agent_id);

-- ─── Agent Memories (with gating pipeline) ───

CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  debate_id UUID REFERENCES debates(id),
  status memory_status NOT NULL DEFAULT 'candidate',
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  significance REAL NOT NULL DEFAULT 0.5 CHECK (significance BETWEEN 0 AND 1),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_memories_agent ON agent_memories(agent_id);
CREATE INDEX idx_agent_memories_status ON agent_memories(agent_id, status);

-- ─── Evolution: Trait Vectors ───

CREATE TABLE agent_trait_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  trait_name TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0.5 CHECK (value BETWEEN 0 AND 1),
  update_class update_class NOT NULL DEFAULT 'auto',
  last_updated_debate_id UUID REFERENCES debates(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, trait_name)
);

CREATE INDEX idx_agent_trait_vectors_agent ON agent_trait_vectors(agent_id);

-- ─── Evolution: Argument Library ───

CREATE TABLE agent_argument_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  argument_text TEXT NOT NULL,
  topic TEXT NOT NULL,
  effectiveness_score REAL NOT NULL DEFAULT 0.5,
  times_used INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_argument_library_agent ON agent_argument_library(agent_id);
CREATE INDEX idx_agent_argument_library_topic ON agent_argument_library(agent_id, topic);

-- ─── Evolution: Argument Performance ───

CREATE TABLE agent_argument_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  argument_id UUID NOT NULL REFERENCES agent_argument_library(id) ON DELETE CASCADE,
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  audience_reaction_score REAL NOT NULL DEFAULT 0.5,
  rebuttal_survived BOOLEAN NOT NULL DEFAULT false,
  claim_tier_accuracy claim_tier,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Evolution: Topic Confidence ───

CREATE TABLE agent_topic_confidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  confidence_score REAL NOT NULL DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
  debates_on_topic INT NOT NULL DEFAULT 0,
  last_debated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, topic)
);

-- ─── Evolution: Reflections ───

CREATE TABLE agent_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  what_went_well TEXT[] NOT NULL DEFAULT '{}',
  what_went_poorly TEXT[] NOT NULL DEFAULT '{}',
  rival_lessons JSONB NOT NULL DEFAULT '{}',
  topic_lessons TEXT[] NOT NULL DEFAULT '{}',
  try_next_time TEXT[] NOT NULL DEFAULT '{}',
  stop_doing TEXT[] NOT NULL DEFAULT '{}',
  drift_signal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, debate_id)
);

-- ─── Evolution: Drift Events ───

CREATE TABLE agent_drift_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  from_stage evolution_stage NOT NULL,
  to_stage evolution_stage NOT NULL,
  trigger_description TEXT NOT NULL,
  evidence_summary TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_drift_events_agent ON agent_drift_events(agent_id);

-- ─── Evolution: Snapshots ───

CREATE TABLE agent_evolution_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('weekly', 'seasonal', 'post_debate')),
  trait_vector_snapshot JSONB NOT NULL DEFAULT '{}',
  archetype_at_time agent_archetype NOT NULL,
  evolution_stage_at_time evolution_stage NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_evolution_snapshots_agent ON agent_evolution_snapshots(agent_id);

-- ─── Updated At Trigger ───

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_agent_worldviews_updated_at BEFORE UPDATE ON agent_worldviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_agent_style_profiles_updated_at BEFORE UPDATE ON agent_style_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_agent_phrasebanks_updated_at BEFORE UPDATE ON agent_phrasebanks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_agent_epistemic_profiles_updated_at BEFORE UPDATE ON agent_epistemic_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_debates_updated_at BEFORE UPDATE ON debates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
