-- Add audience score (Layer 3) and composite score columns to agent_eval_runs
ALTER TABLE agent_eval_runs ADD COLUMN IF NOT EXISTS audience_score REAL;
ALTER TABLE agent_eval_runs ADD COLUMN IF NOT EXISTS composite_score REAL;
