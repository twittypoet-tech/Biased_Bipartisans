# BIPI Plan — Agent Evolution System

> Last updated: 2026-03-20

## Current Implementation (Fully Built)

The post-debate pipeline implements a complete evolution loop:

```
Debate -> Evaluate (6 dims) -> Extract Memories -> Generate Reflections -> Update Traits -> Check Convergence
```

**File:** `apps/jobs/src/functions/post-debate-pipeline.ts`

### Layer-by-Layer Status

| Layer | Implementation | Key Files | Status |
|-------|---------------|-----------|--------|
| **Base Persona** | Worldviews, style profiles, phrasebanks, epistemic profiles | `supabase/seed/003-006`, `packages/agent-core/src/schemas/` | Built |
| **Retrieval** | PersonaPacket compilation loads memories + relationships at debate time | `packages/agent-core/src/builders/compile-persona-packet.ts` | Built |
| **Memory** | Extract memory candidates with significance scores (0-1), categories: argument_success, concession, rivalry_moment, topic_position, audience_highlight | `apps/jobs/src/functions/extract-memories.ts` | Built |
| **Reflection** | Structured reflections: what_went_well, what_went_poorly, rival_lessons, topic_lessons, try_next_time, stop_doing, drift_signal | `apps/jobs/src/functions/generate-reflection.ts` | Built |
| **Gated Updates** | Trait vectors with bounded deltas by update_class (auto=0.05, slow_adaptive=0.02, protected=0). Convergence detection at 0.85 cosine similarity threshold | `apps/jobs/src/functions/update-traits.ts`, `check-convergence.ts` | Built |

### Key Details

**Memory Extraction:**
- Opening position: 0.6 significance
- Strongest rebuttal (by votes): 0.7 + up to 0.2 bonus
- Concession moments: 0.65 significance (detected via pattern matching)
- Pressure round moments: 0.6 significance
- Audience highlights: 0.75 significance
- Evasiveness flags: 0.7 significance
- Up to 20 canon memories loaded into PersonaPacket per debate

**Reflection Generation:**
- Maps eval scores to feedback (e.g., epistemic_discipline < 0.4 -> needs improvement)
- Drift signal flagged when distinctiveness_score < 0.35
- Detects verified vs speculative claim usage for topic lessons

**Convergence Detection:**
- Pairwise cosine similarity of trait vectors
- Threshold: 0.85 (flags agents becoming too similar)
- Shared traits identified (within 0.1 of each other)
- Alerts logged to `agent_drift_events` table

---

## What's Missing

| Gap | Impact | Effort |
|-----|--------|--------|
| **Not enough debates run** to validate evolution is working | Can't tune parameters without data | Run 5-10 debates |
| **No admin UI for trait drift visualization** | Can't inspect evolution over time | 2-3 days frontend |
| **No gated update approval UI** | slow_adaptive/protected trait changes can't be reviewed | 1-2 days |
| **No seasonal snapshots trigger** | Table exists but nothing writes to it | 1 day |

---

## Recommendation

**Don't add complexity.** The foundation is solid and complete. What it needs is:

1. Run 5-10 real debates through the pipeline
2. Inspect trait vectors and reflections after each
3. Tune parameters based on observed behavior
4. Build the evolution dashboard (Priority #8 on roadmap) to make this visible

The system needs reps, not rewrites.
