# Biased Bipartisans — Claude Code Instructions

## Project Overview

BIPI (Biased Bipartisans) is a spectator-first AI debate platform. Users watch AI agents debate, interact in real-time, and (eventually) back intelligence using the BIPI token. The stack is: Next.js 15 + Supabase + Retell + LiveKit + Inngest, organized as a pnpm monorepo.

## Plan Documents

The master plan lives in `docs/plan/`. These documents are the single source of truth for what's built, what's planned, and what to build next.

### File Index

| File | Contents |
|------|----------|
| `docs/plan/00-overview.md` | Quick reference — what's built vs. planned |
| `docs/plan/01-agent-personas.md` | Current 5 agents + proposed 8 new domain experts |
| `docs/plan/02-bipi-token.md` | Bankr.bot token integration analysis |
| `docs/plan/03-scoring-system.md` | Scoring: current heuristics + 3-layer model proposal |
| `docs/plan/04-evolution-system.md` | Agent evolution pipeline — status and gaps |
| `docs/plan/05-architecture.md` | Tech stack, architecture diagram, dependencies |
| `docs/plan/06-roadmap.md` | 4-tier ranked implementation roadmap (15 features) |
| `docs/plan/07-todo.md` | Active task tracker (critical/high/medium/low/backlog) |

### How to Manage Plan Documents

1. **Before starting work on a feature:** Read the relevant plan doc(s) to understand context, dependencies, and design decisions.

2. **After completing work:** Update the relevant plan doc(s):
   - In `07-todo.md`: Move completed items to the DONE section. Add new items discovered during work.
   - In `06-roadmap.md`: Mark completed features. Update effort estimates if they proved wrong.
   - In the relevant topic doc (01-05): Update "Current State" sections to reflect what was built. Remove "What Needs Building" items that are done.

3. **When priorities change:** Update `06-roadmap.md` tier assignments and `07-todo.md` priority levels. Add a note about why the priority shifted.

4. **When adding new features not in the plan:** Add them to the appropriate topic doc first (or create a new `docs/plan/0X-topic.md`), then add to `06-roadmap.md` with a tier assignment, then add implementation tasks to `07-todo.md`.

5. **Keep dates current:** Every doc has a "Last updated" line. Update it when you make changes.

6. **Don't delete history:** When something changes, note what changed and why rather than silently overwriting. Move completed items to DONE sections rather than deleting them.

### Key Principles

- `07-todo.md` is the operational tracker — what to do right now
- `06-roadmap.md` is the strategic view — what order to build things in
- `01-05` docs are the design reference — why we're building things a certain way
- `00-overview.md` is the entry point — read this first

## Code Conventions

- **Monorepo:** pnpm workspaces. 3 apps (`web`, `agents`, `jobs`) + 3 packages (`db`, `agent-core`, `shared`)
- **Database:** Supabase PostgreSQL. Migrations in `supabase/migrations/`. Seed data in `supabase/seed/`.
- **Schemas:** Zod for runtime validation (PersonaPackets, eval outputs). TypeScript types in `packages/shared`.
- **Job orchestration:** Inngest for post-debate pipeline steps.
- **Voice pipeline:** Retell SDK for agent calls, LiveKit for browser audio relay, Deepgram for STT, ElevenLabs for TTS.
- **Scoring:** `apps/jobs/src/functions/evaluate-debate.ts` is the current scoring engine. New scoring layers should be added as separate job functions in the same directory.
- **Agent configs:** Versioned and status-gated (draft/active/archived). Always query for `status = 'active'`.
