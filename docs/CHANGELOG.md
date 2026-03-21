# BIPI — Changelog

> Internal maintenance log. Tracks all code changes, bug fixes, and updates.

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
