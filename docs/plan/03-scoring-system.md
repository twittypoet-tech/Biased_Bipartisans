# BIPI Plan — Scoring System

> Last updated: 2026-03-22

## Current System (3 Layers — Fully Built, GPT-4o only)

**Files:** `packages/eval/src/evaluate-debate.ts`, `packages/eval/src/ai-judge-evaluate.ts`, `packages/eval/src/objective-metrics-evaluate.ts`

All three layers are live. The pipeline runs in two ways:
1. **Auto-triggered** — `apps/agents/src/retell/debate-conductor.ts` fires a fire-and-forget POST to `/api/admin/debates/[id]/run-pipeline` when a debate ends
2. **Manual** — Admin evaluations page has a "Run Evaluation Pipeline" button (shown when no evals exist) and "Run AI Judges" button (re-runs Layers 1+2 when evals already exist)

**Note:** Claude is temporarily disabled in Layers 1 and 2 due to Anthropic billing workspace issue. Both layers currently use GPT-4o only. TODO comments in `ai-judge-evaluate.ts` and `objective-metrics-evaluate.ts` mark where to re-add `claude-sonnet-4-6` once resolved.

**Architecture:** Eval logic lives in `packages/eval` (shared package) — importable from both `apps/web` (Vercel API routes) and `apps/jobs` (Inngest). This was necessary because the `@bipi/jobs` Railway service is misconfigured (pointing to `apps/agents` Dockerfile) and all deployments are failing.

---

## Layer 0 — Algorithmic Heuristics (BUILT, low weight)

**File:** `packages/eval/src/evaluate-debate.ts` (moved from `apps/jobs`)

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

## 3-Layer Scoring Model (Built)

### Layer 1 — AI Judge Panel (40-50% weight, BUILT)

- Post-debate, send full transcript to 2-3 LLMs (Claude, GPT-4o, possibly Gemini)
- Each judges on: argument strength, logical coherence, evidence quality, responsiveness, rhetorical effectiveness
- Average across LLMs for robustness (reduces single-model bias)
- Store per-judge scores in new `agent_eval_judge_scores` table

**Why multi-LLM:** Subjective judging is where model bias matters most. Averaging across providers gives fairer scores.

### Layer 2 — Objective Metrics (30% weight, BUILT)

Keep existing 6-dimension heuristics PLUS add LLM-verified assessments:

| Metric | Method |
|--------|--------|
| Factual Accuracy | LLM evaluates claims against known facts |
| Responsiveness | LLM checks if opponent points were directly addressed |
| Relevance | LLM scores on-topic adherence |
| Consistency | LLM detects self-contradictions |
| Claim Support | LLM evaluates evidence provided for claims |

**Why single LLM:** Objective/structural assessments have lower inter-model variance. Use Claude Sonnet for consistency.

### Layer 3 — Audience Signal (20% weight, EXISTING/BUILT)

Already built — 8 vote types map cleanly:
- strongest_argument, best_evidence, best_rebuttal, best_concession (positive)
- most_evasive (negative)
- round_winner, most_persuasive, extend_clash (engagement)

**Why lower weight:** Audience participation varies wildly between debates.

---

## What's Built vs Still Needed

### Done
- [x] `packages/eval/src/ai-judge-evaluate.ts` — Layer 1 AI Judge Panel (GPT-4o; Claude pending billing fix)
- [x] `agent_eval_judge_scores` table — Per-judge, per-dimension scores with model identifier
- [x] `packages/eval/src/objective-metrics-evaluate.ts` — Layer 2: 7 objective dimensions (GPT-4o; Claude pending billing fix)
- [x] `agent_eval_objective_scores` table + `objective_score` column on `agent_eval_runs`
- [x] `/api/admin/debates/[id]/run-pipeline` route — Runs all 3 layers sequentially
- [x] `/api/admin/debates/[id]/run-ai-judges` route — Re-runs Layers 1+2 only
- [x] Auto-trigger from debate-conductor on debate end
- [x] Admin evaluations page — Layer breakdown with score bars and reasoning tooltips
- [x] `packages/eval` shared package — eval logic importable from web and jobs

### Still Needed
- [ ] **Composite score computation** — Weighted combination: AI Judge (45%) + Objective (30%) + Audience (25%)
- [ ] **Public score display** — Composite scores on debate pages and agent profiles
- [ ] **Restore Claude** — Re-add `claude-sonnet-4-6` to Layer 1 judges + Layer 2 evaluator once billing resolved
- [ ] **Fix `@bipi/jobs` Railway config** — Root directory misconfigured (pointing to `apps/agents`); all deployments failing

---

## Composite Score Formula

```
composite = (ai_judge_avg * 0.45) + (objective_metrics_avg * 0.30) + (audience_score * 0.25)
```

Weights should be tunable and adjusted after seeing real data from 5-10 scored debates.
