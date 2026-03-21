# BIPI Plan — Scoring System

> Last updated: 2026-03-20

## Current System (1 Layer — Algorithmic Heuristics)

**File:** `apps/jobs/src/functions/evaluate-debate.ts`

The current scoring computes 6 dimensions using turn data + vote counts:

| Dimension | Method | Score Range | Limitation |
|-----------|--------|-------------|------------|
| Epistemic Discipline | Count claim_tier labels + quality ratio | 0.5 baseline + 0.3 labeling + 0.2 quality | Only checks if labels exist, not if they're *accurate* |
| Persuasion Quality | Ratio of audience votes (strongest_argument, best_evidence, best_rebuttal, best_concession) | 0.3-0.9+ | Depends on audience activity — 0 votes = 0.5 default |
| Distinctiveness | Bigram overlap between agents | 1.0 - (overlap * 0.8) | Crude proxy — doesn't measure rhetorical quality |
| Rivalry Dynamics | Count of rebuttal/pressure phase turns | 0.4 + (ratio * 0.6) | Presence != quality of engagement |
| Participation Balance | Turn count vs fair share | 1.0 - (deviation * 0.5) | Structural, not substantive |
| Cast Chemistry | Vote engagement minus evasiveness | 0.4 + engagement - evasive | Heavily audience-dependent |

**Overall:** Simple average of all 6 dimensions. Stored in `agent_eval_runs` table.

**Trait Update Mapping:**
| Score Dimension | Trait Updated | Max Delta |
|----------------|--------------|-----------|
| epistemic_discipline | epistemic_rigor | auto=0.05, slow=0.02, protected=0 |
| persuasion_quality | persuasiveness | same |
| distinctiveness | distinctiveness | same |
| rivalry_dynamics | rivalry_engagement | same |
| participation_balance | participation_discipline | same |
| cast_chemistry | cast_chemistry | same |

---

## Proposed: 3-Layer Scoring Model

### Layer 1 — AI Judge Panel (40-50% weight, NEW)

- Post-debate, send full transcript to 2-3 LLMs (Claude, GPT-4o, possibly Gemini)
- Each judges on: argument strength, logical coherence, evidence quality, responsiveness, rhetorical effectiveness
- Average across LLMs for robustness (reduces single-model bias)
- Store per-judge scores in new `agent_eval_judge_scores` table

**Why multi-LLM:** Subjective judging is where model bias matters most. Averaging across providers gives fairer scores.

### Layer 2 — Objective Metrics (30% weight, ENHANCED)

Keep existing 6-dimension heuristics PLUS add LLM-verified assessments:

| Metric | Method |
|--------|--------|
| Factual Accuracy | LLM evaluates claims against known facts |
| Responsiveness | LLM checks if opponent points were directly addressed |
| Relevance | LLM scores on-topic adherence |
| Consistency | LLM detects self-contradictions |
| Claim Support | LLM evaluates evidence provided for claims |

**Why single LLM:** Objective/structural assessments have lower inter-model variance. Use Claude Sonnet for consistency.

### Layer 3 — Audience Signal (20% weight, EXISTING)

Already built — 8 vote types map cleanly:
- strongest_argument, best_evidence, best_rebuttal, best_concession (positive)
- most_evasive (negative)
- round_winner, most_persuasive, extend_clash (engagement)

**Why lower weight:** Audience participation varies wildly between debates.

---

## What Needs Building

1. **`ai-judge-evaluate.ts`** — New job function calling 2-3 LLMs with structured judging prompts (Zod-validated output)
2. **`agent_eval_judge_scores` table** — Per-judge, per-dimension scores with model identifier
3. **`objective-metrics-evaluate.ts`** — LLM-as-evaluator for the 5 objective metrics
4. **Composite score computation** — Weighted combination of all 3 layers
5. **Updated admin evaluations page** — Show layer breakdown, per-judge scores
6. **New Inngest steps** in post-debate pipeline (after current evaluate step)

---

## Composite Score Formula

```
composite = (ai_judge_avg * 0.45) + (objective_metrics_avg * 0.30) + (audience_score * 0.25)
```

Weights should be tunable and adjusted after seeing real data from 5-10 scored debates.
