# BIPI — Changelog

> Internal maintenance log. Tracks all code changes, bug fixes, and updates.

---

## 2026-03-22

### feat: Layer 1 AI Judge Panel + Layer 2 Objective Metrics + auto-trigger pipeline

#### `packages/eval` — New shared eval package
- Created `@bipi/eval` workspace package housing all evaluation logic, importable from both `apps/web` and `apps/jobs`
- Moved Layer 0 heuristic scorer (`evaluate-debate.ts`) from `apps/jobs` into the package

#### Layer 1 — AI Judge Panel (`packages/eval/src/ai-judge-evaluate.ts`)
- Multi-LLM judging: intended Claude Sonnet + GPT-4o; currently GPT-4o only (Claude disabled — Anthropic billing workspace issue; TODO comments mark where to restore)
- 5 dimensions per judge: argument strength, logical coherence, evidence quality, responsiveness, rhetorical effectiveness
- Zod-validated JSON output with per-dimension reasoning strings
- Scores stored in `agent_eval_judge_scores` table (migration `00011_add_ai_judge_scores.sql`)

#### Layer 2 — Objective Metrics (`packages/eval/src/objective-metrics-evaluate.ts`)
- 7 dimensions: epistemic discipline, distinctiveness, factual accuracy, direct rebuttal, relevance, consistency, claim support
- Single LLM (GPT-4o; Claude intended once billing resolved)
- Distinctiveness passes full transcript + other debater names for cross-agent comparison
- Scores stored in `agent_eval_objective_scores` table; `objective_score` column added to `agent_eval_runs` (migration `00012_add_layer2_objective_scores.sql`)

#### Pipeline route — `apps/web/src/app/api/admin/debates/[id]/run-pipeline/route.ts`
- Runs all 3 layers sequentially (Layer 0 → 1 → 2)
- Authenticated via `x-internal-key` header; returns 400 if debate not `ended`

#### Auto-trigger on debate end
- `debate-conductor.ts` fires a fire-and-forget POST to `WEB_SERVICE_URL/api/admin/debates/[id]/run-pipeline` when a debate ends
- `WEB_SERVICE_URL` and `INTERNAL_API_KEY` set as Railway env vars on agents service

#### Admin UI (`/admin/evaluations`)
- Layer 2 section: 7 score bars with reasoning tooltips
- `objective_score` in agent header alongside heuristic + AI judge scores
- "Run Evaluation Pipeline" button when no evals exist (`RunPipelineButton` component)
- "Run AI Judges" re-runs Layers 1+2 on demand

#### Supporting changes
- `packages/shared/src/types/common.ts` — `AgentEvalObjectiveScore` type; `objective_score` on `AgentEvalRun`
- `packages/db/src/queries/evolution.ts` — `insertObjectiveScore`, `getObjectiveScoresForEvalRun`, `updateEvalRunObjectiveScore`
- `apps/web/src/app/api/admin/debates/[id]/run-ai-judges/route.ts` — rewritten to call `@bipi/eval` directly (was calling broken jobs service URL)
- `apps/jobs/package.json` — added `@bipi/eval`, removed direct eval deps now in shared package

#### Known issues
- Claude disabled in Layers 1+2 pending Anthropic billing workspace resolution
- `@bipi/jobs` Railway service misconfigured (root dir points to `apps/agents` Dockerfile); all deployments failing

---

## 2026-03-21

### fix: silence moderator LLM during non-moderator turns
- **File:** `apps/agents/src/retell/debate-conductor.ts`
- **Problem:** Moderator's Retell LLM generates speech during debater turns because it hears the full debate audio via AudioRelay broadcast. While AudioRelay correctly drops these frames during live streaming, the moderator's Retell call *recording* captures everything. Since playback uses the moderator's recording, the audience hears moderator talk-over in replays.
- **Fix:** Conductor now injects `current_phase: "LISTENING"` into the moderator on every non-moderator turn (previously only injected the phase label on moderator turns). Moderator's Retell system prompt updated to stay silent when `current_phase` is `LISTENING`.
- **Affects:** Playback recording quality, live debate (moderator no longer generates suppressed audio).

### fix: buffer next-speaker frames to prevent speech chopping
- **File:** `apps/agents/src/retell/audio-relay.ts`
- **Problem:** The early-advance check requires 1000ms of silence (`MIN_SILENCE_BEFORE_HANDOFF_MS`) before watching for the next speaker. If the next speaker's LLM starts generating audio before the 1s gate (common at closing argument transitions where the moderator gives an explicit instruction), those early frames are silently dropped — first words/sentences cut off.
- **Fix:** Added `nextSpeakerBuffer` — when the expected next speaker produces audio frames while the current speaker is silent but < 1000ms, frames are buffered (up to 50 = 1s). When the silence gate opens and early advance triggers, the buffer is flushed to the public room before the triggering frame.
- **Affects:** All turn transitions, especially moderator→debater closing argument handoffs.

### fix: send speaker_change data messages for live speaker highlighting
- **File:** `apps/agents/src/retell/debate-conductor.ts`, `apps/web/src/components/public/debate-room.tsx`
- **Problem:** No speaker highlighting during live debates — browsers had no way to know who was currently speaking.
- **Fix:** Conductor sends `speaker_change` LiveKit data message at each turn start. DebateRoom handles it to update `activeSpeakerId`.

### fix: add diagnostic logging to transcript delivery paths
- **Files:** `apps/web/src/components/public/debate-room.tsx`, `apps/agents/src/retell/live-transcript-poller.ts`, `apps/web/src/lib/supabase/client.ts`
- **Problem:** Live transcript not appearing — all 3 delivery mechanisms (LiveKit data, Supabase Realtime, polling) failing silently with no diagnostics.
- **Fix:** Added error logging to polling query, Realtime subscription error callback, LiveKit data message handler, and Supabase client env var check.
- **Root cause found:** Retell `transcript_object` is only populated after call ends — LiveTranscriptPoller was always a no-op during live calls. Live transcript backlogged (needs Deepgram streaming STT or Retell WebSocket API).

### docs: update 07-todo.md with root cause analysis
- **File:** `docs/plan/07-todo.md`
- **Changes:** Updated audio overlap and speech chopping items with identified root causes, deployed fixes, and remaining actions. Backlogged live transcript with implementation options.

---

## 2026-03-20

### fix: use moderator recording for playback + live transcript polling fallback
- **Commit:** `d03978e`
- **Fix:** Select moderator's recording (full mixed audio) for debate playback by matching against agent ID. Added polling fallback for live transcript delivery.

### fix: advance turn immediately on speaker disconnect + orphan cleanup on startup
- **Commit:** `95ab3c9`
- **Fix:** When a Retell call disconnects mid-turn, advance the turn immediately instead of waiting for the 8s silence timeout. Added orphan call cleanup on scheduler startup.

### fix: always replace live-poller turns with sorted+merged Retell transcripts
- **Commit:** `568ce17`
- **Fix:** `collectTranscripts` now always replaces any turns written by the live poller with the final sorted and merged Retell transcripts, ensuring chronological order.

### fix: correct turn timestamps + recording retry + smarter fallback guard
- **Commit:** `7c269d8`
- **Fix:** Fixed turn timestamp encoding (recording-relative offsets using Unix epoch carrier). Added recording URL retry. Improved fallback guard in collectTranscripts.

### fix: load speakers from debate_participants + fix upcoming card icon
- **Commit:** `a2d26c9`
- **Fix:** DebateCard now loads speaker names from `debate_participants` join instead of hardcoded values. Fixed upcoming debate card icon.

---

## Earlier

### docs: add BIPI master plan and CLAUDE.md project instructions
- **Commit:** `8f3cd8e`
- **Added:** `docs/plan/00-overview.md` through `docs/plan/07-todo.md` — comprehensive project plan covering agent personas, token integration, scoring system, evolution pipeline, architecture, roadmap, and active task tracker. Added `CLAUDE.md` with project instructions.
