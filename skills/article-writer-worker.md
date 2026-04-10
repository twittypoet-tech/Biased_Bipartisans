---
name: article-writer-worker
description: Drain approved rows from article_queue and turn each into a published article. The outer loop only — for each row, this skill invokes skills/generate-article.md verbatim. Same Claude session does all the writing.
metadata:
  trigger: Scheduled remote agent (every 20 min cron), or invoked manually for testing
  author: BIPI team
---

# Article Writer Worker

You are the **Bipi News article writer worker**. Your job: every time you run, claim a small batch of approved queue rows, write each article in the assigned persona's voice, and update the queue with the result.

**Critical:** You do not duplicate `skills/generate-article.md`. You **invoke** it. For each queue row, you load `skills/generate-article.md` and execute its 7-step pipeline in this same Claude Code session. The "writing" happens in-session — there is no separate process, no handoff, no second agent. The single Claude Code session that picked up the queue row is the same session that writes the article.

## Pre-flight checks

**You must complete every check before claiming any queue rows. If any check fails, send a Telegram error and exit. Do not partially run.**

1. **Check the kill switch.**

   ```sql
   SELECT enabled FROM feature_flags WHERE key = 'article_writer_enabled';
   ```

   If `false`, send Telegram message "🔴 Writer paused, exiting" and **stop immediately**.

2. **Verify tools.** You need:
   - Supabase MCP (for queue ops + the article INSERT inside generate-article.md)
   - BrightData MCP (for research inside generate-article.md)
   - Bash (for image fetching, IndexNow ping)
   - Telegram plugin (`reply`, `edit_message`)

   Missing any → Telegram error → exit.

3. **Verify the quality rubric is loadable.** This is a hard gate. The writer **must not** produce articles without the stop-slop rubric in context, ever.

   Use the `Read` tool on `skills/stop-slop.md`. Confirm the file exists, is non-empty, and contains the strings `"Scoring"` and `"Below 35/50: revise."` (the rubric markers). If the file is missing, empty, or those markers are absent, send Telegram:

   ```
   🚨 Writer aborted: skills/stop-slop.md is missing or malformed. Refusing to write articles without the quality rubric. Fix the file and the next tick will resume.
   ```

   Then exit. Do not claim or generate any rows.

4. **Verify generate-article.md still loads stop-slop.** Read `skills/generate-article.md` and grep for the string `skills/stop-slop.md`. If it is not present, the upstream skill has been edited in a way that bypasses the rubric. Send:

   ```
   🚨 Writer aborted: skills/generate-article.md no longer references skills/stop-slop.md. Refusing to run until the link is restored.
   ```

   Then exit.

   These two pre-flight reads cost a few hundred tokens per tick and guarantee that no article ever ships without the rubric being loaded into the writing session.

## Workflow

### 1. Atomically claim up to 3 approved rows

The claim is a `SELECT ... LIMIT 3` followed by per-row `UPDATE ... WHERE id = ? AND status = 'approved'`. The `WHERE status = 'approved'` guard is what makes the claim atomic — if two writer ticks ever overlap, only one can flip a given row.

```sql
-- Step 1a: read up to 3 approved ids, oldest first
SELECT id, topic, topic_summary, source_urls, category, agent_id,
       telegram_chat_id, telegram_message_id
FROM article_queue
WHERE status = 'approved'
ORDER BY approved_at NULLS LAST, created_at
LIMIT 3;

-- Step 1b: for EACH id returned, attempt to claim it
UPDATE article_queue
SET status = 'generating'
WHERE id = $1 AND status = 'approved'
RETURNING id;
```

If the `RETURNING` is empty, another worker beat you to it — skip that row silently.

If you claimed zero rows total, send Telegram `"📭 Writer tick: nothing approved, queue empty."` and **exit cleanly**. Don't error.

### 2. For each claimed row

#### 2a. Resolve the persona

```sql
SELECT id, slug, name, archetype FROM agents WHERE id = $1;
```

You need at minimum the slug (to read `docs/kb/{slug}-kb.md`) and the name (for Telegram messages).

#### 2b. Send a "writing now" Telegram status

Use the telegram plugin's `reply` tool. Save the returned message id — you'll edit this same message at the end.

```
✍️ Writing article {n}/{m}: *{topic}*
Persona: *{persona_name}*
Category: `{category}`
Queue id: `{queue_id}`
```

#### 2c. Execute generate-article.md

**This is the actual writing step.** Read `skills/generate-article.md` and execute its 7-step pipeline in this same session, with these inputs:

- **Agent name:** the persona's `name`
- **Agent slug:** the persona's `slug`
- **Topic / story:** the queue row's `topic` + `topic_summary`
- **Source URLs:** the queue row's `source_urls`
- **Category:** the queue row's `category`
- **Story group ID:** none (single-perspective generation)
- **Hero image URL:** none (let generate-article.md source one)

The pipeline ends with an INSERT into `news_reports` and an IndexNow ping. The new row's `id` is what you need next. Make sure the INSERT explicitly sets `agent_id` to the persona's id (the existing skill should already do this — verify, don't assume).

**Quality rubric is non-negotiable.** generate-article.md step 2 reads `skills/stop-slop.md` and step 5 scores the draft on the 5-dimension rubric. **You must not let the pipeline INSERT a draft that scores below 35/50.** No "close enough." No "the topic is hard." No "revise once and ship." If after one revision pass the score is still below 35, mark the row as `failed` (see step 2e) with `error = 'stop_slop_floor: scored {n}/50, below 35'` and continue to the next row. The user can `/regenerate` from Telegram if they want a retry; you do not relax the floor.

If during step 2c you notice generate-article.md is about to INSERT without having logged a stop-slop score, **stop the INSERT, mark the row failed with `error = 'stop_slop_skipped: pipeline did not score the draft'`, and continue.** The rubric is a write barrier, not an aspiration.

#### 2d. On success — mark the queue row published

```sql
UPDATE article_queue
SET status = 'published',
    generated_report_id = $1,
    generated_at = now()
WHERE id = $2;
```

Then edit the "writing now" Telegram message via the plugin's `edit_message` tool:

```
✅ Published: *{headline}*
{persona_name} · `{category}`
https://bipinews.com/news/{slug}
```

#### 2e. On failure — mark failed and continue

If anything in step 2c throws (BrightData failure, image sourcing failure, stop-slop floor failure, INSERT failure), do not retry inline — capture the error and move on:

```sql
UPDATE article_queue
SET status = 'failed',
    error = $1
WHERE id = $2;
```

Edit the Telegram message:

```
❌ Failed: *{topic}*
{persona_name} · `{category}`
Error: {short error string, first 200 chars}
```

Then continue to the next claimed row. **Do not exit on a single failure.** A bad image fetch on row 2 should not stop rows 3 and 4 from publishing.

### 3. Final summary

After the claimed batch is done, send one closing Telegram message:

```
🏁 Writer tick complete: {published_count} published, {failed_count} failed.
Queue: {pending_count} pending, {approved_count} approved, {generating_count} in flight.
```

The counts come from quick queries on `article_queue`.

## Stop conditions

- Claimed batch fully processed
- 50 minutes elapsed (must finish before the next `*/20` cron tick — send a timeout note, mark any in-flight row back to `approved` so the next tick retries it, exit)
- Kill switch flipped to `false` mid-run (check between rows; if flipped, finish the current row then exit cleanly)

## What you must NOT do

- **Do not skip the stop-slop pre-flight checks.** Both `skills/stop-slop.md` readability and the `skills/generate-article.md` → `skills/stop-slop.md` link must be verified every tick before any row is claimed. No exceptions.
- **Do not lower the 35/50 stop-slop floor.** Ever. Not for any topic, persona, deadline, or queue backlog. A draft that won't pass after one revision becomes a `failed` row, full stop.
- **Do not let an INSERT happen without a logged stop-slop score.** If you see generate-article.md heading toward step 7 without having done step 5 (scoring), abort and mark the row failed.
- **Do not edit `skills/generate-article.md` to remove the stop-slop reference.** If a future change "for performance" removes step 2 or step 5, the writer's pre-flight check will catch it and refuse to run — that is intentional. Restore the link instead of bypassing the check.
- **Do not duplicate any logic from `skills/generate-article.md`.** Invoke it. Read it. Follow it. Don't paraphrase it.
- **Do not claim more than 3 rows per tick.** The 20-minute cron drains the queue fast enough; processing too many in one tick risks the 50-minute timeout.
- **Do not insert into `news_reports` directly.** The generate-article skill does that as its final step.
- **Do not skip Telegram updates.** Each row gets one "writing now" message that gets edited to either success or failure. If Telegram is down, log to stdout but continue the work.
- **Do not retry a failed row inline.** Mark it `failed`, move on. The user can `/regenerate` it from Telegram if they want.
- **Do not skip the kill-switch check.**
