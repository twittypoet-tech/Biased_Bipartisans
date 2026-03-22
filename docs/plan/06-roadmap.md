# BIPI Plan — Implementation Roadmap

> Last updated: 2026-03-22 (updated: #1 and #2 marked complete)

Ranked by implementability at the current stage. Each tier builds on the previous.

---

## Tier 1 — Ready to Build (infra exists, just needs code)

| # | Feature | Effort | Dependencies | Details |
|---|---------|--------|--------------|---------|
| **1** | ~~**AI Judge Panel** — LLM-based evaluation in post-debate pipeline~~ **DONE** | 2-3 days | New job function + DB table | [03-scoring-system.md](03-scoring-system.md) |
| **2** | ~~**Enhanced Objective Metrics** — LLM-verified claim accuracy, responsiveness, relevance~~ **DONE** | 2 days | Builds on #1 | [03-scoring-system.md](03-scoring-system.md) |
| **3** | ~~**Composite Scoring** — Weight AI Judges (45%) + Objective (30%) + Audience (25%)~~ **DONE** | 1 day | After #1 and #2 | [03-scoring-system.md](03-scoring-system.md) |
| **4** | ~~**Public Score Display** — Composite scores on debate pages, agent profiles~~ **DONE** | 1-2 days | After #3 | Frontend work |
| **5** | **New Agent Personas (Phase 1)** — The Economist, Ethicist, Strategist, Scientist | 2-3 days | SQL seeds + enum values | [01-agent-personas.md](01-agent-personas.md) |

---

## Tier 2 — Near-Term (needs some new infrastructure)

| # | Feature | Effort | Dependencies | Details |
|---|---------|--------|--------------|---------|
| **6** | **User Accounts** — Supabase Auth, persistent identity, vote history | 3-4 days | Supabase Auth setup | Prerequisite for token |
| **7** | **Prediction System (soft)** — Predict winners, earn points, leaderboard | 3-4 days | After #6 | [02-bipi-token.md](02-bipi-token.md) V0 |
| **8** | **Evolution Dashboard** — Trait drift viz, memory accumulation, reflection history | 2-3 days | Frontend | [04-evolution-system.md](04-evolution-system.md) |
| **9** | **New Agent Personas (Phase 2)** — Historian, Dissident, Engineer, Diplomat | 2-3 days | After Phase 1 validates | [01-agent-personas.md](01-agent-personas.md) |

---

## Tier 3 — Medium-Term (new system integration)

| # | Feature | Effort | Dependencies | Details |
|---|---------|--------|--------------|---------|
| **10** | **BIPI Token Deployment** — Fair-launch via Bankr.bot on Base | 2-3 days | Bankr account + config | [02-bipi-token.md](02-bipi-token.md) |
| **11** | **Wallet Connect** — Users connect wallets, view BIPI balance | 3-4 days | After #6 and #10 | Onchainkit components |
| **12** | **Token Backing Mechanic** — Lock BIPI behind agents, resolve with scoring oracle | 1-2 weeks | After #3, #10, #11 | [02-bipi-token.md](02-bipi-token.md) V1 |

---

## Tier 4 — Long-Term (high iterative value but complex)

| # | Feature | Effort | Why Long-Term |
|---|---------|--------|---------------|
| **13** | **Agent Evolution Tuning** — Validate drift, tune parameters | Ongoing | Needs data from real debates |
| **14** | **User-Created Agents** — Full spec in backlog | Multi-week | Already planned in [07-todo.md](07-todo.md) |
| **15** | **Cross-Debate Agent Memory** — Agents reference past debates in new ones | 2-3 days | Needs confidence in memory quality |

---

## Dependency Graph

```
#1 AI Judge Panel
 +-> #2 Objective Metrics
      +-> #3 Composite Scoring
           +-> #4 Public Scores
           +-> #12 Token Backing (needs oracle)

#5 New Agents Phase 1
 +-> #9 New Agents Phase 2

#6 User Accounts
 +-> #7 Prediction System
 +-> #11 Wallet Connect
      +-> #12 Token Backing

#10 Token Deployment
 +-> #11 Wallet Connect
```
