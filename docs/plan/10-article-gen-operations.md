# 10 — Article Generation: Day-to-Day Operations

> Last updated: 2026-04-10
> Audience: James (operator). Follow this for the first 30 days of running the pipeline.
> Status: **live in production** as of 2026-04-10 23:54 UTC (first batch published)

---

## What this document is for

This is the operator's manual for the automated article generation pipeline that went live on 2026-04-10. It covers:

- How the pieces fit together (architecture, so you can reason about failures)
- How to start, restart, and detach the long-running channel session
- The full Telegram command reference with plain-English fallbacks
- Daily, weekly, and monthly maintenance tasks
- Monitoring queries to check system health without restarting anything
- A troubleshooting playbook for every failure mode hit during setup
- The bug log from the smoke test (so you don't re-debug the same things)
- Cost expectations and where to watch for drift
- Rollback and recovery procedures if something goes wrong

Read the whole thing once now, then keep it open for reference. The goal is that any problem you hit in the next month has an answer somewhere in here.

**Related docs:** `docs/telegram-bot-setup.md` (one-time setup), `skills/ops-console.md` (behavior spec for the running session), `skills/news-scout.md` (scout program), `skills/article-writer-worker.md` (writer program), `skills/generate-article.md` (per-article writing workflow).

---

## 1. Architecture snapshot (the five pieces)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Channel Session (one long-running Claude Code process)              │
│                                                                      │
│  $ tmux new -s bipi-ops                                              │
│  $ caffeinate -dimsu &                                               │
│  $ cd ~/Biased_Bipartisans                                           │
│  $ claude --channels plugin:telegram@claude-plugins-official         │
│                                                                      │
│  Loads: ops-console.md (reactive behavior spec)                      │
│  MCP:   telegram plugin (polling), Supabase, BrightData              │
│  Holds: 2 /loop crons (scout 8h, writer 30m)                         │
│  Runs:  ops-console turns (reactive) + loop turns (scheduled)        │
│         all serialized through a single turn queue                   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │ reads + writes
                              ▼
                    ┌─────────────────────┐
                    │   Supabase tables   │
                    │                     │
                    │  article_queue      │
                    │  feature_flags      │
                    │  news_threads       │
                    │  news_reports       │
                    │  agents             │
                    └─────────────────────┘
                              ▲
                              │
                              │ reads  ┌────────────────────┐
                              └────────┤ Your phone         │
                                       │ Telegram bot:      │
                                       │ @Bipi_news_ops_bot │
                                       └────────────────────┘
```

The **channel session** is the core. Everything flows through it:

- The ops-console behavior reacts to inbound Telegram messages from your phone
- The **scout loop** fires every 8 hours, injects `Read .../news-scout.md and execute it` as a turn
- The **writer loop** fires every 30 minutes, injects `Read .../article-writer-worker.md and execute it`
- The **plugin's reply tool** sends all output back to Telegram so you see everything from your phone

The session is **single-threaded** — one turn at a time. If the writer is mid-article and a Telegram command arrives, the command queues behind the writer. If the scout fires while the writer is running, it queues too. This is fine for your scale (~30 articles/day) and it's actually a feature — it prevents accidental parallel writes of the same queue row.

**If the session dies, everything dies** — no scout, no writer, no Telegram responsiveness. Queue state and thread state survive in Supabase; only the in-memory conversation context is lost. Restarting brings everything back except the `/loop` schedules, which must be re-issued.

---

## 2. The channel session lifecycle

### 2.1 Starting from scratch

One tmux session, one Claude Code process inside it, one caffeinate keeping the laptop awake, one bootstrap prompt, two `/loop` commands. In this exact order:

**Step 1 — tmux + caffeinate + claude launch**

```bash
tmux new -s bipi-ops
cd ~/Biased_Bipartisans
caffeinate -dimsu &           # keeps the laptop system-awake (display can still sleep)
claude --channels plugin:telegram@claude-plugins-official
```

The `--channels` flag is mandatory. Without it, the session can send outbound Telegram messages but won't receive inbound ones. If you ever see "Ops console loaded" but texts from your phone don't show up, the first thing to check is whether the flag was included at launch.

**Step 2 — bootstrap prompt** (paste this verbatim as your first message):

> You are the Bipi News operations console. Read `/Users/macbot/Biased_Bipartisans/skills/ops-console.md` and follow it for every incoming Telegram message and `<channel>` callback. Only act on messages from `chat_id 7284074128` — silently ignore everything else. Use the `mcp__plugin_telegram_telegram__reply`, `react`, and `edit_message` tools for all user-facing output. Reserved commands (`/start`, `/help`, `/status`) never reach you — use `/state` and `/commands` as their replacements. Bash rule: never use command substitution `$(...)` or backticks; follow `skills/article-writer-worker.md`'s "Bash rules" section for every shell operation.

**Step 3 — verify the plugin is actually connected**

```
/mcp
```

Should show `plugin:telegram:telegram` as **connected**. If it says "Failed to reconnect", jump to §8.1 (plugin won't start).

**Step 4 — verify inbound works**

From your phone, text the bot: `ping`. The ops console should react with an emoji (or reply) within ~10 seconds. If it doesn't, jump to §8.2 (inbound polling broken).

**Step 5 — kick off the two loops** (one at a time, in the Terminal, not from your phone):

```
/loop 8h Read /Users/macbot/Biased_Bipartisans/skills/news-scout.md and execute it with target_count = 10
```

```
/loop 30m Read /Users/macbot/Biased_Bipartisans/skills/article-writer-worker.md and execute it
```

The scout loop will fire its first tick immediately (not 8 hours from now — `/loop` fires at t=0 then at t=interval). You'll see the scout pick categories, hit BrightData, insert rows, and send Telegram cards. The writer loop queues behind the scout's first run and registers its cron once the scout returns.

**Step 6 — verify both loops are registered**

```
/loop list
```

Should show two loops with IDs, intervals, and next-fire times. Jot the IDs somewhere — you'll need them to stop a specific loop later.

**Step 7 — detach and walk away**

```
Ctrl-b d
```

The tmux session keeps running in the background. Close the Terminal window, close your laptop lid (caffeinate will keep the system awake), leave the house. The bot is live.

### 2.2 Restarting after a crash, reboot, or update

If the channel session dies for any reason (Claude Code update, laptop reboot, Ctrl-c by accident, tmux session killed):

1. Reattach or create the tmux session: `tmux attach -t bipi-ops` or `tmux new -s bipi-ops`
2. Restart caffeinate if it's not running: `caffeinate -dimsu &`
3. Relaunch Claude: `cd ~/Biased_Bipartisans && claude --channels plugin:telegram@claude-plugins-official`
4. Re-paste the bootstrap prompt from §2.1 Step 2
5. Re-issue both `/loop` commands from §2.1 Step 5

State that survives a restart:
- `article_queue` rows (pending, approved, generating, published, failed — all intact)
- `news_threads` (active list, keywords, coverage stats)
- `news_reports` (all published articles)
- Telegram plugin pairing + allowlist (in `~/.claude/channels/telegram/access.json`)
- `/loop` schedules? **No — loops die with the session.** You must re-issue them every restart.

State that's lost on restart:
- In-memory conversation context (which batch was mid-processing, which cards were about to be sent)
- Any loop ticks that would have fired during the downtime

If a writer tick was mid-article when the session died, the corresponding `article_queue` row will be stuck in `status = 'generating'`. The writer's next tick after restart will NOT re-claim it (claim guard is `WHERE status = 'approved'`). Manually fix those orphans from Telegram: text `find stuck generating rows and reset them to approved`, and the ops-console will do it.

### 2.3 The 7-day auto-expire

`/loop` commands in Claude Code have a **built-in 7-day expiration**. This is a deliberate safety feature so runaway loops don't run forever if you forget about them. After 7 days, the loops stop firing on their own.

**Maintenance action:** once a week, re-paste the two `/loop` commands into the channel session. That's it. Set a recurring calendar reminder every Monday at 9am called "re-loop bipi ops" and you're covered.

If you forget and the loops expire, the session stays alive but no new scout or writer ticks fire. You'll notice because Telegram goes silent for 8+ hours (no scout cards). Fix: re-attach tmux, re-issue the two loops, send `/scout` from your phone to trigger a fresh batch, move on.

### 2.4 Checking session health without disturbing it

```bash
tmux attach -t bipi-ops
```

Look for:
- A `>` prompt at the bottom = idle, ready to receive. Healthy.
- An active "thinking" spinner = currently processing a turn. Don't touch.
- Error messages near the top = something broke. Read them, screenshot for me if unclear.
- No prompt at all, no output = session probably exited. Relaunch per §2.2.

Detach with `Ctrl-b d`. Never `Ctrl-c` unless you're intentionally killing the session.

---

## 3. The two scheduled loops

### 3.1 Scout loop (every 8 hours)

**Command:**
```
/loop 8h Read /Users/macbot/Biased_Bipartisans/skills/news-scout.md and execute it with target_count = 10
```

**What it does on each tick:**

1. Checks `feature_flags.article_scout_enabled`. If false, sends "🔴 Scout paused" to Telegram and exits.
2. Queries `news_reports` for category usage in the last 24 hours. Picks a balanced mix of 10 categories (≥3 academic + ≥5 general, prefer under-used).
3. Loads active `news_threads` to know which keywords get ongoing-coverage exemption.
4. Runs `mcp__brightdata__search_engine_batch` + `mcp__brightdata__discover` with `start_date = today` and time-locked queries (`"breaking [topic] today"`, `"[topic] just announced"`). Hard 24-hour recency floor.
5. For each candidate, verifies the date (drops anything older than yesterday), then matches against active threads. Thread matches bypass the 48h novelty filter IF they bring a genuinely new development.
6. Picks a persona per story: reads 3-4 relevant KBs, avoids personas with 2+ articles today, rotates across archetypes and threads.
7. Inserts 10 rows into `article_queue` with `status = 'pending'`, sets `thread_id` where applicable.
8. Sends 10 approval cards to your Telegram chat via the plugin's `reply` tool.
9. Saves each card's `message_id` back into the queue row so the writer can edit it later.
10. Sends a closing "✅ Scout batch ready" summary.

**What you do:** review the cards on your phone and approve/reject.

**First tick cadence:** immediately when you issue the `/loop` command. After that, every 8 hours from the first tick time. If you start the loop at 14:07, next ticks are 22:07, 06:07, 14:07, etc. NOT aligned to clock hours. If you want different clock-aligned times, stop the loop and re-issue at the desired time.

### 3.2 Writer loop (every 30 minutes)

**Command:**
```
/loop 30m Read /Users/macbot/Biased_Bipartisans/skills/article-writer-worker.md and execute it
```

**What it does on each tick:**

1. Checks `feature_flags.article_writer_enabled`. If false, sends "🔴 Writer paused" and exits.
2. Runs the stop-slop gate preflight: reads `skills/stop-slop.md`, confirms rubric markers are present. Reads `skills/generate-article.md` and confirms it still references stop-slop. If either check fails, aborts the tick without claiming any rows.
3. Atomically claims up to 3 approved rows: `SELECT ... LIMIT 3` then `UPDATE status='generating' WHERE id = ? AND status='approved'`.
4. For each claimed row:
   - Sends "✍️ Writing..." Telegram status message
   - Reads the persona's KB (`docs/kb/{archetype}-kb.md`)
   - Executes the full 7-step `generate-article.md` workflow (research, image, write, score, INSERT)
   - Validates all 11 hard quality gates (word count, sources ≥7, stop-slop ≥35/50, etc)
   - Pings IndexNow via Python heredoc
   - Updates the queue row to `published` with `generated_report_id`
   - Bumps `news_threads.last_covered_at` and `total_articles` if thread-linked
   - Edits the Telegram status message to "✅ Published: {url}"
5. Sends a closing "🏁 Writer tick complete" summary with counts.

**What you do:** nothing, unless something fails. The writer is hands-off.

**Failure behavior:** if any single article hits a hard gate failure (too few sources, stop-slop below 35, etc), that row gets marked `failed` with a specific error string and the writer continues to the next row. One bad article does NOT kill the rest of the batch.

### 3.3 Why these intervals

- **Scout every 8 hours** = 3 batches/day = up to 30 articles/day at 10 cards per batch. Matches the target volume.
- **Writer every 30 minutes** = drains approved rows within ~half an hour of your approval. 3 rows per tick × 2 ticks/hour = 6 articles/hour cap, which is plenty.
- **Serialization trade-off:** if both loops fire close together, the scout runs first (it's cheaper), then the writer runs. A full scout takes ~5-15 min, a writer with 3 articles takes ~30-50 min. Both well under their interval.

### 3.4 Manual triggers (anytime, from your phone)

You don't have to wait for the cron. Text the bot:

| Text | Effect |
|---|---|
| `/scout` | Runs news-scout.md immediately with target_count=10 |
| `/scout 5` | Same, with 5 cards |
| `/scout topic: gaza ceasefire violations` | Seed-driven scout, searches around your topic |
| `/scout category: Energy & Climate` | Single-category batch |
| `/writer` | Runs writer immediately, drains up to 3 approved rows |
| `/writer <queue_id>` | Writes one specific row right now |
| `/generate <queue_id>` | Same as `/writer <id>` |

Manual triggers run inline in the same channel session, competing for its single turn slot with the cron loops and any other incoming messages.

---

## 4. Telegram command reference

### 4.1 Reserved commands (do NOT use these)

Three slash commands are intercepted by the plugin server before they reach the ops-console:

- `/start` — plugin sends pairing instructions, never reaches Claude
- `/help` — plugin sends its own help, never reaches Claude
- `/status` — plugin sends "Paired as {username}", never reaches Claude

Use `/state` and `/commands` instead. There is no replacement for `/start`.

### 4.2 Scout / writer triggers

| Command | Effect |
|---|---|
| `/scout` | Run scout now, target_count=10 |
| `/scout 5` | Run scout now, target_count=5 |
| `/scout topic: <text>` | Seed-driven scout around a topic |
| `/scout category: <name>` | Single-category scout (must be one of the 20 valid categories) |
| `/writer` | Drain writer queue now (up to 3 rows) |
| `/writer <queue_id>` | Write one specific row now |
| `/generate <queue_id>` | Alias for `/writer <id>` |
| `/regenerate <queue_id>` | Reset a failed/published row and re-run the writer |
| `/cancel <queue_id>` | Mark a pending row as rejected |

### 4.3 State & inspection

| Command | Effect |
|---|---|
| `/state` | Queue counts (pending/approved/generating/today's published/today's failed), feature flag state |
| `/queue` | List pending + approved rows with ids, statuses, personas, topics |
| `/last` | Last 5 published articles with URLs |
| `/last 10` | Same with limit 10 |
| `/commands` | Send the full command reference back via Telegram |

### 4.4 Queue manipulation

| Command | Effect |
|---|---|
| `/assign <queue_id> <persona-slug>` | Reassign which persona writes a pending row |
| `/edit <queue_id> <new topic>` | Edit a pending row's topic before approval |
| `/topics <a, b, c>` | Pre-seed topics for the next scheduled scout run |

### 4.5 Feature flag toggles

| Command | Effect |
|---|---|
| `/pause scout` | `feature_flags.article_scout_enabled = false` |
| `/resume scout` | `= true` |
| `/pause writer` | `feature_flags.article_writer_enabled = false` |
| `/resume writer` | `= true` |

Both scout and writer check these flags at the start of every tick. `/pause writer` stops new rows from being processed on the next tick — it does not interrupt a tick that's already running.

### 4.6 Threads management

| Command | Effect |
|---|---|
| `/threads` | List active news_threads with stats (total_articles, last_covered_at) |
| `/threads all` | Include inactive threads with a 🚫 marker |
| `/threads pause <slug>` | Deactivate a thread (stops ongoing-coverage exemption) |
| `/threads resume <slug>` | Reactivate |
| `/threads add <slug> "<label>" <kw1, kw2, ...>` | Add a new ongoing storyline |
| `/threads rm <slug>` | Delete a thread (two-step confirmation) |

### 4.7 Inline button callbacks (on scout cards)

Each scout card has four inline buttons:

| Button | Action |
|---|---|
| ✅ Approve | status → approved, card edits to "✅ APPROVED" |
| ❌ Reject | status → rejected |
| 🔁 Reassign | Console asks "which persona slug?", waits for your reply |
| ✏️ Edit topic | Console asks "new topic?", waits for your reply |

### 4.8 Free-form text (no slash, plain English)

Anything that isn't a recognized slash command gets interpreted by the ops-console. Examples that work:

- `"how many articles today?"` → `/state`
- `"approve all"` → bulk-approve all pending rows
- `"approve 8f2fd721"` → approve by queue id prefix
- `"scout something about russia striking kyiv"` → `/scout topic: russia striking kyiv`
- `"why did the last batch fail?"` → reads recent `failed` rows and reports their error strings
- `"show me failed rows from the last 24 hours"` → targeted queue query
- `"write the hegseth one now"` → finds the matching approved row and runs the writer
- `"pause everything for an hour"` → flips both feature flags off; does NOT auto-resume (you have to manually resume)

When in doubt, the ops-console asks one short clarifying question instead of guessing.

---

## 5. Approving scout cards: the daily workflow

When the scout fires (manually or on the 8h cron), you'll get up to 10 cards on your phone. Each card looks roughly like this:

```
📰 1/10 · Tech & AI
Trump signs AI compute export controls expansion
Executive order expands chip export restrictions to...
🎙 Persona: The Freeman (the-freeman)
🔗 Sources: bloomberg.com/..., reuters.com/..., wsj.com/...
queue_id: 08aa86e9-0717-4ff7-8afb-a1b4f53a4415
[✅ Approve] [❌ Reject] [🔁 Reassign] [✏️ Edit topic]
```

### 5.1 Approve

Tap ✅. The card edits to "✅ APPROVED — {topic}" and the row flips to `approved`. The writer picks it up on its next tick (up to 30 min later) or immediately if you text `/writer`.

If inline buttons don't work in your Telegram client for some reason, just text the bot `approve <first-8-chars-of-queue-id>` or `approve the freeman one` in plain English. The ops-console handles both.

### 5.2 Reject

Tap ❌. Row flips to `rejected`. The writer skips it. Use this when the topic is wrong, stale, or not worth writing.

### 5.3 Reassign

Tap 🔁. Ops-console asks "Which persona slug?" via reply. You reply with a slug like `the-hawk` or `the-economist`. Must match an active persona (29 available). Ops-console validates, updates the row, sets `reassigned_by_user = true` (audit trail), and edits the card to show the new persona. Card keeps its inline buttons so you can still approve/reject after reassigning.

### 5.4 Edit topic

Tap ✏️. Ops-console asks "New topic text?" via reply. You reply with the new text. Ops-console updates the row and re-renders the card. Useful when the scout's framing is close but not quite right.

### 5.5 Bulk operations

Text the bot:
- `approve all` — approves every pending row in the current batch
- `reject all` — rejects every pending row
- `approve 1 3 5 7` — approve by 1-indexed card position in the last batch
- `reject 2 4 6` — reject by position

### 5.6 If you're not around to approve in real-time

That's fine. Scout cards stay in `pending` status indefinitely — no auto-expire. Come back when you're back at your phone, text `/queue` to see what's waiting, approve/reject at your leisure. The writer only touches approved rows, so nothing publishes without your say-so.

**Caveat:** if you let the queue grow huge (50+ pending), the scout's novelty filter may start dropping candidates that duplicate topics already in the pending queue. To avoid this, clear the queue regularly.

---

## 6. Ongoing-coverage threads

The `news_threads` table lets you designate certain storylines as "ongoing coverage" — wars, elections, major court cases, sustained crises. The scout bypasses the standard 48h novelty filter for candidates matching an active thread, as long as the candidate brings a genuinely new angle.

### 6.1 Starter threads (seeded 2026-04-10)

| Slug | Label |
|---|---|
| `russia-ukraine-war` | Russia–Ukraine war |
| `israel-gaza-war` | Israel–Gaza war |
| `us-2026-midterms` | US 2026 midterm elections |
| `china-taiwan-tensions` | China–Taiwan tensions |
| `iran-tensions` | Iran tensions |
| `trump-administration` | Trump administration policy and personnel |
| `ai-regulation` | AI regulation and policy |
| `supreme-court-2026-term` | Supreme Court 2026 term |

All start active. Text `/threads` from your phone to see the current state.

### 6.2 When to add a new thread

When a new sustained storyline emerges that deserves daily or near-daily coverage. Examples:

- **A new war or major escalation.** "ukraine-counteroffensive", "taiwan-invasion", "saudi-iran-war"
- **An election cycle.** "uk-2027-general", "german-federal-2026"
- **A major ongoing investigation.** "nvidia-antitrust", "boeing-crash-investigation"
- **A court case with multi-month lifespan.** "trump-jack-smith", "google-doj-search"

Add from your phone:

```
/threads add ukraine-counteroffensive "Ukraine counteroffensive" ukraine, kursk, kharkiv, donetsk, counteroffensive
```

The keywords list is comma-separated and lowercase. Scout matches against headline + summary substring.

### 6.3 When to pause a thread

When the storyline cools off for multiple weeks. Example: "china-taiwan-tensions" should get paused during quiet stretches, resumed when PLA activity picks up. Pausing doesn't delete anything — the thread just stops exempting candidates from the novelty filter, so the scout treats it as a normal topic.

```
/threads pause china-taiwan-tensions
/threads resume china-taiwan-tensions
```

### 6.4 Weekly thread review

Every Monday (same time as `/loop` re-issue), text the bot:

```
/threads
```

Look at `last_covered_at` and `total_articles`. For each thread:

- **Last covered > 7 days ago + total_articles unchanged** → consider pausing
- **Very high total_articles + low distinct stories** → consider narrowing the keywords so the scout picks only substantive new angles
- **A new sustained storyline that doesn't have a thread yet** → add it

---

## 7. Weekly maintenance (Monday ritual)

Every Monday morning, run through this checklist while your coffee brews. Should take <10 minutes.

### 7.1 Verify the session is alive

```bash
tmux attach -t bipi-ops
```

Check for the `>` prompt. If the session is dead, restart per §2.2.

### 7.2 Re-issue the /loop commands

Paste (one at a time):

```
/loop 8h Read /Users/macbot/Biased_Bipartisans/skills/news-scout.md and execute it with target_count = 10
```

```
/loop 30m Read /Users/macbot/Biased_Bipartisans/skills/article-writer-worker.md and execute it
```

Then:

```
/loop list
```

Should show two loops. If the OLD loops are still there (not yet auto-expired), stop them first to avoid duplicates:

```
/loop stop <old-scout-id>
/loop stop <old-writer-id>
```

Then re-issue.

### 7.3 Detach and check from your phone

`Ctrl-b d` out of tmux. From your phone, text:

```
/state
```

Should return fresh counts. If no reply within 10 seconds, the bot isn't receiving messages — reattach and check `/mcp`.

### 7.4 Review the previous week's output

Text the bot:

```
show me last 20 published articles
```

Or run a direct query via Supabase MCP in a separate Claude session (not the channel session, to avoid interrupting ops):

```sql
SELECT published_at::date AS day, COUNT(*) AS articles,
       COUNT(DISTINCT category) AS categories,
       COUNT(DISTINCT agent_id) AS personas
FROM news_reports
WHERE published_at > now() - interval '7 days'
GROUP BY day
ORDER BY day DESC;
```

Target: 20-30 articles/day, 8+ categories, 10+ personas. If any metric is way off (e.g., 3 articles/day), something is wrong — check the failed rows next.

### 7.5 Review failed rows

```sql
SELECT id, topic, error, created_at
FROM article_queue
WHERE status = 'failed' AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

Look for patterns. Common causes:

- `stop_slop_floor: scored N/50, below 35` → a specific persona or topic is producing weak drafts. Review the topic; sometimes the story just doesn't have enough substance to hit the rubric.
- `sources_floor: N below 7` → BrightData couldn't find enough sources. Either the topic is too niche or BrightData had a bad day.
- `ETIMEDOUT` in an MCP call → transient network / BrightData issue.
- `INSERT failed: ...` → likely a schema mismatch or constraint violation. Read the full error.

For any failed row you still want, text `/regenerate <queue_id>` to retry.

### 7.6 Review the threads

```
/threads
```

Pause stale threads, add new ones for emerging storylines. See §6.4.

### 7.7 Check Supabase storage usage

The `news-report-images` bucket grows ~30 images/day. At ~70KB each, that's ~2MB/day or ~60MB/month. The free tier is 1GB so you're fine for ~15 months before you need to think about cleanup.

To check current usage:

```sql
SELECT
  COUNT(*) AS image_count,
  pg_size_pretty(SUM(metadata->>'size')::bigint) AS total_size
FROM storage.objects
WHERE bucket_id = 'news-report-images';
```

### 7.8 Check the caffeinate process

```bash
pgrep -lf caffeinate
```

If nothing returns, laptop will start sleeping. Re-run `caffeinate -dimsu &` in a separate tmux pane.

### 7.9 Git sync the skills

If you've made local edits to skills that aren't committed yet:

```bash
cd ~/Biased_Bipartisans
git status
```

If there are uncommitted changes, review and commit them. The skills are the source of truth for the channel session's behavior, so they should always be in git.

---

## 8. Troubleshooting playbook

Every failure mode hit during the 2026-04-10 setup is documented here with its diagnosis and fix.

### 8.1 `/mcp` shows "Failed to reconnect to plugin:telegram:telegram"

**Symptom:** Plugin was working, you restarted, now `/mcp` says the telegram plugin is disconnected.

**Root cause:** one of three things:

1. **Plugin auto-updated.** The cache has a new version (e.g., `0.0.5` → `0.0.6`) with the default broken `.mcp.json`. Check:
   ```bash
   ls /Users/macbot/.claude/plugins/cache/claude-plugins-official/telegram/
   ```
   If there's a new version number, you need to re-patch its `.mcp.json`.

2. **The patched `.mcp.json` got overwritten.** Check:
   ```bash
   cat /Users/macbot/.claude/plugins/cache/claude-plugins-official/telegram/<version>/.mcp.json
   ```
   If the `command` is `"bun"` (not the absolute path) or the args include `"run"` + `"start"`, the patch is gone. Re-apply.

3. **Bun binary moved or got uninstalled.** Check:
   ```bash
   ls -la /Users/macbot/.bun/bin/bun
   /Users/macbot/.bun/bin/bun --version
   ```
   Should print `1.3.9` or similar. If not, reinstall bun.

**The patch to apply** (to the newest version directory in the cache):

```json
{
  "mcpServers": {
    "telegram": {
      "command": "/Users/macbot/.bun/bin/bun",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.ts"]
    }
  }
}
```

After patching, Ctrl-c the channel session and relaunch it. `/mcp` should show connected.

### 8.2 Inbound Telegram messages not reaching the channel session

**Symptom:** `/mcp` is connected, but texting the bot from your phone produces no response. The plugin server may send a "Paired as {username}" auto-ack but nothing else happens.

**First check:** did you use a slash command that's reserved (`/start`, `/help`, `/status`)? Those never reach the Claude session. Use `/state` and `/commands` instead, or plain English.

**Second check:** restart the channel session. The first few messages after a restart can be lost in the plugin's polling handoff. After relaunch, send a fresh plain-text message (e.g., `ping`) and wait ~15 seconds.

**Third check:** verify the chat id allowlist:

```bash
cat ~/.claude/channels/telegram/access.json
```

Should show your chat id in `allowFrom`. If it's empty, you were never paired successfully — redo §5 of `docs/telegram-bot-setup.md`.

**Fourth check:** is the `--channels` flag on the Claude launch? Without it, the session can send outbound but won't receive inbound. Quit and relaunch with `claude --channels plugin:telegram@claude-plugins-official`.

### 8.3 Scout returns nothing / empty batches

**Symptom:** Scout runs but queues 0 rows. Telegram gets "✅ Scout batch ready: 0 cards queued" or similar.

**Root causes:**

- **BrightData down.** Check by running a single search in a side Claude session: `mcp__brightdata__search_engine with query "test"`. If it errors, BrightData is the problem — wait it out.
- **All candidates stale.** Scout's 24h recency rule dropped everything. Unusual unless you're running scout at odd hours. Try again in 30 minutes, or text `/scout topic: <specific_topic>` to seed a known-current story.
- **Kill switch tripped.** `SELECT enabled FROM feature_flags WHERE key = 'article_scout_enabled';`. If `false`, resume with `/resume scout`.
- **All personas have hit their daily cap.** Every active persona has 2+ articles today. Very unusual — means the system published ~60+ articles in 24h. Wait for the daily window to roll over, or manually reassign pending rows.

### 8.4 Writer stuck in "generating" with no progress

**Symptom:** One or more `article_queue` rows have `status = 'generating'` for >1 hour.

**Root cause:** the writer tick that claimed the row died mid-article (session crashed, you Ctrl-c'd, etc). The claim guard prevents re-claim, so the row is orphaned.

**Fix from Telegram:**

```
reset stuck generating rows to approved
```

The ops-console runs: `UPDATE article_queue SET status='approved' WHERE status='generating' AND created_at < now() - interval '1 hour';` and reports the count. Next writer tick picks them up.

### 8.5 IndexNow pings returning 401

**Symptom:** Writer's Telegram status messages say "IndexNow failed: HTTP 401".

**Root cause:** `INTERNAL_API_KEY` is either missing from the channel session's environment or doesn't match the Vercel-side value.

**Check from a side terminal:**

```bash
echo ${INTERNAL_API_KEY:+set}
wc -c <<<"$INTERNAL_API_KEY"        # should print 65 (64-char key + newline)
```

If empty, the channel session was launched from a shell that didn't source `~/.zshrc`. Fix: ensure `export INTERNAL_API_KEY="..."` is in `~/.zshrc`, then relaunch Claude from a fresh shell.

If set but still 401: the local key doesn't match what's in Vercel. Grab the current value from https://vercel.com/your-team/bipi-news/settings/environment-variables and update `~/.zshrc`, then relaunch.

**Note:** IndexNow is best-effort. A 401 here does NOT fail the article publish — articles still reach `news_reports` and will be indexed via sitemap within a few hours. You can safely ignore intermittent 401s and fix only if they persist for multiple hours.

### 8.6 Command substitution prompts keep appearing

**Symptom:** Claude Code shows "Contains command_substitution. Do you want to proceed?" during a writer or scout run.

**Root cause:** Claude generated a bash command with `$(...)` or backticks, usually defensively trying to re-source an env var from a file. This is against the rules in `skills/article-writer-worker.md` "Bash rules" section.

**Fix:** the running session has already-loaded skills that may not include the latest rules. Re-bootstrap the session by pasting:

> Re-read `/Users/macbot/Biased_Bipartisans/skills/article-writer-worker.md` and `/Users/macbot/Biased_Bipartisans/skills/generate-article.md` from disk. Follow the "Bash rules" section in article-writer-worker.md strictly: never use command substitution `$(...)` or backticks. Use Python single-quoted heredocs (`python3 <<'PY' ... PY`) for any multi-step orchestration. If an env var is empty in the current shell, fail loud with a Python `print` — never try to re-source from .env.

Next tick should run without the prompt.

### 8.7 Articles published with wrong persona

**Symptom:** An article in `news_reports` has `agent_id` pointing to a persona you wouldn't have picked.

**Likely cause:** the scout's persona pick wasn't overridden via the 🔁 Reassign button or `/assign` before you approved.

**Fix while still pending:** `/assign <queue_id> <persona-slug>` or use the inline Reassign button.

**Fix after publish:** delete the `news_reports` row and regenerate:

```
/regenerate <queue_id>
```

If there's no queue row (e.g., manual publish), run from a side Claude session:

```sql
DELETE FROM news_reports WHERE id = '<bad-id>';
```

Then re-scout or manually queue a new row for the correct persona.

### 8.8 Loops stopped firing silently

**Symptom:** No scout or writer activity for >9 hours (past the 8h scout interval).

**Root cause:** most likely the 7-day auto-expire (see §2.3). Also possible: session crashed, laptop slept, loops were stopped.

**Check:**

```
/loop list
```

from inside the channel session. If empty, re-issue per §2.1 Step 5.

If loops are listed but "last fired" is old, the session may have had a long-running turn that's been holding the queue. `Esc` in the Terminal to interrupt; next tick should fire.

### 8.9 Telegram bot silently ignoring all messages

**Symptom:** Plugin is connected (`/mcp` says so), session looks alive, but messages from your phone get zero response. Not even the "Paired as" auto-ack.

**Check the allowlist:**

```bash
cat ~/.claude/channels/telegram/access.json
```

Should have `"dmPolicy": "allowlist"` and your chat id in `"allowFrom"`. If `allowFrom` is empty or doesn't contain your id, the plugin is silently dropping your messages (by design — that's the access lock).

**Fix:** edit the file manually (it's just JSON) or use the `/telegram:access allow <chat-id>` skill from a regular Claude Code session:

```
/telegram:access allow 7284074128
```

### 8.10 Scout picking stale (>24h) stories

**Symptom:** Cards in Telegram are reporting on news that's several days old.

**Root cause:** scout's date-verification step isn't actually checking dates, or BrightData's `start_date` filter isn't working as expected.

**Check the scout's recent behavior** by reading its recent turn in the channel session. Scroll up in the tmux pane to find the last scout run. Look for the BrightData calls — they should include `start_date` with today's date.

**If the scout skill isn't enforcing it:** re-read `skills/news-scout.md` in the channel session:

> Re-read `/Users/macbot/Biased_Bipartisans/skills/news-scout.md` from disk. The 24-hour recency rule is a hard requirement — every candidate must be from the last 24 hours, verified via the page's `<time datetime>` or URL date segment. Drop anything you can't confirm. No padding with stale items.

Then re-trigger with `/scout` from your phone.

---

## 9. Bug log (lessons from 2026-04-10 setup)

Documented here so you don't have to re-debug anything that was already caught.

### 9.1 `agents.status = 'active'` is wrong

The enum is `official | guest | sandbox`, not `active`. My original skill SQL used `'active'` (stale memory claim). Fixed in all three skills on 2026-04-10. If you ever see an error like `invalid input value for enum agent_status: "active"`, update the offending query to use `status = 'official' AND role NOT IN ('moderator', 'reporter')`.

### 9.2 KB filename is archetype, not slug

Files are `docs/kb/hawk-kb.md`, not `docs/kb/the-hawk-kb.md`. The mismatch is because the `agents.slug` was changed to `the-hawk` at some point but the KB files kept their original `hawk` filenames. All skills now explicitly use `docs/kb/{archetype}-kb.md`. If you add a new persona, the KB file must use the archetype, not the slug.

### 9.3 IndexNow 301 redirect drops POST body

`https://bipinews.com/api/indexnow` 301-redirects to `https://www.bipinews.com/api/indexnow`. `curl -L` by default converts POST→GET on 301, losing the body. The server then returns `400 {"error":"Invalid JSON"}` (because the GET had no body). Fix: use `curl --post301 -L -X POST ...` OR hit `www.bipinews.com` directly. The current skill does both: Python heredoc + direct `www.` URL.

### 9.4 Telegram plugin reserves three slash commands

`bot.command('start')`, `bot.command('help')`, `bot.command('status')` in `server.ts:639-674`. These never reach the Claude LLM session. Always use `/state` and `/commands` instead. There is no replacement for `/start` — the plugin owns that command for pairing purposes.

### 9.5 Telegram plugin's default `.mcp.json` is broken on macOS + bun-at-home

The plugin ships with `"command": "bun"` which relies on PATH, and a `start` script that does `bun install && bun server.ts` — the `&&` spawns `/bin/bash` which doesn't inherit PATH. Both break on any macOS install where bun lives at `~/.bun/bin/`. Fix: patch the plugin's `.mcp.json` in the cache:

```json
{
  "mcpServers": {
    "telegram": {
      "command": "/Users/macbot/.bun/bin/bun",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.ts"]
    }
  }
}
```

This patch is version-specific. Each time the plugin auto-updates (new version appears in the cache dir), you need to re-apply the patch to the new version's `.mcp.json`. See §8.1 for the re-patch procedure.

### 9.6 Claude Code Bash tool doesn't reliably inherit `~/.zshrc`

Even with `export INTERNAL_API_KEY=...` in `~/.zshrc`, a fresh `claude --channels` session may or may not have that var in the Bash tool's subprocess environment, depending on how the shell that launched Claude handled profile loading.

**Defensive rule for skill authors:** never rely on `$VAR` being set in Bash without confirming. When in doubt, read from `os.environ` in a Python heredoc and fail loud if missing. Do NOT try to re-source `~/.zshrc` or `.env` via `$(grep VAR file | xargs)` — that's command substitution and triggers the security prompt.

### 9.7 `/loop` doesn't persist across session restarts

`/loop` commands are in-memory state of the current Claude Code session. If you restart Claude, loops die. You must re-issue them every restart AND every 7 days (auto-expire).

If you need bulletproof persistence, the alternative is `launchctl` on macOS — a plist that runs `claude -p "Read .../news-scout.md and execute it"` on a cron. More resilient but each invocation is a fresh process (no in-session channel polling, no persistent conversation context). Not currently set up; see §12.1.

### 9.8 Tool permission prompts DO save to `.claude/settings.local.json`

Every time you click "Allow" on a permission prompt, Claude Code appends the specific command pattern to `.claude/settings.local.json`. The file currently contains ~130 entries accumulated over the setup. This file is gitignored globally (`~/.config/git/ignore`) so secrets in it (like DB passwords that leaked during early debugging) aren't committed. Still — do a periodic scrub to remove any lines that look like they contain credentials.

---

## 10. Cost monitoring

### 10.1 Expected monthly costs at 30 articles/day

| Line item | Per article | Per day (30) | Per month (~900) |
|---|---|---|---|
| Claude API tokens (~40K in, ~5K out, Sonnet 4.6 $3/M in, $15/M out) | ~$0.20 | ~$6 | ~$180 |
| BrightData (15 scrapes + 5 discover per article, avg $0.005/req) | ~$0.10 | ~$3 | ~$90 |
| Supabase (queries + storage) | negligible | <$0.01 | <$1 |
| Vercel (no additional cost; existing) | - | - | - |
| **Total API costs** | **~$0.30** | **~$9** | **~$270** |

Plus the baseline Claude Code Max subscription (not per-usage).

### 10.2 Where to watch for drift

- **Sudden spike in Claude tokens** — check if a persona KB or the scout is re-reading the same large files repeatedly. Debug by scrolling through recent turns in the channel session.
- **BrightData rate limits** — BrightData has per-plan request caps. If scraping starts failing with 429, you're hitting the cap. Either upgrade the plan or reduce scout frequency.
- **Supabase egress** — the Python image download fetches from external sources (not Supabase) and uploads to Supabase. Upload is free. The only egress cost is reads from news-report-images by Vercel on article page loads, which is normal CDN traffic.

### 10.3 Kill switch in emergency

If costs blow up and you want to stop everything immediately:

From Telegram:
```
/pause scout
/pause writer
```

Both loops will stop firing at their next tick (up to 30 min delay for the writer, 8h for the scout). For immediate stop, also:

```bash
tmux attach -t bipi-ops
# then in the Claude prompt:
/loop stop all
```

Then decide what to do. The feature flags are persistent in Supabase — they survive session restarts. You can resume later with `/resume scout` + `/resume writer`.

---

## 11. Rollback and recovery

### 11.1 A bad article published — unpublish it

From a side Claude session (not the channel session):

```sql
-- Find it
SELECT id, slug, headline, published_at FROM news_reports
WHERE slug = '<bad-slug>';

-- Soft-unpublish
UPDATE news_reports SET is_published = false WHERE slug = '<bad-slug>';

-- Or hard delete
DELETE FROM news_reports WHERE slug = '<bad-slug>';
```

Soft-unpublish is reversible and keeps the article out of feeds. Hard delete is permanent.

Also reset the queue row if you want to regenerate:

```sql
UPDATE article_queue
SET status = 'approved', generated_report_id = NULL, generated_at = NULL
WHERE generated_report_id = (SELECT id FROM news_reports WHERE slug = '<bad-slug>');
```

Then `/writer <queue_id>` to regenerate.

### 11.2 Whole batch of articles was bad — mass unpublish

```sql
-- Unpublish everything from a specific time window
UPDATE news_reports
SET is_published = false
WHERE published_at > '2026-04-10 20:00:00'
  AND published_at < '2026-04-10 22:00:00';
```

Be very careful with the time window. Always do a `SELECT` first to see what you'd hit:

```sql
SELECT id, slug, headline, published_at FROM news_reports
WHERE published_at > '2026-04-10 20:00:00'
  AND published_at < '2026-04-10 22:00:00'
ORDER BY published_at;
```

### 11.3 The scout is producing bad topics — pause and tune

```
/pause scout
```

Then debug:
- Read the last scout turn in tmux — what queries did it run?
- Are the BrightData results actually recent, or is the recency check broken?
- Is the thread match over-firing? Check `news_threads` keywords — if one thread has very broad keywords, every story hits it.

Tune the relevant pieces, then:

```
/resume scout
/scout 3
```

Run a small batch to verify the fix before letting the full cron resume.

### 11.4 Database corruption / accidental delete — restore from Supabase backup

Supabase keeps daily backups (free tier: 7 days, Pro: 14 days). Restore via Supabase dashboard → Project Settings → Database → Backups → Restore.

**Before restoring, export anything you want to preserve from the current state** — the restore replaces the entire database.

### 11.5 Undo a migration that caused problems

Don't run a migration that changes `article_queue` or `news_threads` schema without a rollback plan. If something goes wrong:

1. `/pause scout` and `/pause writer` from Telegram
2. Use the Supabase dashboard SQL editor to manually fix the schema
3. Update the migration file with the fix
4. Re-apply via Supabase MCP `apply_migration`
5. `/resume scout` and `/resume writer`

---

## 12. Future improvements (backlog)

Things worth doing but not blocking day-1 operation. Ordered by return on time.

### 12.1 Auto-patch script for telegram plugin updates

When the plugin auto-updates (e.g., `0.0.5` → `0.0.6`), the `.mcp.json` reverts to the default broken config. A shell script that finds the newest version in the cache and applies the patch idempotently:

```bash
#!/bin/bash
# scripts/patch-telegram-plugin.sh
set -e
LATEST=$(ls -1d /Users/macbot/.claude/plugins/cache/claude-plugins-official/telegram/*/ 2>/dev/null | sort -V | tail -1)
if [ -z "$LATEST" ]; then
  echo "No telegram plugin found in cache" >&2
  exit 1
fi
cat > "$LATEST/.mcp.json" <<'EOF'
{
  "mcpServers": {
    "telegram": {
      "command": "/Users/macbot/.bun/bin/bun",
      "args": ["${CLAUDE_PLUGIN_ROOT}/server.ts"]
    }
  }
}
EOF
echo "Patched $LATEST/.mcp.json"
```

Run after any plugin update. Consider hooking into a post-update Claude Code hook if that exists.

### 12.2 Background `launchctl` fallback

A macOS launchd plist that runs `claude -p "read skills/news-scout.md and execute it"` on a cron, as a backup if the channel session dies while you're away. Less resilient than /loop inside the channel (doesn't share MCPs, fresh process per run) but survives laptop reboots. Only needed if you plan extended time away from the laptop.

### 12.3 Phase 2 — auto-approve flag

Once you trust the scout's topic and persona picks for ~2 weeks, add a `feature_flags.auto_approve_articles` toggle. When true, the scout writes rows directly as `status = 'approved'` (skipping Telegram cards), the writer picks them up on the next tick. Telegram becomes notification-only.

Commands to add to ops-console.md:
- `/auto on` — enable auto-approve
- `/auto off` — disable, return to human-gate

### 12.4 Per-thread writer cooldown

Currently threads have no built-in rate limit besides the "max 3 articles per thread per 24h" soft rule in the scout. Add a `min_interval_hours` column to `news_threads` and enforce it in the scout's thread match logic.

### 12.5 Weekly digest email

A Monday morning job that queries `news_reports` from the last 7 days, composes a summary by category + persona, and sends it via Brevo to your email. Makes the weekly review (§7.4) easier.

### 12.6 Prune rejected queue rows

`article_queue` rows with `status = 'rejected'` or `failed` from >30 days ago can be deleted to keep the table small. Not urgent — at current volume the table only grows by ~900 rows/month.

### 12.7 Dashboard for ops state

A `/admin/ops` page in `apps/web` that shows:
- Live queue counts
- Last 10 published articles
- Active threads
- Recent failed rows with errors
- Scout/writer loop state (requires polling the session somehow)

Nice-to-have, not urgent. Telegram + direct SQL queries cover all the same ground.

### 12.8 Scrub DB password from settings.local.json

Early debugging left the Supabase DB password hardcoded in `.claude/settings.local.json` lines 7-10, 35. Not in git (global gitignore), but still worth removing. Manual cleanup: delete those lines, the approvals they represent will re-prompt on next use if ever needed.

---

## 13. Quick reference cards

### 13.1 "Session just died, how do I recover in 60 seconds?"

```bash
tmux attach -t bipi-ops
# or if the tmux session is gone:
tmux new -s bipi-ops
caffeinate -dimsu &
cd ~/Biased_Bipartisans
claude --channels plugin:telegram@claude-plugins-official
```

Paste bootstrap prompt (§2.1 step 2), then two `/loop` commands (§2.1 step 5). Detach with `Ctrl-b d`. Done.

### 13.2 "Something's wrong, what's the first query to run?"

From your phone:
```
/state
```

From a side Claude session:
```sql
SELECT status, COUNT(*) FROM article_queue
WHERE created_at > now() - interval '24 hours'
GROUP BY status;

SELECT key, enabled FROM feature_flags;
```

### 13.3 "I just want to see what's live right now"

From your phone:
```
/last 10
```

From a browser: https://www.bipinews.com/news

### 13.4 "Stop everything immediately"

From your phone:
```
/pause scout
/pause writer
```

From Terminal inside the channel session:
```
/loop stop all
```

### 13.5 "Run one article right now for testing"

From your phone:
```
/scout 1 topic: <something specific from today>
```

Wait for the card, tap ✅ Approve, then:

```
/writer
```

---

## 14. When to update this document

Update this doc when:

- A new failure mode is discovered (add to §8 Troubleshooting + §9 Bug log)
- A new maintenance task emerges (add to §7 Weekly maintenance)
- A cost line item changes significantly (update §10)
- A new Telegram command is added to ops-console.md (update §4)
- A new thread is seeded as a default (update §6.1)
- Plugin version patch drift happens (update §8.1 and §12.1)

Bump the "Last updated" date at the top. Commit with a descriptive message.

---

**This is the one document you should keep open on the second monitor for the next 30 days.** Everything else is a lookup; this is the playbook.
