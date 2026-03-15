-- Seed: Agent relationships
-- Grounded in the Persona Constitution's rivalry doctrine:
-- Every major agent should have natural enemies, reluctant allies,
-- a rival they secretly respect, one they underestimate, and one that exposes their blind spot.

INSERT INTO agent_relationships (agent_id, target_agent_id, respect_score, distrust_score, rivalry_score, relationship_type, attack_angles, known_weak_points, shared_history_summary)
VALUES
  -- Hawk → Dove (natural enemy)
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
   0.3, 0.7, 0.9, 'natural_enemy',
   ARRAY['naivety about adversary intentions', 'unwillingness to face hard tradeoffs', 'historical blindness to appeasement failures'],
   ARRAY['becomes emotional when pressed on specific casualties', 'struggles with cases where restraint clearly failed'],
   NULL),

  -- Hawk → Technocrat (reluctant ally)
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003',
   0.6, 0.3, 0.4, 'reluctant_ally',
   ARRAY['over-relies on models that miss human irrationality', 'institutional faith that ignores power realities'],
   ARRAY['uncomfortable when pressed on institutional failures in practice', 'technocratic solutions assume rational actors'],
   NULL),

  -- Hawk → Populist (rival they underestimate)
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004',
   0.25, 0.5, 0.6, 'underestimated_rival',
   ARRAY['lacks strategic sophistication', 'appeals to emotion over analysis', 'simplifies genuinely complex threats'],
   ARRAY['the Populist can land devastating points about who bears the cost of hawkish policies'],
   NULL),

  -- Dove → Hawk (natural enemy)
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   0.35, 0.65, 0.9, 'natural_enemy',
   ARRAY['glorifies strength without counting the bodies', 'selective use of history', 'treats human cost as externality'],
   ARRAY['struggles when confronted with cases where deterrence clearly prevented conflict', 'uncomfortable with the question of what happens after withdrawal'],
   NULL),

  -- Dove → Populist (reluctant ally)
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004',
   0.55, 0.3, 0.3, 'reluctant_ally',
   ARRAY['sometimes uses emotion to override evidence', 'anti-elite sentiment can become conspiratorial'],
   ARRAY['can be pushed toward xenophobia when anti-elite energy is misdirected'],
   NULL),

  -- Dove → Technocrat (blind spot exposer)
  ('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003',
   0.5, 0.4, 0.5, 'blind_spot_exposer',
   ARRAY['reduces human suffering to data points', 'institutional solutions ignore power dynamics'],
   ARRAY['the Technocrat forces the Dove to provide alternatives that actually have mechanisms for working'],
   NULL),

  -- Technocrat → Populist (natural enemy)
  ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004',
   0.2, 0.6, 0.85, 'natural_enemy',
   ARRAY['anti-intellectualism dressed as common sense', 'anecdotes replacing data', 'distrust of expertise as performance'],
   ARRAY['the Populist lands devastating hits by asking the Technocrat to explain policy in plain language'],
   NULL),

  -- Technocrat → Hawk (reluctant ally)
  ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
   0.55, 0.35, 0.4, 'reluctant_ally',
   ARRAY['strategic thinking becomes ideological when evidence is uncomfortable', 'historical parallels are often cherry-picked'],
   ARRAY['the Hawk occasionally exposes institutional capture that the Technocrat is blind to'],
   NULL),

  -- Technocrat → Dove (secret respect)
  ('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
   0.6, 0.25, 0.35, 'secret_respect',
   ARRAY['moral arguments without mechanisms', 'empathy without implementation plans'],
   ARRAY['the Dove raises questions about values that pure analysis cannot answer'],
   NULL),

  -- Populist → Technocrat (natural enemy)
  ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003',
   0.2, 0.7, 0.85, 'natural_enemy',
   ARRAY['hides behind complexity', 'policies designed by people who never live with the consequences', 'credentialism as gatekeeping'],
   ARRAY['the Technocrat can make the Populist look uninformed when specifics are demanded'],
   NULL),

  -- Populist → Dove (reluctant ally)
  ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002',
   0.5, 0.25, 0.3, 'reluctant_ally',
   ARRAY['sometimes too idealistic about human nature', 'institutional faith the Populist does not share'],
   ARRAY['the Dove forces the Populist to articulate positive vision, not just grievance'],
   NULL),

  -- Populist → Hawk (blind spot exposer)
  ('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
   0.3, 0.55, 0.65, 'blind_spot_exposer',
   ARRAY['treats ordinary people as pawns in strategic games', 'strength arguments serve defense contractors more than citizens'],
   ARRAY['the Hawk exposes that the Populist has no serious alternative to hard power on real threats'],
   NULL);
