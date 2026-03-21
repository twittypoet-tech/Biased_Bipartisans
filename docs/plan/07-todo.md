# BIPI — Active Task Tracker

> Last updated: 2026-03-20
> Priority spectrum: **CRITICAL > HIGH > MEDIUM > LOW > BACKLOG**

---

## CRITICAL
> Broken in production right now. Drop everything.

*Nothing critical at the moment.*

---

## HIGH
> Must ship before the next real debate, or will cause user-facing failures.

- [ ] **End-to-end test the transcript + recording pipeline** — Run a full freeflow debate and verify: (a) turns appear interleaved/chronological, (b) audio seek works in debate room, (c) recording URL saved is the moderator's (full mixed audio), (d) debate transitions to playback after natural hang-up end. // (a)(b) confirmed. **(c) confirmed** — moderator recording selected by agent ID. **(d) confirmed** — debate transitions to playback after natural hang-up. Remaining: live transcript still not appearing in browser during live debates (all 3 delivery mechanisms failing silently — added error logging to diagnose).

- [x] **Verify live -> playback transition on natural agent hang-up** — `onAllCallsDead` fires, `collectTranscripts` runs, page refreshes to past-debate player. Confirmed working. Note: requires manual page refresh (no auto-transition — page status is server-rendered).

---

## MEDIUM
> Quality/reliability improvements. Should ship in the next sprint.

- [ ] **Audio overlap in playback recordings** — Agents briefly speak over each other in the recording, but not during live audio. Likely a Retell recording mux timing issue (one agent's audio tail overlapping the next agent's start). Investigate Retell recording settings.

- [ ] **Agents saying "silence" after points** — Agents occasionally say the word "silence" after finishing a point. Likely a prompt issue — the system prompt or Retell config may include an instruction that the agent is interpreting literally.

- [ ] **Agents talking over the moderator** — Agents sometimes speak while the moderator is still talking. May need longer pause detection or explicit turn-taking signals in the agent prompts.

- [ ] **Speech chopping at beginning of agent turns** — The first few words of an agent's speech get cut off in some scenarios, especially during closing arguments. May be a Retell call setup latency or audio relay timing issue.

- [ ] **Disable or fix Classic Duel (structured) format** — Selecting "Classic Duel" routes to `runStructuredDebate()` which crashes with `[object Object]` after ~8s. The structured path uses LiveConversation + Orchestrator (not Retell) and is broken. Either disable it in the admin UI or fix the code path. Root cause: debate `fc219258` failed because it was scheduled as `style: structured`.

- [ ] **Retell `call_ended` webhook** — Currently relying on LiveKit `Disconnected` events to detect agent hang-ups. Adding a `POST /api/retell/webhook` route that handles `call_ended` events provides a safety net for edge cases. Register in Retell dashboard -> route looks up debate by `call_id` in `retell_call_ids` JSONB. // Low practical risk: agents are configured to auto end_call after 35s silence or after final statement delivery. Orphaned calls in Retell's backend are the main concern, not stuck LiveKit sessions.

---

## LOW
> Known gaps with low failure risk. Ship when there's bandwidth.

- [ ] **Click-test audio seek across all turn positions** — Fixed in code but needs manual validation: open a past debate, click turns at opening / mid-debate / closing positions, confirm audio seeks to correct position (not EOF, not beginning).

- [ ] **Admin debate detail: show Retell IDs + recording status** — `retell_agent_id` and recording URLs are invisible in the admin UI. Debugging requires direct Supabase access. A small info card on the debate detail page would save time.

- [ ] **Live debate: show live transcript + highlight current speaker** — Polling fallback, Supabase Realtime, and LiveKit data messages all fail silently during live debates. Added console.error logging to all 3 paths to diagnose which mechanism is broken. Most likely cause: browser Supabase client failing (missing anon key at build time?) or Realtime subscription not connecting. **Needs browser console check during next live test.**

---

## BACKLOG
> Future features with no immediate timeline.

### User-Created Agents & Debates
Full spec: create a UI/UX flow letting users build their own debate agents (backed by real Retell LLMs) and schedule debates with them.

**Phased implementation:**
- **Phase 1 — Foundation**: DB migration (`retell_llm_id`, `system_prompt`, `created_by`, `voice_id_retell` columns; `user_created` enum value), `POST /api/user/agents`, `GET /api/user/voices`, basic creation form
- **Phase 2 — Debate Wizard**: 5-step `/create-debate` flow (Topic -> Agents -> Moderator -> Schedule -> Confirm), `POST /api/user/debates`
- **Phase 3 — AI Assist**: Claude API for topic framing generation + agent prompt enhancement
- **Phase 4 — User Library**: `/my-agents`, `/my-debates`, agent editing, sharing/public toggle

**Key technical notes:**
- `retell.llm.create()` -> `retell.agent.create()` -> DB insert; compensating delete if DB fails
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
> Recently completed. Trim periodically.

- [x] Confirm moderator recording selection (agent ID-based)
- [x] Confirm live → playback transition on natural hang-up (manual refresh)
- [x] Fix recording URL: always use moderator's recording
- [x] Fix live transcript + speaker highlighting
- [x] Repair broken past debates (re-ran collectTranscripts)
- [x] Fix collectTranscripts guard
- [x] Fix live-transcript-poller `started_at` encoding
- [x] Fix collectTranscripts: always replace + sort + merge
- [x] Fix audio-relay: immediate turn advance on speaker disconnect
- [x] Fix scheduler: orphan cleanup on startup
- [x] DebateCard redesign
- [x] `listDebateParticipants()` bulk fetch
