Prompt 1 — Scaffold the monorepo
You are a senior full-stack architect and implementation agent.

Build the initial monorepo scaffold for a product called Bipi, an AI-native live debate platform where AI voice agents join live rooms and debate topics while audience members listen and vote.

Tech stack:
- Next.js latest with App Router and TypeScript
- Tailwind CSS
- Supabase for Postgres, auth, and storage
- LiveKit for realtime rooms
- Node.js worker service for agent runtimes
- Shared TypeScript packages for schemas/types
- pnpm workspace monorepo

Create the repo structure with these apps/packages:

apps/
  web        -> Next.js frontend
  agents     -> Node/TypeScript LiveKit agent worker service
  jobs       -> Node/TypeScript background jobs for scoring/memory/evolution

packages/
  db         -> shared database types, query helpers, Supabase helpers
  shared     -> shared types and utility functions
  agent-core -> schemas and builders for agent worldview, style, phrasebanks, relationship memory, persona packet compilation

Requirements:
- Use clean, production-style folder structure
- Add linting, formatting, and basic scripts
- Add environment variable templates for each app
- Add a root README with setup instructions
- Add placeholder pages and services so the project boots cleanly
- Do not implement business logic yet beyond scaffolding
- Use TypeScript everywhere
- Prefer maintainable abstractions over cleverness

Return:
1. Full file tree
2. All created files
3. Setup instructions
4. Any assumptions


   Prompt 2 — Build the Supabase schema
   Now implement the initial Supabase/Postgres schema and migrations for Bipi.

This app has:
- official AI debate agents
- versioned worldview configs
- style profiles
- phrase banks
- relationship maps
- debate rooms
- debate participants
- debate turns
- audience votes
- post-debate evaluations
- memory canon and memory candidates

Create SQL migrations and matching TypeScript types for these tables:

agents
agent_worldviews
agent_style_profiles
agent_phrasebanks
agent_relationships
agent_memories
agent_memory_candidates
debates
debate_participants
debate_turns
debate_votes
agent_eval_runs

Requirements:
- use UUID primary keys
- include created_at and updated_at where appropriate
- include reasonable indexes
- add foreign keys and constraints
- store structured persona configs in JSONB where helpful
- include seeded sample data for 4 official agents:
  The Hawk
  The Dove
  The Technocrat
  The Populist
- include one moderator agent

Also:
- generate shared TypeScript types
- create a typed data access layer in packages/db
- create helper functions to fetch an agent with all active config needed for runtime assembly

Return:
1. SQL migrations
2. seed data
3. TypeScript DB helpers
4. brief explanation of schema decisions

Prompt 3 — Build the agent config system
Implement the config-driven agent identity system in packages/agent-core.

Important architecture rule:
Agents must not be defined as giant hardcoded prompt strings.
Each runtime agent persona must be assembled from structured config objects loaded from the database.

Create Zod schemas and TypeScript types for:

1. WorldviewConfig
- coreThesis
- issueLenses
- values
- beliefRules
- sourceRules
- concessionRules
- redLines
- archetypeTraits

2. StyleProfile
- tone
- pace
- humorLevel
- certaintyLevel
- interruptionTendency
- abstractionLevel
- warmth
- rhetoricalDevices
- sentenceStyle

3. PhraseBank
- openers
- attacks
- rebuttals
- concessions
- closers
- audienceCallouts
- topicSpecificPhrases

4. RelationshipProfile
- targetAgentId
- respectScore
- distrustScore
- rivalryScore
- attackAngles
- knownWeakPoints
- sharedHistorySummary

5. PersonaPacket
- public identity
- worldview config
- style profile
- phrase hints
- relationship summaries for current room participants
- relevant memories
- room-specific context
- runtime constraints

Create:
- validators
- builders
- sample JSON config objects for the 4 agents + moderator
- a compilePersonaPacket() function that takes database records + room context and returns a clean runtime persona packet

The result should be easy for an agent worker to consume.
Return all files.

Prompt 4 — Build the admin UI for managing agents
Implement an admin interface in apps/web for editing and viewing official agent configs.

Requirements:
- protected admin route group
- list page showing all agents
- detail page per agent
- sections for:
  worldview
  style profile
  phrase bank
  relationships
  memory summary
- forms should read/write to Supabase
- use server actions or route handlers cleanly
- show active config version
- allow creating a new draft version before publishing active config
- show seeded agents:
  The Hawk
  The Dove
  The Technocrat
  The Populist
  Moderator

UI requirements:
- clean, premium, dark modern control-room look
- cards, tabs, code/json editor where useful
- validation errors should be clear
- no placeholder lorem ipsum

Also add:
- agent roster page for non-admin internal viewing
- simple badge indicating official, active, draft

Return complete implementation.

Prompt 5 — Build debate creation and room scheduling
Implement the Bipi debate creation flow in apps/web.

A debate should include:
- title
- topic
- description
- selected official agents
- moderator
- scheduled time
- status (draft, scheduled, live, ended)
- room slug/name
- debate format type

Build:
- admin page to create a debate
- list page for debates
- debate detail page
- backend logic to save debate records in Supabase
- room metadata generation for LiveKit usage
- utility to create deterministic room names/slugs

For v1 only support one format:
- opening statements
- rebuttal round
- crossfire round
- closing statements

Add a public-facing debate page that will later become the live room page.
For now it should display debate metadata and selected participants cleanly.

Return all code and explain the route structure.

Prompt 6 — Integrate LiveKit room creation and audience join flow
Now add LiveKit integration for Bipi's web app.

Requirements:
- create secure LiveKit access token generation on the server
- support two audience roles:
  listener
  admin
- build the public live debate page where listeners can join the room
- show room status, debate topic, current participants, and a placeholder stage UI
- add basic audience vote controls:
  strongest argument
  who won the round
- persist votes to Supabase

Important:
- the web app is not the agent runtime
- this task is only for LiveKit room access, audience presence, and vote UI
- keep the code modular so the agent worker service can join separately

Use environment variables for:
- LIVEKIT_URL
- LIVEKIT_API_KEY
- LIVEKIT_API_SECRET

Return:
1. server-side token generation implementation
2. room join page implementation
3. vote persistence logic
4. any setup instructions

Prompt 7 — Build the agent worker service
Implement the Node/TypeScript agent worker service in apps/agents.

This service should:
- connect to LiveKit as a worker
- receive or poll debate jobs
- load debate metadata from Supabase
- load agent config from Supabase
- compile a PersonaPacket using packages/agent-core
- join the correct LiveKit room as the selected agent
- expose a clean architecture for multi-agent orchestration

For v1:
- support the 4 official agents plus moderator
- support a text-first debate loop abstraction even if voice layer is still basic
- structure the service so voice generation/input providers can be swapped later
- include tool interfaces for:
  live research
  vote state
  debate timer
  transcript persistence

Important architecture rules:
- no giant monolithic prompt files
- create prompt sections from PersonaPacket components
- runtime prompt must be assembled from:
  role
  worldview
  style
  phrase guidance
  relationship context
  room context
  rules
- use clean services/modules:
  loadAgentConfig
  compilePersonaPacket
  createRuntimeInstructions
  joinDebateRoom
  handleTurn
  persistTurn

Also create:
- a debate orchestrator
- a moderator loop
- placeholder adapters for future Perplexity tool use and future TTS/STT integration

Return all code with explanation of runtime flow.

Prompt 8 — Implement transcript and turn persistence
Add full debate turn persistence for the agent worker service.

Every turn should save:
- debate_id
- speaker_type
- speaker_id
- turn_index
- transcript
- optional evidence metadata
- optional claim tags
- created_at

Requirements:
- create reusable DB write helpers
- create a simple transcript timeline view in the web app on the debate detail page
- show turns in order
- group by speaker
- display round markers if present

Also:
- add a helper abstraction so later we can attach live partial transcript events and final transcript commits
- keep the storage model compatible with future voice pipelines

Return all updated files.

Implement the first version of post-debate evaluation in apps/jobs.

After a debate ends, the system should be able to run scoring jobs that evaluate each agent.

For v1 create deterministic and simple evaluators first:
- stance consistency
- verbosity score
- repetition score
- participation balance
- basic audience vote performance

Store results in agent_eval_runs.

Requirements:
- create job entrypoints
- create helper functions to read debate transcripts and vote data
- write scores back to Supabase
- add a small admin UI card on each debate page showing eval summaries

Important:
- do not yet implement full autonomous evolution
- just create the scoring pipeline and storage model
- keep the design extensible for future LLM evaluator passes

Return code plus explanation of how jobs are triggered.
Implement the first version of post-debate evaluation in apps/jobs.

After a debate ends, the system should be able to run scoring jobs that evaluate each agent.

For v1 create deterministic and simple evaluators first:
- stance consistency
- verbosity score
- repetition score
- participation balance
- basic audience vote performance

Store results in agent_eval_runs.

Requirements:
- create job entrypoints
- create helper functions to read debate transcripts and vote data
- write scores back to Supabase
- add a small admin UI card on each debate page showing eval summaries

Important:
- do not yet implement full autonomous evolution
- just create the scoring pipeline and storage model
- keep the design extensible for future LLM evaluator passes

Return code plus explanation of how jobs are triggered.

Prompt 11 — Add Perplexity research tool plumbing
Implement tool plumbing for live research in the agent worker service.

Requirements:
- create a tool adapter abstraction so different live-research providers could be swapped
- implement a Perplexity adapter using environment variables
- create a tool interface usable by runtime agents:
  search(query)
  summarizeTopic(query)
  fetchCounterpoints(query, stance)
- ensure tool outputs are normalized before insertion into prompts
- add source metadata fields so later we can show evidence provenance

Important:
- do not let the tool directly overwrite agent worldview
- treat tool results as room-context evidence only
- keep the implementation modular and clean

Environment variables:
- PERPLEXITY_API_KEY

Return all files and setup instructions.
Prompt 12 — Add voice provider abstraction
Refactor the agent worker service so voice IO is abstracted cleanly.

Requirements:
- create provider interfaces for:
  speech-to-text
  text-to-speech
  voice identity
- create placeholder implementations and configuration points
- ensure each agent can have a distinct voice_id in config
- keep the system prepared for later integration with actual voice providers

Important:
- the debate engine should not depend directly on one TTS/STT vendor
- build adapters/interfaces first
- the runtime must allow different official agents to sound distinct later

Return all files and explain the abstraction boundaries.
Prompt 13 — Add evolution scaffolding, not full automation
Implement scaffolding for future agent evolution without changing official personas automatically yet.

Add these tables and service abstractions if not already present:
- agent_trait_vectors
- agent_argument_library
- agent_argument_performance
- agent_topic_confidence
- agent_relationship_scores
- agent_reflections
- agent_drift_events
- agent_evolution_snapshots

Build:
- data models
- seed defaults for 4 agents
- helper functions to update these values after evaluation jobs
- a simple reflection generator that summarizes what the agent appeared to learn from the debate

Important:
- do not auto-transform public personas yet
- keep this as backend scaffolding for later rollout
- reflections should be reviewable in admin UI

Return code and architecture summary.
Prompt 14 — Polish the public product experience
Polish the public-facing Bipi experience in the web app.

Build:
- home page
- debate schedule page
- debate detail page
- live room page
- simple agent profile pages for the 4 official agents
- premium, modern, media-company aesthetic
- make the app feel like an AI-native opinion network, not a developer tool

UI goals:
- dark, dramatic, polished
- strong typography
- live indicators
- agent cards with worldview summaries
- room countdowns
- audience vote interaction

Do not change backend architecture.
Focus on strong product presentation and maintainable React components.

Return all files.
Prompt 15 — Hardening and deployment
Prepare the Bipi repo for deployment and production-like testing.

Requirements:
- validate environment variable usage
- add startup checks
- add README deployment steps for:
  web app
  agent worker
  jobs service
- add scripts for local dev across all apps
- add basic health endpoints
- add logging utilities
- add error boundaries / error handling where appropriate
- add seed/setup docs

Also produce:
- recommended deployment topology
- which services can go on Vercel
- which services should run on a container host
- required secrets per service
