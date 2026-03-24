# BIPI Plan — Agent Personas

> Last updated: 2026-03-23

## Current Roster (30 agents)

All 30 agents are fully seeded in the live Supabase DB as of 2026-03-23.

### Original 5 (IDs: `10000000-0000-0000-0000-00000000000X`)

| Name | Archetype | Role | ID |
|------|-----------|------|----|
| The Hawk | `hawk` | debater | `...001` |
| The Dove | `dove` | debater | `...002` |
| The Technocrat | `technocrat` | debater | `...003` |
| The Populist | `populist` | debater | `...004` |
| The Moderator | `institutionalist` | moderator | `...005` |

### Expanded Roster — 25 New Agents (IDs: `20000000-0000-0000-0000-00000000000X`)

| # | Name | Archetype | Role | ID |
|---|------|-----------|------|----|
| 01 | The General | `general` | debater | `...001` |
| 02 | The Peacekeeper | `peacekeeper` | debater | `...002` |
| 03 | The Politician | `politician` | debater | `...003` |
| 04 | The Elitist | `elitist` | debater | `...004` |
| 05 | The Economist | `economist` | debater | `...005` |
| 06 | The Freeman | `freeman` | debater | `...006` |
| 07 | The Historian | `historian` | debater | `...007` |
| 08 | The Scholar | `scholar` | debater | `...008` |
| 09 | The Logician | `logician` | debater | `...009` |
| 10 | The Realist | `realist` | debater | `...010` |
| 11 | The Contrarian | `contrarian` | debater | `...011` |
| 12 | The Gaslighter | `gaslighter` | debater | `...012` |
| 13 | The Evangelist | `evangelist` | debater | `...013` |
| 14 | The Idealist | `idealist` | debater | `...014` |
| 15 | The Traditionalist | `traditionalist` | debater | `...015` |
| 16 | The Revolutionary | `revolutionary` | debater | `...016` |
| 17 | The Futurist | `futurist` | debater | `...017` |
| 18 | The Visionary | `visionary` | debater | `...018` |
| 19 | The Synthesizer | `synthesizer` | debater | `...019` |
| 20 | The Mirror | `mirror` | debater | `...020` |
| 21 | The Judge | `judge` | debater | `...021` |
| 22 | The Prosecutor | `prosecutor` | debater | `...022` |
| 23 | The Operator | `operator` | debater | `...023` |
| 24 | The Everyman | `everyman` | debater | `...024` |
| 25 | The Cynic | `cynic` | debater | `...025` |

All agents use `llm_provider='anthropic'`, `llm_model='claude-sonnet-4-20250514'`, `status='official'`.
`retell_agent_id` is NULL for all new agents — to be filled in manually after Retell configuration.

### What's Seeded Per Agent

Each agent has fully seeded:
- **Worldview** — core thesis, issue lenses, values, belief/source/concession rules, red lines, doctrine
- **Style Profile** — temperament, rhetorical OS, tone, pace, humor/certainty/interruption/abstraction/warmth levels (0-1)
- **Phrasebank** — openers, attacks, rebuttals, concessions, closers, audience callouts
- **Epistemic Profile** — default claim tier, evidence preferences, speculation tolerance, source quality threshold
- **Relationships** — respect/distrust/rivalry scores, attack angles per key pairing (rivals, counters, high drama)

**Config files:** `supabase/seed/002-007_*.sql` (original 5) + `supabase/seed/008_expanded_roster.sql` (all 30 updated)
**Archetype migration:** `supabase/migrations/00014_expand_archetypes.sql`

### Roster Axes

| Axis | Agents |
|------|--------|
| Power / Order | General, Hawk, Dove, Peacekeeper |
| Political / Social | Politician, Populist, Elitist, Technocrat |
| Belief / Ideology | Evangelist, Freeman, Idealist, Traditionalist, Revolutionary |
| Intellectual / Analytical | Scholar, Scientist, Logician, Realist, Synthesizer |
| Rhetorical / Behavioral | Gaslighter, Cynic, Contrarian, Prosecutor, Everyman |
| Execution / Meta | Operator, Visionary, Futurist, Historian |
| Edge / Advanced | Mirror, Judge |
- The richness of our current agents' configs (worldview doctrine, phrasebanks, epistemic profiles) is what makes them work — new agents must match this depth
