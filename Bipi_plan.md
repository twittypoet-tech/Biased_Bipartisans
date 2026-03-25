# Bipi — Project Tracker

Priority spectrum: **CRITICAL → HIGH → MEDIUM → LOW → BACKLOG**
Update this file as work is completed or priorities shift.

---

## CRITICAL
> Broken in production right now. Drop everything.

*Nothing critical at the moment.*

---

## HIGH
> Must ship before the next real debate, or will cause user-facing failures.

- [ ] **End-to-end test the transcript + recording pipeline** — Run a full freeflow debate and verify: (a) ✅ turns appear interleaved/chronological, (b) ✅ audio seek works in debate room, (c) recording URL saved is the moderator's (full mixed audio), (d) debate transitions to playback after natural hang-up end. // (a)(b) confirmed. (c) fix shipped — now selects moderator recording by agent ID. Needs validation in next live debate. (d) see below.

- [ ] **Verify live → playback transition on natural agent hang-up** — Core user flow for when agents call `end_call` after closing statements. Confirm `onAllCallsDead` fires, `collectTranscripts` runs, debate room switches from live view to past-debate player. // `onAllCallsDead` and `collectTranscripts` confirmed working. Live → playback page switch requires manual refresh (no auto-transition yet — page status is server-rendered).

---

## MEDIUM
> Quality/reliability improvements. Should ship in the next sprint.

- [ ] **Retell `call_ended` webhook** — Currently relying on LiveKit `Disconnected` events to detect agent hang-ups. Adding a `POST /api/retell/webhook` route that handles `call_ended` events provides a safety net for edge cases. Register in Retell dashboard → route looks up debate by `call_id` in `retell_call_ids` JSONB. // Low practical risk: agents are configured to auto end_call after 35s silence or after final statement delivery. Orphaned calls in Retell's backend are the main concern, not stuck LiveKit sessions.

---

## LOW
> Known gaps with low failure risk. Ship when there's bandwidth.

- [ ] **Click-test audio seek across all turn positions** — Fixed in code but needs manual validation: open a past debate, click turns at opening / mid-debate / closing positions, confirm audio seeks to correct position (not EOF, not beginning).

- [ ] **Admin debate detail: show Retell IDs + recording status** — `retell_agent_id` and recording URLs are invisible in the admin UI. Debugging requires direct Supabase access. A small info card on the debate detail page would save time.

- [x] **DebatePlayer: highlight currently-speaking agent in transcript (past debates)** — Confirmed working: transcript row highlights and turn list tracks active turn during playback of ended debates.

- [ ] **Live debate: show live transcript + highlight current speaker** — During a live debate the transcript area showed "Waiting for the debate to begin..." the entire time (Supabase Realtime and LiveKit data messages were not reliably delivering turns to the browser). Fixed by adding a 3s polling fallback in `DebateRoom` that queries `debate_turns` directly and merges new rows into state. Active speaker is derived from the latest turn when LiveKit `ActiveSpeakersChanged` is silent. Also fixed a dedup bug where `handleDataMessage` was generating synthetic IDs instead of using the real DB turn ID. Needs validation in next live debate.

---

## BACKLOG
> Future features with no immediate timeline.

### User-Created Agents & Debates
Full spec: create a UI/UX flow letting users build their own debate agents (backed by real Retell LLMs) and schedule debates with them.

**Phased implementation:**
- **Phase 1 — Foundation**: DB migration (`retell_llm_id`, `system_prompt`, `created_by`, `voice_id_retell` columns; `user_created` enum value), `POST /api/user/agents`, `GET /api/user/voices`, basic creation form
- **Phase 2 — Debate Wizard**: 5-step `/create-debate` flow (Topic → Agents → Moderator → Schedule → Confirm), `POST /api/user/debates`
- **Phase 3 — AI Assist**: Claude API for topic framing generation + agent prompt enhancement
- **Phase 4 — User Library**: `/my-agents`, `/my-debates`, agent editing, sharing/public toggle

**Key technical notes:**
- `retell.llm.create()` → `retell.agent.create()` → DB insert; compensating delete if DB fails
- `RETELL_API_KEY` server-side only; never in client bundle
- Rate limit: 5 agent creations/day per user
- Official moderator used by default (no user-created moderators in Phase 1)

### Retell MCP Integration in Agent Prompts
Give debate agents access to live tools (fact lookup, news, live data) via Retell's native `mcps` field in `llm.create()`. Requires hosting an MCP server with relevant tools.

### Auto-Generate Agent Intro Audio
Currently `intro_audio_url` is manually set. Auto-generate a short intro clip when an agent is created using Retell's recording infrastructure or ElevenLabs TTS.

### Public Debate Calendar
Let non-admin users see upcoming scheduled debates, set reminders, and receive notifications when a debate goes live.

### Audience Q&A Improvements
Currently audience questions are injected into the moderator every 90s if OPENAI_API_KEY is set. Improvements: better question ranking (upvote UX), confirmation UI for injected questions, queue management.

---

## DONE
> Recently completed. Trim this section periodically.

- [x] **Fix recording URL: always use moderator's recording** — Home page and debate room page were using `Object.values(recordings)[0]` (first agent to disconnect = a debater). Now select `recordings[moderator.id]` so playback uses the moderator's Retell call, which captures the full mixed audio of the entire debate.
- [x] **Fix live transcript + speaker highlighting** — `DebateRoom` was showing "Waiting for the debate to begin..." throughout live debates because Supabase Realtime and LiveKit data messages weren't reliably reaching the browser. Added a 3s polling fallback that queries `debate_turns` directly and merges new rows. Also fixed `handleDataMessage` to use the real DB turn ID (preventing duplicate turns if both channels are active).
- [x] **Repair broken past debates** — Re-ran `collectTranscripts` for the Minimum Wage debate (2-turn bug) and Greenland debate (no recording, wrong order).
- [x] **Fix collectTranscripts guard** — Was bailing out if any turns existed; caused Minimum Wage debate to permanently have only 2 turns
- [x] **Fix live-transcript-poller `started_at` encoding** — Was storing wall-clock timestamps instead of recording-relative epoch offsets; broke DebatePlayer audio seek (jumped to EOF)
- [x] **Fix collectTranscripts: always replace + sort + merge** — Now unconditionally replaces live-poller turns with sorted (cross-agent chronological) and merged (consecutive same-speaker) turns from Retell's final transcript
- [x] **Fix audio-relay: immediate turn advance on speaker disconnect** — Was waiting 8s (silence timeout) after a debater hung up; now advances turn immediately when `currentTurnAgentId`'s room disconnects
- [x] **Fix scheduler: orphan cleanup on startup** — Service restart mid-debate left debates stuck in `status = 'live'` forever; now scans and marks them ended on boot
- [x] **DebateCard redesign** — Expandable headline, archetype-colored speaker avatars, LIVE/UPCOMING badges, listener count, CTA buttons
- [x] **`listDebateParticipants()`** — Bulk participant fetch for homepage + debates page; fixes missing speaker avatars on scheduled debates
