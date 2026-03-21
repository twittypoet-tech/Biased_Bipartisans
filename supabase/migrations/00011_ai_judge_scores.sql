-- AI Judge Panel: Layer 1 of 3-layer scoring system
-- Stores per-model, per-dimension scores from LLM judges (Claude + GPT-4o)

CREATE TABLE agent_eval_judge_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  eval_run_id UUID NOT NULL REFERENCES agent_eval_runs(id) ON DELETE CASCADE,
  judge_model TEXT NOT NULL,       -- e.g. 'claude-sonnet-4-6', 'gpt-4o'
  judge_provider TEXT NOT NULL,    -- 'anthropic' | 'openai'
  argument_strength REAL NOT NULL CHECK (argument_strength BETWEEN 0 AND 1),
  logical_coherence REAL NOT NULL CHECK (logical_coherence BETWEEN 0 AND 1),
  evidence_quality REAL NOT NULL CHECK (evidence_quality BETWEEN 0 AND 1),
  responsiveness REAL NOT NULL CHECK (responsiveness BETWEEN 0 AND 1),
  rhetorical_effectiveness REAL NOT NULL CHECK (rhetorical_effectiveness BETWEEN 0 AND 1),
  overall_score REAL NOT NULL CHECK (overall_score BETWEEN 0 AND 1),
  reasoning JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_judge_scores_debate ON agent_eval_judge_scores(debate_id);
CREATE INDEX idx_eval_judge_scores_agent ON agent_eval_judge_scores(agent_id);
CREATE INDEX idx_eval_judge_scores_eval_run ON agent_eval_judge_scores(eval_run_id);

-- Add ai_judge_score column to eval runs (average across all judges)
ALTER TABLE agent_eval_runs ADD COLUMN IF NOT EXISTS ai_judge_score REAL;
