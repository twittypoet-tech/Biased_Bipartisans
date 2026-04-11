# Telegram Bot Setup — Bipi News Operations

This is the one-time setup for the automated article generation + Telegram oversight system. Once everything below is in place, the system runs itself: a "news scout" remote agent picks 10 topics three times a day and sends them to your Telegram for approval; an "article writer" remote agent drains approved items every 20 minutes and writes the articles via `skills/generate-article.md`; and a long-running "operations console" Claude Code session handles your slash commands and button taps in real time.

Architecture summary, files, and command reference live in `/Users/macbot/.claude/plans/eager-tickling-bear.md`.

---

## Step 1 — Apply the database migration

**Already done** during the build. If you ever need to re-apply on a fresh project:

```
mcp__claude_ai_Supabase__apply_migration
  project_id: ttmjfvfgvmmyvplhgkgk
  name: article_queue
  query: <contents of supabase/migrations/00041_article_queue.sql>
```

Verify with:

```sql
SELECT key, enabled FROM feature_flags;
SELECT COUNT(*) FROM article_queue;
```

You should see two `feature_flags` rows (`article_scout_enabled`, `article_writer_enabled`, both `true`) and zero `article_queue` rows.

---

## Step 2 — Create the Telegram bot

1. Open Telegram, message **@BotFather**.
2. Send `/newbot`. Pick a name (e.g. `Bipi News Ops`) and a unique username (e.g. `bipi_news_ops_bot`). BotFather replies with a token like `123456789:AAH-fiqksKZ8...`. **Save this token.**
3. From your own Telegram account, send `/start` to your new bot. This creates the chat and lets the bot DM you back.
4. Get your numeric chat ID:

   ```bash
   curl -s "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates" | jq '.result[].message.chat.id'
   ```

   You'll see a number (often 9-10 digits, possibly negative for groups). **Save this as `TELEGRAM_CHAT_ID`.**

---

## Step 3 — Set environment variables

Add to your shell profile (`~/.zshrc` or `~/.bashrc`) and to whichever host runs the operations console (your laptop for week 1, Railway for week 2+):

```bash
export TELEGRAM_BOT_TOKEN="123456789:AAH-fiqksKZ8..."
export TELEGRAM_CHAT_ID="123456789"
```

The scout and writer remote agents inherit these from the same environment when scheduled.

There is **no webhook secret** because the official plugin uses polling, not webhooks. You don't need a public URL.

---

## Step 4 — Install the official Telegram plugin

In a Claude Code session on the machine that will run the operations console:

```
/plugin install telegram@claude-plugins-official
/reload-plugins
/telegram:configure 123456789:AAH-fiqksKZ8...
```

Reference: https://github.com/anthropics/claude-plugins-official/blob/main/external_plugins/telegram/README.md

The plugin writes its config to `~/.claude/channels/telegram/.env`. The `TELEGRAM_BOT_TOKEN` shell var takes precedence if set.

---

## Step 5 — Pair the bot

1. From a Claude Code session: launch with the channel flag.

   ```bash
   claude --channels plugin:telegram@claude-plugins-official
   ```

2. From your phone, DM your bot any message. The bot replies with a 6-character pairing code.
3. Back in the channel session:

   ```
   /telegram:access pair <code>
   ```

This whitelists your chat ID with the plugin. Now any message you send arrives in the running Claude session.

---

## Step 6 — Smoke test the console

Still inside `claude --channels plugin:telegram@claude-plugins-official`, paste this prompt to load the operations behavior:

```
Read /Users/macbot/Biased_Bipartisans/skills/ops-console.md and follow it for every incoming Telegram message and callback. Do not act on messages from any chat id other than $TELEGRAM_CHAT_ID.
```

From your phone, send `hello`. The console session should at minimum react with an emoji. If it does, polling and dispatch are working.

Then send `/state` (NOT `/status` — that one is reserved by the plugin and gets intercepted). You should get a counts summary back from the ops-console.

---

## Step 7 — Run scout + writer on a recurring interval via `/loop`

> **Why `/loop`, not `/schedule`?** The `/schedule` skill creates *remote* Claude Code agents that run in Anthropic's cloud — they have no access to BrightData MCP, no Telegram plugin, no `INTERNAL_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` from your shell, and a 1-hour minimum cron interval. Our scout and writer depend on all of those. So they have to run locally, inside the same long-running Claude session that holds the channel. The `/loop` skill (already installed) is the right tool: it runs a prompt on a recurring local interval inside the current session.

Inside the **same long-running channel session** you launch in Step 8 (after pasting the bootstrap prompt that loads `ops-console.md`), issue these two slash commands to start the recurring scout and writer:

```
/loop 8h Read /Users/macbot/Biased_Bipartisans/skills/news-scout.md and execute it with target_count = 10
```

```
/loop 30m Read /Users/macbot/Biased_Bipartisans/skills/article-writer-worker.md and execute it
```

That sets up:

- **Scout** every 8 hours → 3 batches of 10 cards per day, ~30 articles/day target
- **Writer** every 30 minutes → drains the queue throughout the day (each tick claims up to 3 approved rows, processes them serially)

Both loops queue serially through the same session's turn loop. If the scout fires while the writer is mid-article, the scout waits its turn. Manual Telegram commands also queue through the same loop, so the order is: in-flight task → queued loop ticks → queued Telegram commands. This is fine for our scale (~30 articles/day, ~5 manual commands/day).

To inspect or stop the loops, use the `/loop` skill's management commands inside the same session:

```
/loop list           # see all running loops with their intervals and last-fired times
/loop stop <id>      # stop a specific loop
/loop stop all       # stop everything (e.g. before /pause writer testing)
```

If the laptop sleeps or you restart Claude Code, **the loops stop with the session**. Re-issue them when you bring the channel session back up. The setup is intentionally low-infra; resilience comes from the laptop staying awake (see the `caffeinate` notes in Step 8).

### Tool inventory — what the channel session must have

Since the scout and writer both run inside the long-running channel session via `/loop` (not as separate scheduled processes), this list applies to the **single Claude Code session you launch in Step 8**. If anything below is missing when you start that session, the loops will silently degrade or hard-fail. Verify every row before issuing the `/loop` commands.

#### Built-in Claude Code tools (both agents)

| Tool | Why | Notes |
|---|---|---|
| `Read` | Skill files, persona KBs, stop-slop | Must allow reading anywhere under the repo root, not a narrowed allowlist |
| `Bash` | `curl` for og:image scraping, Python/`curl` for image upload to Supabase Storage, `curl` for IndexNow ping, `grep` for HTML parsing | Needs full shell, not a sandboxed subset. `curl`, `grep`, and either `python3` or `urllib`-equivalent must be on PATH. |
| `Edit` | Revising drafts in step 5 of generate-article.md | Standard Edit tool |
| `Write` | Temporary files during image processing if needed | Standard Write tool |
| `Glob` | Locating persona KBs by slug pattern | Standard Glob tool |
| `Grep` | Searching scraped article text for facts | Standard Grep tool |

#### MCP servers (both agents)

The loops do not work without these. Each must be configured in your local Claude Code MCP settings (typically `~/.claude/mcp_settings.json` or equivalent) and your channel session must have permission to call the listed tools. Since everything runs in a single local session, "configure once" covers all loops + the ops console.

| MCP server | Specific tools used | Used by |
|---|---|---|
| **BrightData** | `mcp__brightdata__search_engine_batch` | scout + writer |
| | `mcp__brightdata__scrape_batch` | scout + writer |
| | `mcp__brightdata__discover` | scout + writer |
| | `mcp__brightdata__search_engine` (single-query, used for image search) | writer |
| | `mcp__brightdata__scrape_as_markdown` (used in Phase C follow-up) | writer |
| **Supabase** (`mcp__claude_ai_Supabase__*`) | `execute_sql` (queue ops, news_reports INSERT, agent lookups, feature_flags reads) | scout + writer + ops console |
| **Telegram plugin** (`telegram@claude-plugins-official`) | `reply` (send messages and cards) | scout + writer + ops console |
| | `edit_message` (edit cards in place after approve/reject; edit "writing now" status messages to "✅ Published") | writer + ops console |
| | `react` (acknowledge messages quickly) | ops console |

The ops console session additionally needs the plugin in **`--channels` mode** (polling) — that flag is what makes incoming messages and button taps reach Claude. The scout and writer do not use `--channels`; they only call `reply` / `edit_message` outbound.

#### Environment variables (must be set in the agent's process environment)

| Var | Used by | Purpose |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | scout, writer, ops console | Telegram plugin auth |
| `TELEGRAM_CHAT_ID` | ops console (allowlist), scout/writer (target chat) | Where cards and status messages go |
| `INTERNAL_API_KEY` | writer (via generate-article.md step 7 IndexNow ping) | Auth for `bipinews.com/api/indexnow` |
| `SUPABASE_SERVICE_ROLE_KEY` | writer (via the Python image-upload snippet in generate-article.md step 3 Phase D) | Storage upload to `news-report-images` bucket |
| `SUPABASE_URL` | writer (image upload) | `https://ttmjfvfgvmmyvplhgkgk.supabase.co` |
| `ANTHROPIC_API_KEY` | all sessions | Claude API auth — provided automatically by Claude Code in most setups but verify on remote hosts |

> ⚠️ The Supabase service-role key was previously hardcoded as a literal `'...'` placeholder in the Python snippet at `skills/generate-article.md`. That has been fixed to read from `os.environ['SUPABASE_SERVICE_ROLE_KEY']`. For the local channel session, that variable comes from `~/.zshrc`. As long as you launch Claude from a shell that sourced your `.zshrc` (the default behavior), the writer will inherit it.

#### Filesystem access (channel session)

- Working directory **must** be the Bipi News repo root (`/Users/macbot/Biased_Bipartisans`). All skill paths in `article-writer-worker.md`, `news-scout.md`, and `generate-article.md` are repo-relative. Always launch the channel session from inside the repo: `cd ~/Biased_Bipartisans && claude --channels ...`.
- Read access to **at minimum** these directories (Claude Code's default is to allow everything under the cwd, which covers all of them):
  - `skills/` (entire directory — the writer reads `article-writer-worker.md`, `generate-article.md`, `stop-slop.md`)
  - `docs/kb/` (entire directory — every persona KB plus `bipi-commentary-agents-kb.md`)
  - `supabase/migrations/` (the scout reads `00037_article_agent_authorship.sql` for the category list)
- Write access to a temp directory (image processing). `/tmp` is fine.

#### Quick pre-flight verification (run before issuing the /loop commands)

In your channel session — after Claude has launched and you've pasted the ops-console bootstrap prompt — run a one-off bash check before kicking off the loops:

```bash
# Filesystem
ls skills/{generate-article,stop-slop,news-scout,article-writer-worker,ops-console}.md
ls docs/kb/ | head
test -d /tmp && echo "tmp ok"

# Tools on PATH
which curl grep python3

# Env vars
echo "TG token set: ${TELEGRAM_BOT_TOKEN:+yes}"
echo "TG chat set: ${TELEGRAM_CHAT_ID:+yes}"
echo "Internal API: ${INTERNAL_API_KEY:+yes}"
echo "Supabase URL: ${SUPABASE_URL:+yes}"
echo "Supabase service key: ${SUPABASE_SERVICE_ROLE_KEY:+yes}"
echo "Anthropic key: ${ANTHROPIC_API_KEY:+yes}"
```

Then ask Claude to do these calls in the session and confirm they all return data (not errors):

```
1. mcp__brightdata__search_engine_batch with one trivial query
2. mcp__claude_ai_Supabase__execute_sql with: SELECT key, enabled FROM feature_flags;
3. The telegram plugin's `reply` tool sending "preflight ok" to TELEGRAM_CHAT_ID
```

If all six environment vars print `yes`, all five filesystem paths exist, all three MCP/plugin probes succeed, and you receive the "preflight ok" message on Telegram, the session is ready for `/loop`.

You can list, pause, or stop the loops anytime from inside the same session:

```
/loop list
/loop stop <id>          # stop a specific loop by id from /loop list
/loop stop all           # stop everything
```

To pause the work without killing the loops (e.g., you want them to wake up next tick but not do anything this hour), use the Telegram `/pause scout` and `/pause writer` commands instead — those flip the kill-switch in `feature_flags`, which the skills check on every tick.

---

## Step 8 — Launch the long-running channel session

The channel session is the single Claude Code process that holds everything: Telegram polling, the operations console behavior, and the two `/loop` workers (scout + writer). It must stay alive 24/7 to receive Telegram messages and to fire the loops.

### Option A — Your laptop in tmux (recommended for week 1)

**Step 8.1 — Start tmux + launch Claude with the channel flag:**

```bash
tmux new -s bipi-ops
cd ~/Biased_Bipartisans
caffeinate -dimsu &        # prevent the laptop from sleeping while attached
claude --channels plugin:telegram@claude-plugins-official
```

The `caffeinate -dimsu` keeps the laptop awake (display-off OK, system stays on). Without it, polling pauses every time the laptop sleeps and Telegram approvals stack up until you wake it.

**Step 8.2 — Bootstrap the ops console behavior** (paste this as your first message in the new Claude session):

> You are the Bipi News operations console. Read `/Users/macbot/Biased_Bipartisans/skills/ops-console.md` and follow it for every incoming Telegram message and `<channel>` callback you receive. Only act on messages from `chat_id 7284074128` — silently ignore everything else. Use the `mcp__plugin_telegram_telegram__reply`, `react`, and `edit_message` tools to send all user-facing output back through Telegram.

**Step 8.3 — Run the pre-flight verification from Step 7's "Quick pre-flight verification" block**, just to confirm every env var, every MCP, and the Telegram outbound path are alive in this session.

**Step 8.4 — Kick off the two loops** (paste these one at a time):

```
/loop 8h Read /Users/macbot/Biased_Bipartisans/skills/news-scout.md and execute it with target_count = 10
```

```
/loop 30m Read /Users/macbot/Biased_Bipartisans/skills/article-writer-worker.md and execute it
```

Both loops are now running in this session. The next scout tick fires 8 hours from now; the next writer tick fires 30 minutes from now.

**Step 8.5 — Detach and leave it running:**

```
Ctrl-b d
```

The tmux session keeps running in the background. To check on it later:

```bash
tmux attach -t bipi-ops
```

To restart after a laptop reboot: `tmux new -s bipi-ops`, then re-do Step 8.1 → 8.4. The skills are repo-checked-in so they'll be the same. The article queue and the threads table are in Supabase, so all state survives the restart.

Pros: zero new infrastructure, easy to inspect, free.
Cons: dies if your laptop sleeps without `caffeinate`, dies if Claude Code updates, dies if you're on a flight without your laptop. For each of those, the laptop coming back up + re-running Step 8 brings everything back from saved state.

### Option B — Railway service (week 2+)

You already have Railway in the stack (`mcp__railway-mcp-server__*` tools). Deploy a minimal service that runs the same `claude --channels` command. Set the env vars in Railway. Use Railway's auto-restart to keep the process alive.

A starter approach:
1. Create a new Railway service
2. Use a base image that has the Claude Code CLI installed (or install it in a Dockerfile)
3. Set env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ANTHROPIC_API_KEY`, plus all the Supabase/BrightData credentials the skills need
4. Start command: `claude --channels plugin:telegram@claude-plugins-official` with the ops-console.md prompt fed via stdin or initial-message

This is more work but is the right shape for long-term operation.

---

## Day-to-day operation

Once everything is running, your day looks like:

- **Every 8 hours from session start**: scout fires (via `/loop 8h`), you get up to 10 cards on Telegram. Tap Approve / Reject / Reassign / Edit on each. Note: the schedule is "8 hours from when you started the loop", not fixed clock times — to align to clock hours like 07/15/23 UTC, restart the loop at the desired time.
- **Every 30 minutes**: writer wakes up (via `/loop 30m`), claims up to 3 approved items, writes them via `skills/generate-article.md`, sends you a status message per article (`✍️ Writing... → ✅ Published` or `❌ Failed`).
- **Anytime**: `/scout` to trigger an extra batch out-of-cycle, `/scout topic: <text>` to scout around a specific topic right now, `/state` to check the queue, `/last` to see what shipped, `/pause writer` if something's wrong, `/regenerate <id>` to retry a failed item, `/threads` to see active ongoing-coverage storylines.

> **Important — three slash commands are reserved by the Telegram plugin and will NOT reach the ops-console:** `/start`, `/help`, `/status`. The plugin server intercepts them and sends its own built-in replies (pairing instructions, plugin help, "Paired as" ack). The ops-console replacements are `/state` (not `/status`) and `/commands` (not `/help`). Plain English ("how many articles today?", "list the queue", "scout about ukraine") always works as a fallback for any command.

For a full command reference: send `/commands` to the bot, or read `skills/ops-console.md`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Bot doesn't react to any messages | Channel session not running, not launched with `--channels`, or `TELEGRAM_CHAT_ID` allowlist mismatch | `tmux attach -t bipi-ops`, confirm Claude is alive and was launched with `--channels plugin:telegram@claude-plugins-official`. Check `~/.claude/channels/telegram/access.json` has your chat id in `allowFrom`. |
| Scout sends cards but Approve does nothing | Channel session is running but didn't load `ops-console.md` | Re-paste the Step 8.2 bootstrap prompt into the session. |
| Loops never fire | `/loop` was never issued, or all loops were stopped | `/loop list` to inspect. Re-issue per Step 8.4 if empty. |
| Writer never picks up approved items | `feature_flags.article_writer_enabled = false`, or the writer loop was stopped | From Telegram: `/resume writer`. From the channel session: `/loop list`, then re-issue the writer loop if missing. |
| Loops are running but no cards arriving | The scout loop is still on its 8h cooldown | `/loop list` to see when the next scout tick fires. To force one now, send `/scout` from Telegram (or paste the scout prompt directly into the channel session). |
| Articles published with wrong persona | Scout's persona pick wasn't overridden in time | Use the 🔁 Reassign button before tapping Approve, or `/assign <id> <slug>` after the fact (must be done while still `pending`). |
| Telegram messages stop arriving | Bot polling stalled, laptop slept, or session crashed | `tmux attach -t bipi-ops`. If Claude exited, relaunch per Step 8.1. If polling stalled but the session is alive, send the channel session a "ping" to wake it up, or stop and restart the plugin via `/reload-plugins`. |
| Laptop sleeps during the day | `caffeinate` not running | In a separate tmux pane: `caffeinate -dimsu &`. Add to login items if you want it permanent. |
| Two writers ran the same row | Should not happen — the `WHERE status = 'approved'` claim guard prevents it. With a single channel session running a single writer loop, two-at-once is impossible anyway. | Check `article_queue` for duplicate `generated_report_id`. If you see one, file an issue. |

---

## What's next (Phase 2, not built yet)

When you trust topic-picking enough to drop the approval gate:

- Add `feature_flags.auto_approve_articles` (boolean, default `false`)
- Update `news-scout.md` to insert rows as `status = 'approved'` directly when the flag is `true`, skipping the Telegram cards
- Add `/auto on` and `/auto off` slash commands to `ops-console.md`

Telegram becomes notification + override only — you get a "batch started" message, per-article success/fail messages, and `/cancel` / `/regenerate` for damage control.
