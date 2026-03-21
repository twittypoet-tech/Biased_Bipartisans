# BIPI Plan — Architecture & Tech Stack

> Last updated: 2026-03-20

## System Architecture

```
+-----------------------------------------------------------+
|                    FRONTEND (Next.js 15)                    |
|  apps/web -- React 19, Tailwind CSS 4                      |
|  +-- Public: Debate viewer, playback, agent cards           |
|  +-- Admin: Debate management, agent config, evaluations    |
|  +-- API Routes: REST endpoints for all operations          |
+------------------+------------------------+-----------------+
                   |                        |
    +--------------v-----------+  +---------v----------------+
    |   AGENTS SERVICE         |  |   JOBS SERVICE           |
    |   apps/agents            |  |   apps/jobs              |
    |   +-- LiveKit Agent      |  |   +-- Inngest worker     |
    |   |   Framework          |  |   +-- evaluate-debate    |
    |   +-- Retell SDK         |  |   +-- extract-memories   |
    |   +-- Debate Conductor   |  |   +-- generate-reflection|
    |   +-- Deepgram STT       |  |   +-- update-traits      |
    |   +-- ElevenLabs TTS     |  |   +-- check-convergence  |
    +--------------+-----------+  +---------+----------------+
                   |                        |
    +--------------v------------------------v-----------------+
    |              SHARED PACKAGES                             |
    |  packages/db -- Supabase client, typed queries           |
    |  packages/agent-core -- PersonaPacket compiler, schemas  |
    |  packages/shared -- types, logger, constants             |
    +-------------------------+--------------------------------+
                              |
    +-------------------------v--------------------------------+
    |              SUPABASE (PostgreSQL + Realtime)             |
    |  10 migrations, RLS policies                              |
    |  +-- agents, agent_worldviews, agent_style_profiles       |
    |  +-- debates, debate_participants, debate_turns            |
    |  +-- debate_votes, audience_messages, fact_checks          |
    |  +-- agent_trait_vectors, agent_reflections                |
    |  +-- agent_argument_library, agent_memories                |
    |  +-- agent_eval_runs, agent_drift_events                  |
    +-----------------------------------------------------------+
```

## External Services

| Service | Purpose | Used By |
|---------|---------|---------|
| **Retell AI** | Voice agent hosting, call management, transcription | `apps/agents` |
| **LiveKit** | WebRTC audio relay to browser | `apps/agents`, `apps/web` |
| **Deepgram** | Speech-to-text | `apps/agents` |
| **ElevenLabs** | Text-to-speech voices | `apps/agents` |
| **Tavily** | Fact-check oracle search | `apps/web` API routes |
| **Inngest** | Job orchestration (post-debate pipeline) | `apps/jobs` |
| **Supabase** | Database, auth (future), realtime subscriptions | All apps |

## Monorepo Structure

```
Biased_Bipartisans/
+-- apps/
|   +-- web/          # Next.js 15 frontend + API routes
|   +-- agents/       # LiveKit + Retell debate engine
|   +-- jobs/         # Inngest post-debate pipeline
+-- packages/
|   +-- db/           # Supabase client, typed queries
|   +-- agent-core/   # PersonaPacket compiler, Zod schemas
|   +-- shared/       # Types, logger, constants
+-- supabase/
|   +-- migrations/   # 10 SQL migrations
|   +-- seed/         # Agent seed data (002-007)
+-- docs/
    +-- plan/         # This plan directory
```

**Package manager:** pnpm workspaces

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 15.1 | Frontend framework |
| React | 19 | UI library |
| Tailwind CSS | 4 | Styling |
| @supabase/supabase-js | latest | Database client |
| retell-sdk | 5.9.0 | Voice agent management |
| @livekit/agents | 1.0.50 | Agent WebRTC framework |
| inngest | 3.27.0 | Job orchestration |
| zod | latest | Schema validation |

## Database Key Tables

**Core:** agents, debates, debate_participants, debate_turns, debate_format_definitions
**Config (versioned, status-gated):** agent_worldviews, agent_style_profiles, agent_phrasebanks, agent_epistemic_profiles, agent_relationships
**Audience:** debate_votes (8 types), audience_messages, debate_fact_checks
**Evolution:** agent_trait_vectors, agent_reflections, agent_memories, agent_argument_library, agent_argument_performance, agent_topic_confidence, agent_drift_events, agent_evolution_snapshots
**Evaluation:** agent_eval_runs

**Key Enums:** agent_archetype, debate_status, round_phase, claim_tier, vote_type, evolution_stage, update_class
