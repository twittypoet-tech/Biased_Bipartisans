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

Use **WebSearch** to find current, real reporting on the topic. Run 2-3 queries from different angles to get comprehensive coverage. Use **WebFetch** to read full articles from source URLs.

If the user has enabled **Bright Data MCP**, use it for paywalled or captcha-protected sources.

Every factual claim must be attributable. Never fabricate quotes, statistics, events, or sources.

Collect:
- Key facts and data points
- Named people and their roles
- Timeline of events
- Direct quotes (attributed)
- At least 3 source URLs (goal: 5+)

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
- Sources: Minimum 3 real URLs with descriptive labels. Goal: 5+.

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
  "published_at": "ISO 8601 timestamp"
}
```

### 7. Insert into database

Insert the article into Supabase via MCP `execute_sql` using an INSERT statement. The body, callouts, and sources fields are JSONB — pass them as JSON strings.

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
- [ ] Minimum 3 real source URLs (goal: 5+)
- [ ] Stop-slop score >= 35/50
- [ ] Headline < 100 characters
- [ ] Summary < 300 characters
- [ ] key_entities populated with 3-8 comma-separated entities (people, orgs, places, concepts)
- [ ] No fabricated quotes, statistics, or events
- [ ] Agent voice is consistent throughout — not generic, not neutral
- [ ] At least one claim that a rival agent would challenge (commentary hook)
