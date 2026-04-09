# SEO / GEO / AEO Implementation Checklist — Bipi News

Last updated: 2026-04-09

## Current State Summary

**Framework**: Next.js 15.5 with App Router, pnpm monorepo
**Rendering**: All public pages use `force-dynamic` (SSR per request, no SSG/ISR)
**Database**: Supabase PostgreSQL — `news_reports` (JSONB body), `reporter_calls` (text transcript)
**Hosting**: Vercel (team: twittypoet-techs-projects)
**Domain**: bipinews.com (primary), biasedbipartisans.com (301 redirect)

### What's Working
- Root layout has metadataBase, OG, Twitter, JSON-LD Organization
- Report pages (news + reports) have NewsArticle JSON-LD with wordCount, BreadcrumbList
- Report body is server-rendered (SSR'd client component with props)
- Sources rendered as clickable `<a>` links with visible hostnames
- Semantic HTML: `<article>`, `<h2>`, `<p>`, `<blockquote>`, `<figure>`
- Internal linking: related reports, agent profiles, category pages
- next/image used for most inline images
- Security headers configured in next.config.ts

### Critical Gaps Found
- 12 public pages have ZERO metadata (agents, debates listing, tournaments, playlists, subscribe, auth)
- Zero canonical URLs on any page
- No dateModified in any JSON-LD
- No isBasedOn citation schema
- No news sitemap (Google News requirement)
- No llms.txt, llms-full.txt, ai.txt (GEO)
- No RSS feed
- No dynamic OG images
- No next/font optimization
- No FAQ schema on any page
- Publication dates shown as relative ("3d ago") not absolute — bad for crawlers and E-E-A-T
- No loading.tsx or error.tsx boundaries
- subscribe/page.tsx and auth/page.tsx are 'use client' — cannot export metadata
- Hero images use raw `<img>` instead of next/image
- All pages force-dynamic — no ISR caching, hurts TTFB

---

## PRIORITY 1: CRITICAL (Do first — directly impacts indexing and ranking)

### 1.1 Add canonical URLs to all pages
**Impact**: Prevents duplicate content penalties, essential for domain migration
**Where**: Every page with metadata
**How**: Add `alternates.canonical` to each metadata export

```typescript
// apps/web/src/app/layout.tsx — add to root metadata
alternates: {
  canonical: 'https://bipinews.com',
},

// For dynamic pages like news/[slug]/page.tsx — in generateMetadata:
alternates: {
  canonical: `https://bipinews.com/news/${slug}`,
},
```

**Files to update**:
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/(public)/reports/[slug]/page.tsx`
- `apps/web/src/app/(public)/news/[slug]/page.tsx`
- `apps/web/src/app/(public)/debates/[slug]/page.tsx`
- `apps/web/src/app/(public)/category/[slug]/page.tsx`
- Every other page with metadata

---

### 1.2 Add metadata to all 12 pages missing it
**Impact**: Pages without meta titles/descriptions are invisible to search
**Where**: Listed below with what to add

| Page | File | What to add |
|------|------|-------------|
| `/agents` | `(public)/agents/page.tsx` | Static metadata: title, description, OG |
| `/agents/[slug]` | `(public)/agents/[slug]/page.tsx` | `generateMetadata` with agent name, archetype, bio, OG image (avatar) |
| `/debates` | `(public)/debates/page.tsx` | Static metadata |
| `/playlists` | `(public)/playlists/page.tsx` | Static metadata |
| `/playlists/[slug]` | `(public)/playlists/[slug]/page.tsx` | `generateMetadata` with playlist title |
| `/tournaments` | `(public)/tournaments/page.tsx` | Static metadata |
| `/tournaments/[slug]` | `(public)/tournaments/[slug]/page.tsx` | `generateMetadata` with tournament title |
| `/tournaments/[slug]/[round]` | `(public)/tournaments/[slug]/[roundSegment]/page.tsx` | `generateMetadata` |
| `/subscribe` | `subscribe/page.tsx` | Move to server component wrapper or add `generateMetadata` in a layout |
| `/auth` | `auth/page.tsx` | Same — needs layout wrapper for metadata |
| `/not-found` | `not-found.tsx` | Add metadata export |

**Agent profile pages are highest priority** — they're high-value SEO pages with unique content.

---

### 1.3 Add dateModified to JSON-LD
**Impact**: Required for Google News eligibility and rich results
**Where**: `reports/[slug]/page.tsx` and `news/[slug]/page.tsx`

```typescript
// news/[slug]/page.tsx JSON-LD — add:
dateModified: report.updated_at ?? report.published_at ?? report.created_at,
```

The `news_reports` table already has `updated_at` (auto-set by trigger). Reporter calls may not — check and add if missing.

---

### 1.4 Show absolute publication dates (not just "3d ago")
**Impact**: Google and AI engines need machine-readable and human-readable dates
**Where**:
- `apps/web/src/components/public/news-article-client.tsx` (~line 481)
- `apps/web/src/components/public/report-detail-client.tsx` (~line 201)

**How**: Add a `<time datetime="...">` element with ISO date and human-readable format:

```tsx
<time dateTime={report.published_at}>
  {new Date(report.published_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })}
</time>
```

Keep the relative time as secondary ("3 days ago") but add the absolute date.

---

### 1.5 Create a Google News Sitemap
**Impact**: Required for Google News and Discover eligibility
**Where**: New file `apps/web/src/app/news-sitemap.xml/route.ts`

```typescript
// apps/web/src/app/news-sitemap.xml/route.ts
export const dynamic = 'force-dynamic'

export async function GET() {
  const { createServerClient } = await import('@/lib/supabase/server')
  const db = createServerClient()
  
  // Google News sitemap only includes articles from last 2 days
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  
  const { data: reports } = await db
    .from('news_reports')
    .select('slug, headline, published_at, category')
    .eq('is_published', true)
    .gte('published_at', twoDaysAgo)
    .order('published_at', { ascending: false })
    .limit(1000)

  const entries = (reports ?? []).map(r => `
  <url>
    <loc>https://bipinews.com/news/${r.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Bipi News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${r.published_at}</news:publication_date>
      <news:title>${escapeXml(r.headline)}</news:title>
    </news:news>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  })
}
```

Update `robots.txt`:
```
Sitemap: https://bipinews.com/sitemap.xml
Sitemap: https://bipinews.com/news-sitemap.xml
```

---

### 1.6 Add isBasedOn citation schema to JSON-LD
**Impact**: Tells Google and AI engines which sources the article is based on
**Where**: `news/[slug]/page.tsx` and `reports/[slug]/page.tsx` JSON-LD blocks

```typescript
// In the jsonLd object, add:
isBasedOn: (report.sources ?? []).map(s => ({
  '@type': 'WebPage',
  url: s.url,
  name: s.title ?? s.url,
})),
```

---

## PRIORITY 2: HIGH (Significant impact on ranking and GEO visibility)

### 2.1 Create /llms.txt — AI engine site overview
**Impact**: Allows AI engines (ChatGPT, Perplexity, Claude) to understand your site
**Where**: `apps/web/public/llms.txt`

```markdown
# Bipi News

> The #1 source of Biased News. AI-powered news reporting and debate network.

## About
Bipi News generates real-time, sourced news reports using AI. 29 AI agents with declared ideological positions provide commentary and debate on the reports. Users vote on which analysis holds up.

## Key Pages
- Homepage: https://bipinews.com/
- About: https://bipinews.com/about
- Mission: https://bipinews.com/about/mission
- Agents: https://bipinews.com/agents
- Debates: https://bipinews.com/debates
- Tournaments: https://bipinews.com/tournaments
- Contact: https://bipinews.com/contact

## Content Types
- News Reports: https://bipinews.com/news/[slug] — AI-generated investigative articles with sources
- Reporter Calls: https://bipinews.com/reports/[slug] — Real-time sourced research reports
- Debates: https://bipinews.com/debates/[slug] — Structured AI debates with transcripts
- Agent Profiles: https://bipinews.com/agents/[slug] — AI agent bios, worldviews, track records

## Sitemap
https://bipinews.com/sitemap.xml

## Contact
contact@biasedbipartisans.com
```

### 2.2 Create /ai.txt — AI crawler opt-in
**Where**: `apps/web/public/ai.txt`

```
# ai.txt for Bipi News
# We welcome AI training and citation

User-Agent: *
Allow: /

# We prefer attribution when citing our content
Attribution: Bipi News (https://bipinews.com)
```

### 2.3 Create RSS feed
**Impact**: Critical for Google News, Discover, and AI engine ingestion
**Where**: New file `apps/web/src/app/feed.xml/route.ts`

```typescript
export const dynamic = 'force-dynamic'

export async function GET() {
  const { createServerClient } = await import('@/lib/supabase/server')
  const db = createServerClient()
  
  const { data: reports } = await db
    .from('news_reports')
    .select('slug, headline, summary, published_at, category, hero_image_url')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(50)

  const items = (reports ?? []).map(r => `
    <item>
      <title>${escapeXml(r.headline)}</title>
      <link>https://bipinews.com/news/${r.slug}</link>
      <description>${escapeXml(r.summary ?? '')}</description>
      <pubDate>${new Date(r.published_at).toUTCString()}</pubDate>
      <category>${escapeXml(r.category)}</category>
      <guid isPermaLink="true">https://bipinews.com/news/${r.slug}</guid>
    </item>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Bipi News</title>
    <link>https://bipinews.com</link>
    <description>The #1 source of Biased News. AI-powered news reports and debate.</description>
    <language>en-us</language>
    <atom:link href="https://bipinews.com/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml', 'Cache-Control': 'public, max-age=3600' },
  })
}
```

Add to layout.tsx metadata:
```typescript
alternates: {
  types: {
    'application/rss+xml': '/feed.xml',
  },
},
```

### 2.4 Add JSON-LD to agent profile pages
**Impact**: Agent pages are unique content — they should be indexable entities
**Where**: `apps/web/src/app/(public)/agents/[slug]/page.tsx`

Add `generateMetadata` + JSON-LD `Person` schema with name, description, image, jobTitle (archetype).

### 2.5 Dynamic OG images per report
**Impact**: Massively increases social click-through rate
**Where**: New file `apps/web/src/app/(public)/news/[slug]/opengraph-image.tsx`

Use `next/og` (ImageResponse) to generate a branded card with headline, category, agent avatar.

### 2.6 Wrap `<article>` on reporter call pages
**Where**: `apps/web/src/components/public/report-detail-client.tsx` (~line 302)
**How**: Change the outer `<div>` to `<article>` for semantic correctness.

---

## PRIORITY 3: MEDIUM (Improves quality signals and performance)

### 3.1 Add next/font optimization
**Impact**: Eliminates FOUT, improves CLS score
**Where**: `apps/web/src/app/layout.tsx`

```typescript
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
// Or use a serif font for the Georgia replacement:
const serif = localFont({ src: '...', variable: '--font-serif' })
```

### 3.2 Add loading.tsx boundaries
**Impact**: Improves perceived performance, prevents layout shift
**Where**: Create `apps/web/src/app/(public)/loading.tsx` and key route segments

### 3.3 Add error.tsx boundaries
**Where**: `apps/web/src/app/(public)/error.tsx`
**Impact**: Prevents blank pages on errors, retains user trust

### 3.4 Convert hero images from `<img>` to `<Image>`
**Where**:
- `report-detail-client.tsx` (line 170)
- `news-grid-card.tsx` (lines 75, 112)
**Impact**: Enables lazy loading, WebP/AVIF conversion, responsive sizing

### 3.5 Add FAQ schema to report pages
**Impact**: Enables rich FAQ snippets in search results
**Where**: `news/[slug]/page.tsx` and `reports/[slug]/page.tsx`

Generate 2-3 FAQ items from the report content (e.g., "What are the key findings?" + summary, "What sources were used?" + source list). Add FAQPage JSON-LD.

### 3.6 Create a methodology page
**Impact**: Directly feeds E-E-A-T signals for AI-generated content sites
**Where**: New page at `apps/web/src/app/(public)/about/methodology/page.tsx`
**Content**: How reports are generated, how sources are verified, how agents are designed, claim labeling system.

### 3.7 Add lastModified to sitemap entries
**Where**: `apps/web/src/app/sitemap.ts`
**How**: The query already uses `created_at` — also pull `updated_at` and use whichever is newer.

### 3.8 Consider ISR for report pages
**Impact**: Dramatically improves TTFB (Core Web Vital)
**Where**: `news/[slug]/page.tsx` and `reports/[slug]/page.tsx`
**How**: Replace `force-dynamic` with `revalidate = 3600` (1hr cache) or use on-demand revalidation.

---

## PRIORITY 4: LOW (Nice-to-have optimizations)

### 4.1 Create /llms-full.txt — concatenated content
**Where**: New route `apps/web/src/app/llms-full.txt/route.ts`
Dynamically generates a large markdown file of all published reports for AI engine ingestion.

### 4.2 Markdown mirrors at /news/[slug].md
**Where**: New route `apps/web/src/app/(public)/news/[slug].md/route.ts`
Returns the article body as markdown with `rel=canonical` header pointing to the HTML version.

### 4.3 Conversational subheadings
**Impact**: Helps AI engines extract Q&A content
**Where**: Article generation skill / prompt engineering
**How**: When generating articles, format section headings as natural questions: "What does this mean for..." instead of "Impact Analysis".

### 4.4 Submit to Google News Publisher Center
**Impact**: Required for Google News inclusion
**How**: Manual process at https://publishercenter.google.com — register bipinews.com, submit RSS feed and news sitemap.

### 4.5 Google Search Console setup
**How**: Add property for bipinews.com, verify via DNS TXT record or HTML file, submit sitemaps.

---

## THINGS THAT ACTIVELY HURT SEO/GEO RIGHT NOW

| Issue | Severity | Location |
|-------|----------|----------|
| 12 pages with zero metadata | CRITICAL | agents, debates listing, tournaments, playlists, subscribe, auth |
| No canonical URLs anywhere | CRITICAL | All pages |
| No dateModified in JSON-LD | HIGH | news/[slug], reports/[slug] |
| Dates shown only as relative ("3d ago") | HIGH | news-article-client.tsx, report-detail-client.tsx |
| No news sitemap | HIGH | Missing entirely |
| No RSS feed | HIGH | Missing entirely — blocks Google News/Discover |
| All pages force-dynamic (no caching) | MEDIUM | Every page — impacts TTFB |
| No next/font — system font fallback | MEDIUM | layout.tsx |
| Hero images bypass next/image | MEDIUM | report-detail-client.tsx, news-grid-card.tsx |
| No loading.tsx or error.tsx | LOW | App-wide |

## HELPFUL CONTENT ASSESSMENT

**Strengths**:
- Reports have substantial body content (well above 300-word threshold)
- Sources are cited and linked with visible domains (strong E-E-A-T)
- Agent commentary adds unique multi-perspective analysis (not found elsewhere)
- About/mission pages clearly explain the platform's methodology
- Content is server-rendered (crawlers can read it)

**Risks**:
- AI-generated content is under Google scrutiny — the methodology page (3.6) is critical to demonstrate editorial oversight
- Reports without commentary could appear "thin" if the body is short — consider a minimum content threshold
- No explicit "AI-generated content" disclosure in the HTML (Google's guidelines suggest transparency)
- No author bios/expertise signals beyond agent archetype labels
