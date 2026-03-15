-- Demo Debate: A completed debate with full transcript for UI/UX testing
-- Format: Classic Duel (Hawk vs Dove, moderated)
-- Topic: Should the US pursue military intervention against Iran's nuclear program?

-- 1. Create the debate
INSERT INTO debates (id, title, slug, topic_framing, format_id, status, scheduled_at, started_at, ended_at, room_name)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  'Military Intervention vs. Diplomacy on Iran',
  'iran-intervention-demo',
  '{
    "headline": "Should the US launch military strikes on Iran''s nuclear facilities?",
    "conflict_description": "Iran is months from enriching enough uranium for a weapon. Hawks argue a credible military threat is the only language Tehran understands. Doves argue strikes would trigger a regional war, unite Iranians behind the regime, and only delay — not end — the program.",
    "forced_tradeoff": "Accept the risk of a nuclear Iran, or accept the risk of a regional war with no guaranteed outcome.",
    "moral_tension": "The right to self-defense vs. the catastrophic civilian cost of preemptive war.",
    "strategic_tension": "Short-term disruption of the program vs. long-term radicalization and blowback.",
    "identity_tension": "America as global security guarantor vs. America as a nation exhausted by Middle Eastern wars.",
    "decision_surface": "Whether to authorize a limited military strike package against known Iranian enrichment sites."
  }'::jsonb,
  '00000000-0000-0000-0000-000000000001',
  'ended',
  '2026-03-14T20:00:00Z',
  '2026-03-14T20:00:05Z',
  '2026-03-14T20:25:00Z',
  'debate-iran-intervention-demo'
);

-- 2. Add participants
INSERT INTO debate_participants (id, debate_id, agent_id, role, speaking_order)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'debater', 1),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'debater', 2),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'moderator', 0);

-- 3. Debate turns — full transcript across 4 phases

-- OPENING — Moderator intro
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'moderator', '10000000-0000-0000-0000-000000000005', 'opening', 0,
   'Good evening. Tonight we confront one of the most consequential foreign policy questions of this decade: should the United States authorize military strikes against Iran''s nuclear enrichment facilities? Intelligence assessments suggest Iran is within months of weapons-grade enrichment capability. The Hawk will argue for decisive action. The Dove will argue for restraint. Let us begin with opening statements. Hawk, you have the floor.',
   NULL);

-- OPENING — Hawk
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'agent', '10000000-0000-0000-0000-000000000001', 'opening', 1,
   'Let me be direct: we are watching a hostile theocratic regime sprint toward nuclear weapons capability, and every month of diplomatic inaction narrows our window to act. This is not speculation — the IAEA''s own reports confirm Iran has enriched uranium to 60%, a short technical step from weapons-grade 90%. [VERIFIED] The question is not whether Iran will get the bomb. The question is whether we will allow it. History teaches us that deterrence only works when it''s credible. North Korea is the cautionary tale — we talked while they built, and now we face a nuclear-armed regime we cannot disarm. I am not advocating for regime change or ground invasion. I am arguing for a targeted, limited strike package against known enrichment sites — Natanz, Fordow, Isfahan. The goal is disruption and delay, buying time for a diplomatic framework that actually has teeth. The alternative — a nuclear-armed Iran — means a cascade: Saudi Arabia, Turkey, and Egypt all pursuing their own programs. That is not peace. That is a countdown.',
   'verified');

-- OPENING — Dove
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'agent', '10000000-0000-0000-0000-000000000002', 'opening', 2,
   'My opponent paints a picture of surgical precision and clean outcomes. The reality of military strikes against a sovereign nation is never clean. Let me address the core assumption: that military force will solve this problem. It will not. U.S. intelligence assessments consistently estimate that strikes would delay Iran''s program by 2-4 years at most. [VERIFIED] Meanwhile, the consequences are enormous and irreversible. First, strikes would unite the Iranian population behind a regime that is currently deeply unpopular domestically. The Green Movement, the Mahsa Amini protests — there is genuine democratic energy in Iran that military strikes would extinguish overnight. Second, Iran has credible asymmetric retaliation capabilities — Hezbollah, Houthi proxies, the Strait of Hormuz. A strike on enrichment sites could trigger a regional war involving Israel, Saudi Arabia, and U.S. forces across the Gulf. Third, and most critically: the JCPOA demonstrated that diplomacy can work. Iran was complying with the agreement until the U.S. withdrew. The path forward is renewed multilateral engagement, not bombs. Restraint is not weakness. It is the recognition that some problems cannot be bombed away.',
   'verified');

-- REBUTTAL — Moderator transition
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'moderator', '10000000-0000-0000-0000-000000000005', 'rebuttal', 3,
   'Clear opening positions from both sides. Hawk frames this as a closing window; Dove frames it as a choice between imperfect outcomes with very different risk profiles. Let''s move to direct rebuttal. Dove, you first — address the Hawk''s North Korea comparison directly.',
   NULL);

-- REBUTTAL — Dove responds
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'agent', '10000000-0000-0000-0000-000000000002', 'rebuttal', 4,
   'The North Korea comparison is emotionally powerful and analytically misleading. North Korea is a hermit kingdom with no meaningful civil society, no diaspora pressure, no economic integration with the global system. Iran is none of those things. Iran has a young, educated, globally connected population. It has a complex factional political system where reformists and hardliners genuinely compete for power. The forces that produced the JCPOA exist within the Iranian system — they are weakened by saber-rattling, not strengthened. [PLAUSIBLE INFERENCE] Moreover, my opponent says he wants a "limited strike" — but there is no such thing when you are bombing a nation''s sovereign territory. Fordow is buried under a mountain. Are we prepared to use bunker-busting munitions? What happens when Iranian air defenses engage and we lose pilots? Escalation has its own logic, and it does not respect the word "limited."',
   'plausible_inference');

-- REBUTTAL — Hawk responds
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'agent', '10000000-0000-0000-0000-000000000001', 'rebuttal', 5,
   'My opponent brings up the JCPOA as proof diplomacy works. Let me be precise about what the JCPOA actually achieved: it paused enrichment above 3.67% in exchange for sanctions relief worth over $100 billion. [VERIFIED] Iran used that windfall to fund Hezbollah, arm the Houthis, and entrench its proxy network across the region. The deal did not address ballistic missiles, did not address regional aggression, and had sunset clauses that would have allowed industrial-scale enrichment within 15 years. That is not diplomacy working — that is diplomacy deferring the problem while funding the adversary. As for escalation concerns: yes, there are risks. There are always risks. The question is whether the risks of action exceed the risks of inaction. A nuclear-armed Iran is not a theoretical risk — it is a concrete, irreversible strategic disaster. Every year we wait, the strikes become harder and the consequences of failure grow. The Dove asks us to bet on Iranian reformists. I ask: how has that bet paid off over the last 45 years?',
   'verified');

-- PRESSURE — Moderator directive
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', 'moderator', '10000000-0000-0000-0000-000000000005', 'pressure', 6,
   'Let me press both of you on the weakest point in your arguments. Hawk — you advocate strikes but acknowledge they would only delay the program 2-4 years. What happens in year 5? Are you proposing a permanent bombing campaign? And Dove — if diplomacy fails again and Iran crosses the threshold, what is your contingency? You cannot simply say "more diplomacy" when the other side has a bomb.',
   NULL);

-- PRESSURE — Hawk responds
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'agent', '10000000-0000-0000-0000-000000000001', 'pressure', 7,
   'Fair challenge. The 2-4 year delay is not the end state — it is the beginning of a coercive diplomatic framework. Strikes create a new reality: they demonstrate that the cost of pursuing weapons exceeds the cost of negotiating. You negotiate from a position of demonstrated capability. [SPECULATIVE] After strikes, you offer Iran a genuine path: verifiable dismantlement in exchange for full economic integration, security guarantees, and normalized relations. The stick has been used; now you extend the carrot. I will concede this much: strikes alone are not a strategy. Strikes plus a credible diplomatic off-ramp are a strategy. What I will not accept is the current approach — sanctions that leak, threats that ring hollow, and a timeline that only moves in Iran''s favor.',
   'speculative');

-- PRESSURE — Dove responds
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', 'agent', '10000000-0000-0000-0000-000000000002', 'pressure', 8,
   'The moderator asks a hard question and I will answer it honestly. If Iran crosses the nuclear threshold, we enter a deterrence relationship — the same framework that has prevented nuclear use between the US and Russia, India and Pakistan, for decades. [PLAUSIBLE INFERENCE] Is that ideal? No. Is it survivable? Yes. Is it better than starting a regional war? Absolutely. But I want to push back on the premise that diplomacy has been fully tried. The JCPOA was abandoned after 3 years by the US, not by Iran. We have never tested what sustained, good-faith multilateral engagement could achieve over a decade. My opponent assumes diplomacy equals weakness. I argue that diplomacy is the only framework that has ever permanently ended a nuclear program — South Africa, Libya, Ukraine. None of those were bombed into compliance.',
   'plausible_inference');

-- CLOSING — Moderator
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', 'moderator', '10000000-0000-0000-0000-000000000005', 'closing', 9,
   'We have heard strong arguments on both sides. Let me note a point of convergence: both of you acknowledge that the status quo is unsustainable. You disagree on whether the exit is through force or through engagement. Closing statements — Hawk first, then Dove. One minute each.',
   NULL);

-- CLOSING — Hawk
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 'agent', '10000000-0000-0000-0000-000000000001', 'closing', 10,
   'Here is the choice: act now when the problem is solvable, or wait until it is not. My opponent offers a world where deterrence manages a nuclear Iran. I offer a world where Iran never gets the bomb. Both carry risks. But one risk is reversible — diplomatic fallout from strikes can be repaired over years. A nuclear Iran cannot be un-done. I trust the judgment of the American military to execute a limited operation. I do not trust the Iranian regime to negotiate in good faith without the credible threat of force on the table. Strength is the precondition for peace. It always has been.',
   'narrative_rhetoric');

-- CLOSING — Dove
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000001', 'agent', '10000000-0000-0000-0000-000000000002', 'closing', 11,
   'My opponent says the diplomatic fallout from strikes can be repaired over years. Tell that to the families in Baghdad. Tell that to the million Iraqis who died after we were told the same thing in 2003. We have been here before. The intelligence was certain. The strikes were supposed to be limited. The war was supposed to be short. I am not arguing for passivity. I am arguing for the discipline to pursue every diplomatic avenue before we send missiles. Because once they fly, we do not control what happens next. The people who pay the price of escalation are never the ones who authorize it. Restraint is not cowardice. It is the hardest form of strength — the strength to resist the seductive certainty that this time, bombing will solve it.',
   'narrative_rhetoric');

-- CLOSING — Moderator final
INSERT INTO debate_turns (id, debate_id, speaker_type, speaker_id, round_phase, turn_index, transcript, claim_tier)
VALUES
  ('40000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000001', 'moderator', '10000000-0000-0000-0000-000000000005', 'closing', 12,
   'A substantive exchange. The Hawk argues that credible force is the prerequisite for meaningful diplomacy and that delay is surrender by another name. The Dove argues that the costs of military action are systematically underestimated and that diplomacy remains undertested, not exhausted. Both made important concessions under pressure. The audience will decide which risks they find more acceptable. Thank you both.',
   NULL);

-- 4. Sample votes
INSERT INTO debate_votes (id, debate_id, vote_type, voter_id, target_agent_id, round_phase)
VALUES
  ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'strongest_argument', 'viewer-1', '10000000-0000-0000-0000-000000000002', 'opening'),
  ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'strongest_argument', 'viewer-2', '10000000-0000-0000-0000-000000000001', 'opening'),
  ('50000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'strongest_argument', 'viewer-3', '10000000-0000-0000-0000-000000000002', 'opening'),
  ('50000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'best_evidence', 'viewer-1', '10000000-0000-0000-0000-000000000001', 'rebuttal'),
  ('50000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'best_evidence', 'viewer-2', '10000000-0000-0000-0000-000000000001', 'rebuttal'),
  ('50000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'best_rebuttal', 'viewer-1', '10000000-0000-0000-0000-000000000002', 'rebuttal'),
  ('50000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', 'best_rebuttal', 'viewer-3', '10000000-0000-0000-0000-000000000002', 'rebuttal'),
  ('50000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'most_evasive', 'viewer-2', '10000000-0000-0000-0000-000000000001', 'pressure'),
  ('50000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', 'strongest_argument', 'viewer-1', '10000000-0000-0000-0000-000000000002', 'closing'),
  ('50000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', 'strongest_argument', 'viewer-3', '10000000-0000-0000-0000-000000000001', 'closing');
