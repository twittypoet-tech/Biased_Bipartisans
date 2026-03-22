-- Layer 2 objective metrics scoring table
-- One row per agent per debate, scored by a single LLM evaluator (Claude Sonnet)

ALTER TABLE agent_eval_runs ADD COLUMN IF NOT EXISTS objective_score REAL;

CREATE TABLE IF NOT EXISTS agent_eval_objective_scores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id            UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  agent_id             UUID NOT NULL REFERENCES agents(id),
  eval_run_id          UUID NOT NULL REFERENCES agent_eval_runs(id) ON DELETE CASCADE,
  evaluator_model      TEXT NOT NULL,  -- e.g. 'claude-sonnet-4-6'
  epistemic_discipline REAL NOT NULL CHECK (epistemic_discipline BETWEEN 0 AND 1),
  distinctiveness      REAL NOT NULL CHECK (distinctiveness BETWEEN 0 AND 1),
  factual_accuracy     REAL NOT NULL CHECK (factual_accuracy BETWEEN 0 AND 1),
  direct_rebuttal      REAL NOT NULL CHECK (direct_rebuttal BETWEEN 0 AND 1),
  relevance            REAL NOT NULL CHECK (relevance BETWEEN 0 AND 1),
  consistency          REAL NOT NULL CHECK (consistency BETWEEN 0 AND 1),
  claim_support        REAL NOT NULL CHECK (claim_support BETWEEN 0 AND 1),
  overall_score        REAL NOT NULL CHECK (overall_score BETWEEN 0 AND 1),
  reasoning            JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_objective_scores_debate   ON agent_eval_objective_scores(debate_id);
CREATE INDEX IF NOT EXISTS idx_eval_objective_scores_agent    ON agent_eval_objective_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_eval_objective_scores_eval_run ON agent_eval_objective_scores(eval_run_id);
