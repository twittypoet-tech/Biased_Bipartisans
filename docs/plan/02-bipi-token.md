# BIPI Plan — Token & Bankr.bot Integration

> Last updated: 2026-03-20

## Current State

Nothing token-related exists. Audience interaction is:
- Anonymous votes (IP-based voter ID, 8 vote types)
- Q&A with upvotes (session ID tracking)
- No persistent user identity or reward system

---

## ChatGPT Proposal

- Lock BIPI tokens behind an agent before a debate
- Debate resolves via scoring
- Winners get principal back + bonus rewards from treasury
- No principal loss (soft staking)

---

## Bankr.bot Platform (from docs.bankr.bot)

**What it offers:**
- Fair-launch token deployment on Base blockchain (no upfront cost)
- Agent wallet infrastructure (cross-chain: Base, Ethereum, Polygon, Solana)
- Trading fees flow back to fund compute (self-sustaining agents)
- Skills system — plug-in capabilities (18 skills available)
- Claude Code plugin for direct integration
- Gas fees covered by platform

**Relevant Skills (from github.com/BankrBot/skills):**
- **Bankr** — Token launching with earnings mechanisms, wallet with IP whitelisting
- **SIWA** — Sign-In With Agent (ERC-8004 auth)
- **Onchainkit** — React components for wallet connect, swap widgets
- **Quicknode** — RPC access for balance queries

---

## Prerequisite Chain

1. **User Identity** (BLOCKER) — No accounts exist. Before tokens can be "backed," users need persistent identity + wallets
2. **Token Deployment** — Bankr makes this easy. BIPI token could be deployed quickly once decided
3. **Backing Mechanic** — Essentially a prediction market. Lock -> resolve -> distribute. Bankr handles custody
4. **Scoring as Oracle** — Our existing eval pipeline serves as the resolution oracle

---

## Recommended Approach

### V0 — Soft Backing (No Blockchain)
- Add user accounts via Supabase Auth
- Let users "predict" a debate winner using points (not tokens)
- Display leaderboard of prediction accuracy
- **Purpose:** Validates the mechanic before adding crypto complexity

### V1 — Bankr Integration
- Deploy BIPI token via Bankr fair-launch on Base
- Install Bankr skill for agent wallet infrastructure
- Wire up wallet connect (Onchainkit React components)
- Lock/resolve cycle uses our eval pipeline as oracle
- Trading fees fund agent compute costs

---

## Implementation Timeline

- **V0:** Tier 2 on roadmap (after user accounts — Priority #6-7)
- **V1:** Tier 3 on roadmap (Priority #10-12)
- **Blocker:** User identity system must come first regardless of approach
