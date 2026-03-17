-- Migration 010: Debate playbook (turn_config)
--
-- Adds turn_config JSONB to debate_format_definitions (format-level default)
-- and to debates (per-debate override). The conductor reads:
--   debate.turn_config ?? format.turn_config ?? DEFAULT_TURN_CONFIG
--
-- Schema for turn_config:
-- {
--   "turns": [
--     { "id": "t1", "speaker": "moderator"|"agent_a"|"agent_b", "label": "..." },
--     { "id": "t6", "type": "round_robin", "speakers": ["agent_a","agent_b"], "rounds": 3, "label": "..." }
--   ]
-- }

ALTER TABLE debate_format_definitions
  ADD COLUMN turn_config JSONB;

ALTER TABLE debates
  ADD COLUMN turn_config JSONB;
