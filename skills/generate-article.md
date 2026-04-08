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

Read `docs/kb/{agent-slug}-kb.md`. Extract and internalize:
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

#### Phase D: Hero image sourcing and validation

Finding a working, permanent hero image is critical. Many news sites use **signed/tokenized URLs** that expire within minutes (Guardian, AP, Reuters, Getty). These return 401/403 errors after expiration.

**Step 1: Find candidate images**

Use `mcp__brightdata__search_engine` to search for relevant images:
```
search_engine(query: "SpaceX launch 2026 photo", engine: "google")
```

**Step 2: Scrape the source page for og:image**

Use `mcp__brightdata__scrape_as_markdown` on the result page. Look for:
- `og:image` meta tag URL (most reliable)
- Direct image URLs in the page content
- WordPress `wp-content/uploads` URLs (these are permanent)

**Step 3: Validate the URL is permanent (not signed/expiring)**

REJECT image URLs that contain any of these patterns — they are signed and will expire:
- `?s=` or `&s=` followed by a hex hash (Guardian signed URLs)
- `?auth=` or `&auth=` parameters
- `?token=` or `&token=` parameters
- `?sig=` or `&sig=` parameters
- `dims.apnews.com` with long query strings (AP signed CDN)
- `resize=` + `quality=` + `auto=` in query params (CDN transform chains that often include auth)
- Any URL with 5+ query parameters (likely a CDN pipeline with auth)

PREFER image URLs from these permanent sources:
- `wp-content/uploads/` paths (WordPress media — permanent)
- Supabase storage URLs (`supabase.co/storage/`)
- Cloudinary URLs without signatures (`res.cloudinary.com`)
- Static CDN paths without query strings
- Government/institutional image servers
- Wikimedia Commons

**Step 4: Test the URL**

Use `mcp__brightdata__scrape_as_markdown` on the candidate image URL itself. If Bright Data returns an error or the response is not an image, reject it and try the next candidate.

**Step 5: Fallback**

If no permanent image URL can be found after 3 attempts, set `hero_image_url` to the platform fallback:
```
https://ttmjfvfgvmmyvplhgkgk.supabase.co/storage/v1/object/public/news-report-images/fallback-og.png
```

This is better than a broken image. The article page has an `onError` fallback too, but the homepage grid and carousel do not gracefully handle missing images without a URL.

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
