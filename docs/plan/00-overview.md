# BIPI Master Plan — Overview

> Last updated: 2026-03-20

This is the master reference for the Biased Bipartisans (BIPI) product plan. It cross-references a ChatGPT-generated system overview with the actual codebase state and provides a ranked implementation roadmap.

## Document Index

| File | Contents |
|------|----------|
| [00-overview.md](00-overview.md) | This file — quick reference of what's built vs. planned |
| [01-agent-personas.md](01-agent-personas.md) | Current 5 agents + proposed 8 new domain experts |
| [02-bipi-token.md](02-bipi-token.md) | Bankr.bot integration analysis, prerequisite chain |
| [03-scoring-system.md](03-scoring-system.md) | Current 6-dimension heuristics + 3-layer model proposal |
| [04-evolution-system.md](04-evolution-system.md) | Agent evolution — what's built, what's missing |
| [05-architecture.md](05-architecture.md) | Tech stack diagram, services, packages |
| [06-roadmap.md](06-roadmap.md) | 4-tier ranked feature roadmap (15 items) |
| [07-todo.md](07-todo.md) | Active task tracker (merged from Bipi_plan.md) |

---

## What's Already Built

| Layer | Status | Key Files |
|-------|--------|-----------|
| **5 Agent Personas** (Hawk, Dove, Technocrat, Populist, Moderator) | Fully seeded with worldview, style, phrasebank, epistemic profile, relationships | `supabase/seed/002-007` |
| **Persona Compilation** | Working — Zod-validated PersonaPackets compiled at debate time | `packages/agent-core/src/` |
| **6-Dimension Scoring** | Working — heuristic-based, runs post-debate | `apps/jobs/src/functions/evaluate-debate.ts` |
| **Post-Debate Pipeline** | Working — evaluate -> memories -> reflections -> traits -> convergence | `apps/jobs/src/functions/post-debate-pipeline.ts` |
| **Agent Evolution** | Schema + logic built — trait vectors, drift events, snapshots, memory extraction | `apps/jobs/src/functions/update-traits.ts`, `check-convergence.ts` |
| **Live Debates** | Working — Retell + LiveKit + Deepgram, freeflow + structured | `apps/agents/src/` |
| **Audience Interaction** | Working — Q&A with upvotes, 8 vote types, fact-check oracle | `apps/web/src/app/api/` |
| **Frontend** | Working — debate viewer, playback, transcript, agent cards, admin | `apps/web/src/` |

## What's Not Built Yet

| Feature | Blocked By | See |
|---------|-----------|-----|
| AI Judge Panel | Nothing — ready to build | [03-scoring-system.md](03-scoring-system.md) |
| Objective Metrics (LLM-evaluated) | AI Judge work | [03-scoring-system.md](03-scoring-system.md) |
| Token/Reward System | User identity | [02-bipi-token.md](02-bipi-token.md) |
| User Accounts | Nothing — ready to build | [06-roadmap.md](06-roadmap.md) |
| Domain Expert Personas | Nothing — ready to build | [01-agent-personas.md](01-agent-personas.md) |
