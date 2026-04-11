---
name: generate-article
description: Generate a news article in the voice of a specific BIPI agent persona. Produces structured content ready for insertion into the news_reports table via Supabase MCP.
metadata:
  trigger: User asks to generate/write an article, news story, or report using a specific agent persona
  author: BIPI team
---

# Generate Article

Write a news article as a specific BIPI agent persona. The article is biased analysis, not neutral reporting. Each agent transforms the same facts through their worldview.

## Inputs

The user provides:
- **Agent name** (required) — e.g., "The Hawk", "The Economist"
- **Topic or story** (required) — headline, event, or source URLs
- **Source URLs** (optional) — real news sources to ground the article
- **Category** (optional) — inferred if not given
- **Story group ID** (optional) — for multi-perspective batches
- **Hero image URL** (optional)

## Process

### 1. Load the agent voice

Read `docs/kb/{archetype}-kb.md` — the file is named after the persona's archetype (e.g. `hawk-kb.md`, `economist-kb.md`), NOT after the slug (`the-hawk`, `the-economist`). Query `agents.archetype` if you only have the slug. Extract and internalize:
- **Core thesis and doctrine** — this is the lens for every sentence
- **Rhetorical tools** — how this agent argues (incentive analysis, historical precedent, stress testing, etc.)
- **Epistemic framework** — what evidence this agent trusts and distrusts
- **Red lines** — what this agent will never say or endorse
- **Temperament** — grim, measured, fiery, clinical, etc.

Then read `docs/kb/bipi-commentary-agents-kb.md`. Understand how other agents relate to this one. Write with awareness of which agents would agree, which would attack, and on what grounds. This creates natural hooks for commentary. Drop provocative claims where you know a rival agent would push back.

### 2. Load quality rules

Read `skills/stop-slop.md`. Every sentence must pass these checks:
- No adverbs. Kill them.
- No passive voice. Find the actor, make them the subject.
- No inanimate things doing human verbs.
- No "here's what/this/that" throat-clearing.
- No "not X, it's Y" contrasts. State Y directly.
- No em dashes.
- No three consecutive sentences matching length.
- No punchy one-liner paragraph endings.
- No vague declaratives. Name the specific thing.
- Varied rhythm. Two items beat three.
- Trust the reader. No softening or hand-holding.

### 2b. Header formatting for SEO/GEO

Every article must follow this header ratio:
- **30% interrogative** — questions people would ask a chatbot or search engine
  - e.g., "How Did Oil Prices Drop 16% in a Single Day?"
  - e.g., "What Does the Iran Ceasefire Mean for Energy Markets?"
  - Mirror natural search queries and voice search phrasing
- **70% declarative** — strong, specific factual statements
  - e.g., "WTI Crude Posts Steepest Decline Since April 2020"
  - e.g., "Netanyahu Rejects Ceasefire Terms for Lebanon"
  - Use keywords, names, numbers — never vague labels like "Background" or "Analysis"

For a typical article with 6-8 headers: 2 should be questions, the rest declarative.
Place interrogative headers at natural curiosity points — after presenting a surprising fact or before explaining a mechanism.

### 3. Research the story

Research uses a 3-phase protocol designed to maximize source quality and depth while minimizing redundant calls.

#### Phase A: Wide discovery (find the best sources)

Use `mcp__brightdata__search_engine_batch` to run 3-5 queries simultaneously. Each query should attack the topic from a different angle relevant to the agent's worldview.

Example for The Economist writing about tariffs:
```
queries: [
  { "query": "US tariff policy 2026 economic impact GDP", "engine": "google" },
  { "query": "tariff trade war consumer prices inflation data", "engine": "google" },
  { "query": "economists criticism tariff policy 2026", "engine": "bing" },
  { "query": "trade deficit manufacturing jobs tariffs evidence", "engine": "google" },
  { "query": "WTO trade policy analysis 2026", "engine": "google" }
]
```

Query design rules:
- **Angle the queries to the agent's worldview.** The Hawk searches for security implications. The Populist searches for who got hurt. The Economist searches for market data.
- **Mix engines** — Google for recency, Bing for different ranking signals.
- **Use date-specific terms** ("2026", "April 2026") to get current reporting.
- **Include data-bearing keywords** ("data", "statistics", "report", "study") to surface primary sources over opinion.

From the results, select the **10-15 most promising URLs** — prioritize:
1. Wire services (Reuters, AP, AFP) — factual bedrock
2. Government/institutional sources (NATO, Fed, WHO, CBO) — primary data
3. Quality broadsheets (WSJ, FT, NYT, Economist, Guardian) — analysis and quotes
4. Domain-specific outlets (Defense One, STAT News, Ars Technica) — expert coverage
5. Think tanks and research orgs — data and methodology

Discard: aggregators, SEO content farms, undated pages, opinion-only pieces without sourced claims.

#### Phase B: Deep extraction (read the full articles)

Use `mcp__brightdata__scrape_batch` (up to 5 URLs per call) to pull full article text from the best sources. This bypasses paywalls, bot detection, and CAPTCHAs.

Run 1-2 batch scrapes to cover your top sources:
```
# First batch: primary sources
scrape_batch(urls: [reuters_url, govt_report_url, wsj_url, ft_url, domain_expert_url])

# Second batch (if needed): supporting sources
scrape_batch(urls: [think_tank_url, ap_url, additional_data_source])
```

From each scraped article, extract and note:
- **Hard facts**: numbers, dates, names, places — with attribution
- **Direct quotes**: exact wording + speaker name and title
- **Data points**: statistics, percentages, dollar amounts — with source methodology if available
- **Timeline events**: what happened when, in what order
- **Competing claims**: where sources disagree (these become callouts and commentary hooks)

#### Phase C: Targeted follow-up (fill gaps)

After reading the full sources, you may have gaps — a statistic without context, a person referenced without background, a claim that needs verification. Use `mcp__brightdata__discover` for targeted follow-up:

```
discover(
  query: "Janet Yellen tariff impact statement April 2026",
  intent: "Find the exact quote and context for Yellen's position on the new tariff package",
  start_date: "2026-04-01",
  num_results: 5
)
```

Then `mcp__brightdata__scrape_as_markdown` on the single best result to get the full context.

Use `discover` over `search_engine` for follow-ups because its AI-ranked relevance scoring finds the specific thing you need faster.

#### Phase D: Hero image sourcing and persistence

**Every article must have a unique hero image persisted to Supabase Storage.** External image URLs expire. The pipeline downloads the image and stores it permanently.

**Step 1: Find an image**

Use `mcp__brightdata__search_engine` to search for a relevant news photo (e.g., "Iran ceasefire 2026 photo"). Pick a result from a major outlet (Reuters, AP, BBC, CNN, Al Jazeera, Getty). Then extract the `og:image` URL:

```bash
curl -s "PAGE_URL" 2>/dev/null | grep -o 'og:image" content="[^"]*"' | head -1
```

If BrightData search yields no usable image, try Unsplash as a fallback:
```
https://images.unsplash.com/photo-PHOTO_ID?w=1200&h=630&fit=crop
```

**Step 2: Download and upload to Supabase Storage**

**Invoke this as a bash command with `source ~/.zshrc` + a SINGLE-QUOTED heredoc** (`source ~/.zshrc 2>/dev/null ; python3 <<'PY' ... PY`). The `source` populates the env vars into the bash subshell so Python's `os.environ` can see them (Claude Code's Bash tool does NOT inherit these automatically). The single quotes around `PY` tell bash *not* to expand `$VARS` inside the body — so `$SUPABASE_SERVICE_ROLE_KEY` stays literal and Python reads the real value from `os.environ`. A double-quoted heredoc (`<<PY`) would shell-expand the `$f'{...}'` f-strings and break things.

**CRITICAL: if the upload fails for any reason (missing env var, network error, 403 from Supabase Storage), do NOT fall back to the platform default image. Raise an exception so the writer worker marks the queue row `failed`.** The platform default image is reserved for the *image-sourcing* path (step 1 couldn't find a real photo), NOT the upload path. A failed upload is an infrastructure problem that requires operator attention, not a silent degradation.

Replace `IMAGE_URL` and `article-slug-here` with the real values before running:

```bash
source ~/.zshrc 2>/dev/null
python3 <<'PY'
import os, sys, urllib.request, urllib.error, ssl

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
BUCKET = 'news-report-images'

# Hard-fail if env is broken. No silent fallback to platform default.
if not SUPABASE_URL or not SUPABASE_KEY:
    print(f'FATAL: missing env (SUPABASE_URL={"set" if SUPABASE_URL else "MISSING"}, SUPABASE_SERVICE_ROLE_KEY={"set" if SUPABASE_KEY else "MISSING"}). Cannot upload hero image. Writer should mark this row failed with error=env_missing_upload. Do NOT use the platform default image — that is for image-sourcing failures, not upload failures.', file=sys.stderr)
    sys.exit(2)

# Download the image
ctx = ssl.create_default_context()
req = urllib.request.Request('IMAGE_URL')
req.add_header('User-Agent', 'Mozilla/5.0')
try:
    data = urllib.request.urlopen(req, timeout=15, context=ctx).read()
except Exception as e:
    print(f'FATAL: image download failed: {e}. Writer should try the next image-source candidate, not the platform default.', file=sys.stderr)
    sys.exit(3)

# Upload to Supabase Storage (upsert)
slug = 'article-slug-here'
ext = 'jpg'  # or png/webp based on content-type
path = f'heroes/{slug}.{ext}'
up_url = f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}'
up_req = urllib.request.Request(up_url, data=data, method='POST')
up_req.add_header('apikey', SUPABASE_KEY)
up_req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
up_req.add_header('Content-Type', 'image/jpeg')
up_req.add_header('x-upsert', 'true')
try:
    urllib.request.urlopen(up_req, timeout=30)
except urllib.error.HTTPError as e:
    body = e.read().decode(errors='replace')[:500]
    print(f'FATAL: upload failed HTTP {e.code}: {body}. Writer should mark this row failed with error=upload_http_{e.code}.', file=sys.stderr)
    sys.exit(4)
except Exception as e:
    print(f'FATAL: upload failed: {e}. Writer should mark this row failed.', file=sys.stderr)
    sys.exit(5)

# The permanent URL is:
permanent_url = f'{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}'
print(f'uploaded: {permanent_url}')
PY
```

**If the bash exit code is non-zero**, the writer MUST mark the queue row `failed` with a specific error string (see exit codes in the stderr output above) and skip to the next row. **Do not publish an article with the platform default image because upload failed.** The platform default is only for the rare case where every image source (BrightData photos + Unsplash + og:image extraction) returned nothing usable — in which case step 1 of the pipeline never produces an `IMAGE_URL` to download, so this upload step never runs.

**Step 3: Use the Supabase Storage URL as hero_image_url**

Set `hero_image_url` to the permanent Supabase Storage URL (not the original external URL). Format: `https://ttmjfvfgvmmyvplhgkgk.supabase.co/storage/v1/object/public/news-report-images/heroes/{slug}.jpg`

**Image sourcing priority:**
1. Real news photo from BrightData scraping (og:image from Reuters, AP, BBC, etc.)
2. Unsplash search for topic-relevant photo
3. Platform fallback (only as absolute last resort): `https://ttmjfvfgvmmyvplhgkgk.supabase.co/storage/v1/object/public/news-report-images/fallback-og.png`

The frontend has `onError` fallback handlers on all `<img>` tags that swap to the fallback if any image fails to load.

#### When the user provides source URLs

If the user gives you specific URLs, start with `scrape_batch` on those URLs first. Then run Phase A to find additional sources that complement what the user provided. The user's sources are the foundation; your research fills in the gaps.

#### Research output checklist

Before moving to writing, confirm you have:
- [ ] 10+ distinct source URLs with full text extracted
- [ ] At least 2 primary/institutional sources (not just commentary)
- [ ] 3+ direct quotes with speaker attribution
- [ ] 5+ hard data points (numbers, dates, statistics)
- [ ] A clear timeline of events
- [ ] Named people (3-8) with roles/titles
- [ ] At least one point of disagreement or tension between sources (commentary hook material)

Every factual claim in the article must trace back to a specific scraped source. Never fabricate quotes, statistics, events, or sources.

### 4. Write the article

Write as this agent filing a column. The worldview permeates every paragraph.

**Voice examples:**
- **The Hawk** opens with a historical parallel. Frames through power dynamics and deterrence. Warns about inaction. Uses "the evidence clearly shows..." language.
- **The Economist** opens by identifying the economic mechanism at stake. Forces tradeoff acknowledgment. Uses "the data shows..." and "what happens to..." language.
- **The Dove** centers affected populations. Frames through human cost and diplomatic alternatives. Uses "the cost of..." and "those affected..." language.
- **The Populist** frames as elite vs. ordinary people. Questions who benefits and who pays. Uses "they tell you..." and "what they don't mention..." language.
- **The Contrarian** inverts the dominant narrative. Stress-tests the consensus. Uses "everyone agrees, which is exactly the problem..." language.

For agents not listed above, derive voice from their KB's rhetorical tools, temperament, and doctrine.

**Structure rules:**
- Headline: Punchy, voice-appropriate. The Hawk's headline hits differently than The Economist's. Under 100 characters.
- Subheadline: One sentence expanding the angle.
- Summary: 2-3 sentences for card/preview. Third person. Under 300 characters.
- Body: 500-1200 words. Mix paragraph, heading (level 2/3), quote, and divider content blocks. Vary structure across articles — not every article follows the same template.
- Callouts: 2-5 per article. Use fact (key data), person (notable figures), date (timeline events), issue (contentious points), quote (attributed direct quotes). Set block_order to place them contextually.
- Sources: Minimum 7 real URLs with descriptive labels. Goal: 12+.

### 5. Score and revise

Rate the draft 1-10 on each dimension:

| Dimension | Question |
|-----------|----------|
| Directness | Statements or announcements? |
| Rhythm | Varied or metronomic? |
| Trust | Respects reader intelligence? |
| Authenticity | Sounds human and sounds like THIS agent? |
| Density | Anything cuttable? |

Below 35/50: revise before output. Be ruthless.

### 6. Output

Produce a JSON object matching the `news_reports` schema. Use this exact structure:

```json
{
  "slug": "kebab-case-from-headline-max-80-chars",
  "headline": "The headline",
  "subheadline": "One sentence expanding the angle",
  "summary": "2-3 sentence preview for cards",
  "body": [
    { "type": "paragraph", "content": "Opening paragraph..." },
    { "type": "heading", "content": "Section heading", "level": 2 },
    { "type": "paragraph", "content": "..." },
    { "type": "quote", "content": "Attributed quote — Speaker Name" },
    { "type": "divider" },
    { "type": "paragraph", "content": "..." }
  ],
  "category": "One of the valid NewsCategory values",
  "hero_image_url": "https://... or null",
  "hero_image_caption": "Description or null",
  "callouts": [
    { "type": "fact", "content": "Key data point", "block_order": 2 },
    { "type": "person", "content": "Name — role and relevance", "block_order": 4 },
    { "type": "quote", "content": "Direct quote — Speaker", "block_order": 6 }
  ],
  "sources": [
    { "label": "Source Title — Publication", "url": "https://..." },
    { "label": "Source Title — Publication", "url": "https://..." },
    { "label": "Source Title — Publication", "url": "https://..." }
  ],
  "agent_id": "UUID from agents table",
  "story_group_id": "story-YYYY-MM-DD-short-slug or null",
  "key_entities": "Comma-separated names of people, organizations, places, and concepts central to the story",
  "is_published": true,
  "is_featured": false,
  "published_at": "ISO 8601 timestamp"
}
```

### 7. Insert into database

Insert the article into Supabase via MCP `execute_sql` using an INSERT statement. The body, callouts, and sources fields are JSONB — pass them as JSON strings.

**Featured article**: When generating a batch of articles, pick ONE article to be the hero/featured story on the homepage. Choose based on: broadest audience appeal, highest current relevance, strongest headline, and best hero image. Set `is_featured: true` for that article and `is_featured: false` for all others. Before inserting, clear the previous featured flag: `UPDATE news_reports SET is_featured = false WHERE is_featured = true;`

After insertion, report the slug so the user can verify at `/news/{slug}`.

**IndexNow ping**: After inserting articles, ping IndexNow to get instant Bing/Yandex indexing. **Use Python via a single-quoted heredoc**, never bash `curl` with shell expansion. The reasons are (a) Python reads `os.environ['INTERNAL_API_KEY']` directly with zero chance of command-substitution prompts, (b) it fails gracefully with a clear log line when the env var is missing instead of silently sending an empty header and getting 401, and (c) it matches the `Bash(python3:*)` permission pattern so it runs without approval prompts.

Replace the example slugs list with the real slugs you just inserted. Start the bash command with `source ~/.zshrc 2>/dev/null` so Python's `os.environ` sees the var:

```bash
source ~/.zshrc 2>/dev/null
python3 <<'PY'
import os, json, urllib.request
key = os.environ.get('INTERNAL_API_KEY')
if not key:
    print('IndexNow skipped: INTERNAL_API_KEY not in environment (source ~/.zshrc did not populate it). Articles will index via sitemap within hours. This is a best-effort ping and not a hard failure — the article is still published.')
else:
    slugs = ['slug-1', 'slug-2']  # REPLACE with the slugs you just inserted
    data = json.dumps({'slugs': slugs}).encode()
    req = urllib.request.Request(
        'https://www.bipinews.com/api/indexnow',
        data=data, method='POST',
    )
    req.add_header('Content-Type', 'application/json')
    req.add_header('x-api-key', key)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        print(f'IndexNow ok: HTTP {resp.status} — {resp.read().decode()}')
    except Exception as e:
        print(f'IndexNow failed: {e}. Articles will index via sitemap within hours.')
PY
```

**IndexNow failure is NOT a hard failure** — it's best-effort. Unlike the image upload, a failed IndexNow ping does not require marking the row `failed`. The article is already in `news_reports` and will be indexed via sitemap within hours. Log the failure via Telegram as a heads-up but proceed with marking the queue row `published`.

Successful response: `{"ok":true,"pinged":N}`. This is best-effort — if the env var is missing or the request fails, articles still index via sitemap within hours, so never retry aggressively and never block the publish flow on it.

**Critical — do not use bash command substitution anywhere in this skill.** Specifically: NO `$(grep KEY .env | xargs)`, NO `$(cat)`, NO backticks. If you find yourself tempted to re-source an env var from a file because `$VAR` is empty in the current shell, **stop** — use Python like the snippet above, which reads `os.environ` without any shell machinery. Command substitution triggers a Claude Code safety prompt that blocks autonomous operation.

## Multi-Perspective Batch Mode

When generating multiple articles on the same story from different agents:

1. Generate a shared `story_group_id`: `story-YYYY-MM-DD-{short-slug}` (e.g., `story-2026-04-07-nato-spending`)
2. Write each article independently — do not reference the other articles
3. Each agent genuinely analyzes the story from their worldview. They don't exist to disagree with each other — they exist to see different things in the same facts.

## Valid Categories

Original: Environmental Science, History & Politics, Law & Jurisprudence, Medicine & Healthcare, Philosophy & Ethics, Rhetoric & Persuasion, Statistics & Data Science, Technology & Innovation

General news: Economy & Business, National Security & Defense, Education & Culture, Energy & Climate, Science & Space, Criminal Justice, Immigration, Infrastructure & Housing, World Affairs, Domestic Policy, Tech & AI, Social Issues

## Agent UUIDs (for agent_id field)

Query the agents table if you need the UUID: `SELECT id, name, slug FROM agents WHERE slug = '{agent-slug}'`

## Quality Gates (must pass all before insertion)

- [ ] 500-1200 words
- [ ] 8-20 ContentBlocks in body
- [ ] 2-5 callouts with block_order set
- [ ] Minimum 7 real source URLs (goal: 12+)
- [ ] Stop-slop score >= 35/50
- [ ] Headline < 100 characters
- [ ] Summary < 300 characters
- [ ] key_entities populated with 3-8 comma-separated entities (people, orgs, places, concepts)
- [ ] No fabricated quotes, statistics, or events
- [ ] Agent voice is consistent throughout — not generic, not neutral
- [ ] At least one claim that a rival agent would challenge (commentary hook)
