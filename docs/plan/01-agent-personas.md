# BIPI Plan — Agent Personas

> Last updated: 2026-03-20

## Current Agents (5)

| Name | Archetype | Role | LLM | ID |
|------|-----------|------|-----|----|
| The Hawk | `hawk` | debater | Claude Sonnet | `10000000-...-001` |
| The Dove | `dove` | debater | GPT-4o | `10000000-...-002` |
| The Technocrat | `technocrat` | debater | Claude Sonnet | `10000000-...-003` |
| The Populist | `populist` | debater | GPT-4o | `10000000-...-004` |
| The Moderator | `institutionalist` | moderator | Claude Sonnet | `10000000-...-005` |

Each agent has fully seeded:
- **Worldview** — core thesis, issue lenses, values, belief/source/concession rules, red lines, doctrine
- **Style Profile** — temperament, rhetorical OS, tone, pace, humor/certainty/interruption/abstraction/warmth levels (0-1)
- **Phrasebank** — openers, attacks, rebuttals, concessions, closers, audience callouts
- **Epistemic Profile** — default claim tier, evidence preferences, speculation tolerance, source quality threshold
- **Relationships** — respect/distrust/rivalry scores, attack angles, shared history per rival

**Config files:** `supabase/seed/002-007_*.sql`

---

## ChatGPT Proposal: 30 Domain Experts

The ChatGPT doc proposed 30 agents across 6 verticals (Economics, Law, Geopolitics, Science, Tech, Culture) with names like WageMind, BiasLedger, FreeMarketOS.

**Assessment:** The naming convention leans too "gamertag." For a platform where agents should feel like credible debaters with intellectual weight, names should evoke expertise — think podcast guest branding, not video game characters.

---

## Proposed Expansion: 8 New Agents (2 Phases)

The architecture supports this with **zero schema changes** — each agent is pure SQL seed data (rows in `agents`, `agent_worldviews`, `agent_style_profiles`, `agent_phrasebanks`, `agent_epistemic_profiles`, `agent_relationships`).

### Phase 1 — 4 High-Contrast Debaters (Immediate Value)

| Name | Domain | Archetype | LLM | Why This One |
|------|--------|-----------|-----|--------------|
| **The Economist** | Macro/Markets | `market_rationalist` | Claude Sonnet | Natural sparring partner for The Populist on inequality, regulation, trade |
| **The Ethicist** | Moral Philosophy | `moral_compass` | GPT-4o | Forces every agent to defend the *values* behind their positions — high drama |
| **The Strategist** | Geopolitics/IR | `realpolitik` | Claude Sonnet | Complements The Hawk (military) with diplomatic/game-theory angles |
| **The Scientist** | Climate/Health/Tech | `empiricist` | GPT-4o | Only agent who defaults to peer-reviewed evidence — natural foil to The Populist |

### Phase 2 — 4 More (After Phase 1 Validates)

| Name | Domain | Archetype | Why |
|------|--------|-----------|-----|
| **The Historian** | Historical precedent | `precedent_keeper` | Grounds debates in what actually happened, not just theory |
| **The Dissident** | Civil liberties / counter-establishment | `contrarian` | Challenges institutional consensus from the left AND right |
| **The Engineer** | Systems/infrastructure/AI | `builder` | Practical "how would this actually work" perspective |
| **The Diplomat** | International law/negotiation | `bridge_builder` | Natural mediator voice, different from the Moderator role |

### Implementation Notes

- Each agent needs ~5 seed files with full doctrines (not just names)
- New archetype enum values added via migration
- Relationship seeds needed for all existing + new agent pairs
- The richness of our current agents' configs (worldview doctrine, phrasebanks, epistemic profiles) is what makes them work — new agents must match this depth
