-- Migration 008: Live debate support
--
-- Adds timestamps to debate_turns for playback sync, and a recordings column
-- to debates for storing Retell call recording URLs post-debate.
-- Also enables Supabase realtime on debate_turns so the frontend receives
-- live INSERT events as the transcript poller writes turns during a debate.

-- ── 1. Turn-level timestamps ──────────────────────────────────────────────────
-- started_at / ended_at mark the wall-clock window of each utterance.
-- Derived from Retell's word-level timestamps + the call's creation time.
-- Used by DebatePlayer to seek the recording to the right position.

ALTER TABLE debate_turns
  ADD COLUMN started_at TIMESTAMPTZ,
  ADD COLUMN ended_at   TIMESTAMPTZ;

-- ── 2. Debate-level recording URLs ───────────────────────────────────────────
-- { "<supabase_agent_uuid>": "<retell_recording_url>" }
-- One URL per Retell call. DebatePlayer uses the first available URL.

ALTER TABLE debates
  ADD COLUMN recordings JSONB NOT NULL DEFAULT '{}';

-- ── 3. Enable Supabase Realtime on debate_turns ───────────────────────────────
-- Allows the browser client to subscribe to INSERT events and show turns
-- as they are written by the live transcript poller during a debate.

ALTER PUBLICATION supabase_realtime ADD TABLE debate_turns;
