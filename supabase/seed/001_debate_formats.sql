-- Debate Format Definitions
-- v1: Duel and Panel Clash

INSERT INTO debate_format_definitions (id, name, room_format, min_participants, max_participants, round_sequence, moderator_behavior)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Classic Duel',
    'duel',
    2, 2,
    '[
      {"phase": "opening", "duration_seconds": 180, "speaking_order": "sequential", "allow_interruptions": false, "moderator_active": true, "description": "Each agent presents their opening thesis."},
      {"phase": "rebuttal", "duration_seconds": 120, "speaking_order": "sequential", "allow_interruptions": false, "moderator_active": true, "description": "Direct response to opponent opening."},
      {"phase": "pressure", "duration_seconds": 150, "speaking_order": "directed", "allow_interruptions": true, "moderator_active": true, "description": "Cross-examination. Agents press each other on weak points."},
      {"phase": "audience_evidence", "duration_seconds": 120, "speaking_order": "directed", "allow_interruptions": false, "moderator_active": true, "description": "Audience questions and evidence challenges."},
      {"phase": "closing", "duration_seconds": 120, "speaking_order": "sequential", "allow_interruptions": false, "moderator_active": true, "description": "Final synthesis and memorable framing."}
    ]'::jsonb,
    '{
      "opening": "Frame the issue clearly. Introduce both agents and the core tension.",
      "rebuttal": "Ensure direct engagement — no dodging.",
      "pressure": "Redirect if one agent dominates. Force direct answers.",
      "audience_evidence": "Select audience questions that expose unresolved tension.",
      "closing": "Signal final round. Ask each agent for one take-home line."
    }'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Panel Clash',
    'panel_clash',
    4, 4,
    '[
      {"phase": "opening", "duration_seconds": 120, "speaking_order": "sequential", "allow_interruptions": false, "moderator_active": true, "description": "Each agent presents their opening frame. Shorter per agent to keep pace."},
      {"phase": "rebuttal", "duration_seconds": 150, "speaking_order": "directed", "allow_interruptions": false, "moderator_active": true, "description": "Moderator assigns directed rebuttals — Agent A responds to C, B responds to D, then swap."},
      {"phase": "pressure", "duration_seconds": 180, "speaking_order": "directed", "allow_interruptions": true, "moderator_active": true, "description": "Forced pairings and spotlight rounds. One agent takes pressure from the rest."},
      {"phase": "audience_evidence", "duration_seconds": 120, "speaking_order": "directed", "allow_interruptions": false, "moderator_active": true, "description": "Audience votes on which clash extends. Questions directed at specific agents."},
      {"phase": "closing", "duration_seconds": 90, "speaking_order": "sequential", "allow_interruptions": false, "moderator_active": true, "description": "Short closing statements. Moderator summarizes key contrasts."}
    ]'::jsonb,
    '{
      "opening": "Introduce all agents and the ecosystem-level issue. Set up the contrast grid.",
      "rebuttal": "Assign directed rebuttals to maximize contrast. Prevent free-for-all.",
      "pressure": "Run spotlight rounds. Redistribute airtime if one agent dominates or fades.",
      "audience_evidence": "Let audience vote which clash extends. Direct questions to expose blind spots.",
      "closing": "Keep it tight. Ask for one sentence crystallization from each agent."
    }'::jsonb
  );
