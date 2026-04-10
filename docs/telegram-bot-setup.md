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

Then send `/status`. You should get a counts summary back.

---

## Step 7 — Schedule the two cron remote agents

In a regular Claude Code session (not the channel session), use the `/schedule` skill to create two scheduled remote agents:

```
/schedule
  name: bipi-news-scout
  cron: 0 7,13,19 * * *
  prompt: Read /Users/macbot/Biased_Bipartisans/skills/news-scout.md and execute it with default inputs (target_count = 10).
```

```
/schedule
  name: bipi-article-writer
  cron: */20 * * * *
  prompt: Read /Users/macbot/Biased_Bipartisans/skills/article-writer-worker.md and execute it.
```

### Tool inventory — what each agent must have

This is exhaustive. If anything in the list below is missing at runtime, the agent will silently degrade or hard-fail. Verify every row before relying on the cron.

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

The agents do not work without these. Each must be configured in the runtime environment's MCP settings (typically `~/.claude/mcp_settings.json` or equivalent) and the scheduled agent must have permission to call the listed tools.

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

> ⚠️ The Supabase service-role key currently appears as a literal `'...'` placeholder inside the Python snippet at `skills/generate-article.md:159`. In your local runs you've been substituting it from `.env` by hand. For the remote writer agent, this must come from `SUPABASE_SERVICE_ROLE_KEY` in the environment instead. **Verify this works end-to-end during the writer dry-run in the plan's verification step 8 before flipping the cron on.** If the upload fails because the key is missing, the writer will mark the row failed (which is correct loud-fail behavior) but you'll get zero articles until you fix the env.

#### Filesystem access (both agents)

- Working directory **must** be the Bipi News repo root (`/Users/macbot/Biased_Bipartisans` or wherever the repo lives on the host). All skill paths in `article-writer-worker.md`, `news-scout.md`, and `generate-article.md` are repo-relative.
- Read access to **at minimum** these directories:
  - `skills/` (entire directory — the writer reads `article-writer-worker.md`, `generate-article.md`, `stop-slop.md`)
  - `docs/kb/` (entire directory — every persona KB plus `bipi-commentary-agents-kb.md`)
  - `supabase/migrations/` (the scout reads `00037_article_agent_authorship.sql` for the category list)
- Write access to a temp directory (image processing). `/tmp` is fine.

#### Quick pre-flight verification (run before /schedule)

In a one-off Claude Code session in the same environment you'll schedule the agents, run:

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

If all six environment vars print `yes`, all five filesystem paths exist, all three MCP/plugin probes succeed, and you receive the "preflight ok" message on Telegram, the environment is ready for `/schedule`.

You can list, pause, or delete them anytime:

```
/schedule list
/schedule pause bipi-news-scout
/schedule delete bipi-news-scout
```

---

## Step 8 — Pick a host for the operations console

The console session must stay alive 24/7 to receive Telegram messages. Two options:

### Option A — Your laptop in tmux (recommended for week 1)

```bash
tmux new -s bipi-ops
cd ~/Biased_Bipartisans
claude --channels plugin:telegram@claude-plugins-official
# Inside the session, paste the prompt from Step 6.
# Detach with Ctrl-b d.
```

To check on it: `tmux attach -t bipi-ops`. To restart after a laptop reboot: same commands.

Pros: zero infrastructure, easy to inspect, free.
Cons: dies if your laptop sleeps, dies if Claude Code updates, dies if you're on a flight.

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

- 07:00, 13:00, 19:00 UTC: scout fires, you get 10 cards on Telegram. Tap Approve / Reject / Reassign / Edit on each.
- Every 20 minutes: writer wakes up, claims up to 3 approved items, writes them via `skills/generate-article.md`, sends you a status message per article (`✍️ Writing... → ✅ Published` or `❌ Failed`).
- Anytime: `/scout` to trigger an extra batch, `/status` to check the queue, `/last` to see what shipped, `/pause writer` if something's wrong, `/regenerate <id>` to retry a failed item.

For a full command reference: send `/help` to the bot, or read `skills/ops-console.md`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Bot doesn't react to any messages | Console session not running, or `TELEGRAM_CHAT_ID` mismatch | Check `tmux attach -t bipi-ops`. Confirm chat id with `getUpdates`. |
| Scout sends cards but Approve does nothing | Console session is running but didn't load `ops-console.md` | Re-paste the Step 6 prompt into the session. |
| Writer never picks up approved items | `feature_flags.article_writer_enabled = false`, or scheduled writer agent paused | `/resume writer`, then `/schedule list` and unpause `bipi-article-writer`. |
| Articles published with wrong persona | Scout's persona pick wasn't overridden in time | Use the 🔁 Reassign button before tapping Approve, or `/assign <id> <slug>` after the fact (must be done while still `pending`). |
| Telegram messages stop arriving | Telegram bot polling stalled | Restart the console session (`tmux attach`, `Ctrl-c`, re-run `claude --channels ...`). |
| Two writers ran the same row | Should not happen — the `WHERE status = 'approved'` claim guard prevents it | Check `article_queue` for duplicate `generated_report_id`. If you see one, file an issue. |

---

## What's next (Phase 2, not built yet)

When you trust topic-picking enough to drop the approval gate:

- Add `feature_flags.auto_approve_articles` (boolean, default `false`)
- Update `news-scout.md` to insert rows as `status = 'approved'` directly when the flag is `true`, skipping the Telegram cards
- Add `/auto on` and `/auto off` slash commands to `ops-console.md`

Telegram becomes notification + override only — you get a "batch started" message, per-article success/fail messages, and `/cancel` / `/regenerate` for damage control.
