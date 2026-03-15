# Plan: Live Debate Audio + Past Debate Playback

## Problem
1. **No audio persistence** — TTS audio is synthesized and streamed via LiveKit but never saved. Once the debate ends and the room is deleted, audio is gone forever.
2. **Live debate audio not reaching frontend** — The `DebateRoom` component subscribes to LiveKit audio tracks, but the subscriber token (`canPublish: false`) may not be receiving tracks correctly, and there's no fallback if LiveKit isn't configured.
3. **No debate timer** — Round `duration_seconds` exist in the format but are completely ignored by the orchestrator and not shown in the UI.
4. **Past debates are text-only** — No way to listen back to a completed debate.

## Implementation Steps

### Step 1: DB migration — Add `audio_url` to `debate_turns`
- Create `supabase/migrations/00003_turn_audio_url.sql`
- `ALTER TABLE debate_turns ADD COLUMN audio_url TEXT;`
- Update shared type `DebateTurn` in `packages/shared/src/types/common.ts` to include `audio_url: string | null`

### Step 2: Backend — Save TTS audio to Supabase Storage
- In `apps/agents/src/livekit/debate-room.ts` `publishTurn()`:
  - After TTS synthesis, upload the PCM buffer as a `.wav` file to Supabase Storage bucket `debate-audio`
  - Store path pattern: `{debateId}/{turnIndex}-{speakerSlug}.wav`
  - Return the public URL
- Add helper `apps/agents/src/services/audio-storage.ts`:
  - `uploadTurnAudio(debateId, turnIndex, speakerName, pcmBuffer)` → writes WAV header + PCM data, uploads to Supabase Storage, returns public URL
- Update `persistTurn()` to accept and save `audio_url`
- Update `PersistTurnInput` interface and `insertDebateTurn` call

### Step 3: Frontend — Past debate audio player (`DebatePlayer`)
- New component: `apps/web/src/components/public/debate-player.tsx`
  - Takes all turns (with `audio_url`) for a completed debate
  - Plays turns sequentially via HTML5 `<audio>` element
  - Shows: play/pause, progress bar, total duration, current time
  - On speaker change: transitions the speaker stage UI (highlights active speaker, shows waveform)
  - Skip forward/backward between turns
  - Shows the current turn's transcript highlighted in the transcript below
- New component: `apps/web/src/components/public/playback-speaker-stage.tsx`
  - Reuses the visual podium layout from `SpeakerStage` but driven by playback position instead of LiveKit active speakers

### Step 4: Frontend — Live debate audio fix
- In `debate-room.tsx`, ensure audio tracks are actually being played:
  - The `track.attach()` call returns an HTMLMediaElement — verify it's appended to the DOM (some browsers require it)
  - Add `document.body.appendChild(audioEl)` with `style.display = 'none'` to ensure playback
  - Handle autoplay policy: show a "Click to enable audio" prompt if autoplay is blocked
- Add reconnection logic if LiveKit disconnects

### Step 5: Frontend — Debate timer
- Calculate total estimated duration from `format.round_sequence` summing `duration_seconds`
- For live debates: show elapsed time (since `started_at`) and a progress bar based on estimated total
- For past debates: show total duration (from `started_at` to `ended_at`) on the player
- Timer component: `apps/web/src/components/public/debate-timer.tsx`

### Step 6: Update debate detail page
- **Live debates**: DebateRoom with audio + timer + speaker stage (already built, needs audio fix)
- **Ended debates**: DebatePlayer with audio playback + speaker stage + transcript sync + timer
- **Scheduled debates**: Countdown to start time

### Step 7: Supabase Storage bucket setup
- Add migration or setup script to create `debate-audio` bucket
- Bucket should be public (audio files are not sensitive)

## File Changes Summary
| File | Action |
|------|--------|
| `supabase/migrations/00003_turn_audio_url.sql` | NEW — add audio_url column |
| `packages/shared/src/types/common.ts` | EDIT — add audio_url to DebateTurn |
| `apps/agents/src/services/audio-storage.ts` | NEW — WAV encoding + Supabase upload |
| `apps/agents/src/services/turn-persistence.ts` | EDIT — accept audio_url |
| `apps/agents/src/livekit/debate-room.ts` | EDIT — save audio after TTS |
| `apps/web/src/components/public/debate-player.tsx` | NEW — past debate audio player |
| `apps/web/src/components/public/debate-timer.tsx` | NEW — elapsed/total time display |
| `apps/web/src/components/public/debate-room.tsx` | EDIT — fix audio playback, autoplay |
| `apps/web/src/app/(public)/debates/[slug]/page.tsx` | EDIT — wire up player for ended debates |
| `apps/web/src/app/globals.css` | EDIT — player styling |
