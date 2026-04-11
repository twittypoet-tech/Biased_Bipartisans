# BIPI — Changelog

> Internal maintenance log. Tracks all code changes, bug fixes, and updates.

---

## 2026-04-10

### feat: Automated article generation pipeline (Telegram-driven, local /loop-based)

End-to-end pipeline for ~30 articles/day of scheduled AI-written news analysis, steered from Telegram. The whole loop runs inside one long-running Claude Code session on the user's laptop with the official `telegram@claude-plugins-official` plugin in `--channels` mode. No cloud, no Inngest, no webhook — everything lives in that one session.

**New database tables (migration 00041):**
- `article_queue` — backs the scout → approve → write → publish flow. Statuses: `pending → approved/rejected → generating → published/failed`. Telegram correlation columns (`telegram_chat_id`, `telegram_message_id`) so the console can edit cards in place. Links to `agents(id)` (persona) and `news_reports(id)` (result).
- `feature_flags` — tiny key/value kill-switch table. `article_scout_enabled` and `article_writer_enabled` flip via Telegram (`/pause scout`, `/resume writer`) without a deploy.

**New database tables (migration 00042):**
- `news_threads` — curated ongoing-coverage storylines (Russia-Ukraine war, Israel-Gaza, US 2026 midterms, China-Taiwan, Iran, Trump administration, AI regulation, SCOTUS 2026 term). The scout bypasses the 48h novelty filter for candidates that match an active thread, as long as the candidate brings a genuinely new angle.
- `news_reports.thread_id` + `article_queue.thread_id` — backrefs so the writer can bump `news_threads.last_covered_at` and `total_articles` after publish.

**New skill files (`skills/*.md`):**
- `news-scout.md` — the scheduled scout. Hard 24h recency rule (date-locked queries, `mcp__brightdata__discover` with `start_date = today`, per-candidate date verification, no padding with stale items). 20-category mix balanced between academic + general news. Thread matching for ongoing coverage. Persona rotation per thread.
- `article-writer-worker.md` — atomic-claims approved rows, invokes `generate-article.md` in-session for each (no duplication of the writing logic), enforces 11 hard pre-INSERT quality gates including the ≥7-source minimum and ≥35/50 stop-slop floor, sets `thread_id` on new `news_reports` rows, bumps thread stats on publish, sends Telegram status updates.
- `ops-console.md` — reactive behavior spec for the long-running channel session. Handles inline button callbacks (approve/reject/reassign/edit), all slash commands, free-form English requests, and the reassign/edit interactive flows.

**New docs:**
- `docs/telegram-bot-setup.md` — 8-step setup guide covering BotFather, plugin install, pairing, channel session launch, env vars, and the `/loop`-based scheduling approach.
- `docs/plan/10-article-gen-operations.md` — comprehensive day-to-day operations manual for the next 30 days of running the pipeline.

**What ships with it:**
- Two `/loop` crons (scout 8h, writer 30m) that run inside the channel session
- Telegram approval cards with inline keyboards (fallback to plain-text replies for button-less environments)
- Eight starter `news_threads` seeded active
- 64-char `INTERNAL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` in `~/.zshrc` and `~/.claude/channels/telegram/.env`
- `.claude/settings.local.json` with all required tool permissions pre-approved (no mid-run approval prompts)

**Smoke test results:**
- Published "Two Governments Move Against Anthropic. Both Call It Protection." (The Freeman on Newsom vs Trump on California AI) — 956 words, 14 body blocks, 3 callouts, 13 sources, stop-slop 39/50, Guardian hero image uploaded to Supabase Storage
- First Iran batch: 7 scout cards all linked to `iran-tensions` thread (scout correctly detected the thread and sent 7 not 10 to stay within the storyline), personas rotated (Politician, Hawk, Technocrat, Prosecutor, Scholar, General, Logician). 3 articles published in the first writer drain: "US Delegation Arrives in Pakistan for Iran Talks With 'Low Expectations'" (Politician, 13 sources), "The Ceasefire Is a Press Release; the Strait of Hormuz Is a Waterway" (Technocrat, 14 sources), "Iran Brings Munich to Islamabad and Calls It Diplomacy" (Hawk, 12 sources). All linked to `iran-tensions` thread.

### fix: Five real bugs caught and patched during smoke test

1. **`agents.status = 'active'` is wrong.** The actual enum is `official | guest | sandbox`. Scout, writer, and ops-console queries all updated to `status = 'official' AND role NOT IN ('moderator', 'reporter')` so The Moderator, The Reporter, The Wire, and The Commentary Host are excluded from article authorship.

2. **`docs/kb/{slug}-kb.md` is the wrong filename pattern.** Actual files are named after the archetype, not the slug (`hawk-kb.md` not `the-hawk-kb.md`). Generate-article.md, news-scout.md, and article-writer-worker.md all corrected to use `docs/kb/{archetype}-kb.md` with an explicit disambiguation note.

3. **IndexNow ping dropped the POST body on 301 redirects.** The site canonical is `www.bipinews.com` but the old curl hit the bare `bipinews.com`, got a 301, and `curl -L` (default) converted the POST to a GET, losing the body. Server then returned `400 Invalid JSON`. Fix: use `--post301 -L` AND hit `www.` directly. Then rewrote entirely as a Python single-quoted heredoc that reads `os.environ['INTERNAL_API_KEY']` directly — no bash command substitution at all, no `export $(grep ...)`, no silent empty headers. Fails gracefully with a log line when the key is missing.

4. **Three slash commands are reserved by the Telegram plugin server.** `/start`, `/help`, `/status` are intercepted by the plugin's built-in command handlers (`grammy` registrations at `server.ts:639-674`) and never reach the Claude LLM session. The ops-console replacements are `/state` and `/commands`. Plain English also works as a fallback for any command.

5. **The telegram plugin's `.mcp.json` uses bare `bun` and a bash-subshell-spawning `start` script.** Two problems: (a) Claude Code's MCP spawn doesn't inherit `~/.bun/bin` on PATH, so bare `bun` fails; (b) even with the absolute path, the `bun run start` script does `bun install --no-summary && bun server.ts`, and the `&&` spawns `/bin/bash` which also doesn't have bun on PATH. Both patched by changing the plugin's `.mcp.json` to `/Users/macbot/.bun/bin/bun ${CLAUDE_PLUGIN_ROOT}/server.ts` — skips the package.json script entirely. Applied to both `0.0.4` and `0.0.5` versions in the cache. Will need re-applying after future plugin updates.

### fix: SUPABASE_SERVICE_ROLE_KEY hardcoded placeholder in generate-article.md

The Phase D image upload Python snippet previously had `SUPABASE_KEY = '...'` as a literal placeholder, requiring manual substitution before every run. Changed to `SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']` which fails loud if the env var is missing (correct behavior) and Just Works when it's set in `~/.zshrc`.

### fix: agent_status enum + KB filename references across the plan

Updated `skills/news-scout.md`, `skills/article-writer-worker.md`, and `skills/ops-console.md` to use the correct `status = 'official'` enum value and `docs/kb/{archetype}-kb.md` filename pattern. The stale `'active'` + `{slug}` convention was only in memory/CLAUDE.md references that apply to different tables (versioned agent_configs).

---

## 2026-04-06 (continued)

### feat: Comprehensive SEO Audit + Fixes
- metadataBase set to biasedbipartisans.com (fixes OG image on Reddit/iMessage shares)
- Organization JSON-LD in root layout (name, url, logo, description)
- Enhanced NewsArticle JSON-LD on reports: articleBody, wordCount, url, articleSection, keywords, author.url
- BreadcrumbList JSON-LD on article pages (Home > Wire > Category > Title)
- news_keywords meta tag on articles from key_entities
- Debate detail pages: added generateMetadata (was completely missing)
- Custom branded 404 page with BIPI mark + links
- Alt text "BIPI" on all logo images across 5 files
- Sitemap expanded: /commentary, /work-with-us/*, /contact, /terms, /privacy
- Home page explicit metadata export

### feat: Admin Route Protection
- Admin layout: server-side role='admin' check via user_profiles
- Non-admin users see "Access Denied" page with lock icon
- Middleware: /admin/* redirects unauthenticated to /auth, /api/admin/* returns 401

### fix: Auth Hydration Flash
- Components check isLoading from useAuth() before rendering auth-dependent UI
- Call Hero: placeholder during load instead of flashing "Sign in"
- Hamburger menu: empty spacer during load
- Dashboard home: skeleton animation during load
- Dashboard header: pulse placeholder for credits/tier badge

### feat: Article View Tracking
- report_views table tracks unique views per IP (hashed) per report
- Denormalized view_count on reporter_calls
- POST /api/reports/[id]/view — records view on page load
- Engagement bar: eye icon + view counter, removed "0 Comments" button
- Summarize button moved above article body (gold, visible mobile + desktop)
- "Collapse" option below summary card

### feat: Site Footer, Terms of Service, Privacy Policy
- 4-column editorial footer: Platform, Company, Account, Legal (17 internal links)
- Responsive: 2-col on mobile with dock clearance (pb-24)
- Terms of Service: 16 sections (AI disclaimer, credits, IP, arbitration, liability)
- Privacy Policy: 11 sections (data collection, third-party sharing, CCPA/GDPR, security)
- Third-party services described by category, not named (protects stack)
- Contact form: saves to DB + sends email via Brevo to contact@biasedbipartisans.com

### feat: Promotional Callouts in Articles + Home Page
- 3 gold-background sponsored cards distributed within article body
- Slot 1: Sign Up (anon) / Share with Friend (auth)
- Slot 2: Upcoming tournament (real title from DB)
- Slot 3: "Think Further on BIPI" brand banner
- Home page: full-width CTA for anon users before wire feed
- All cards: bipi logo + "Sponsored" badge header, black text on gold

### feat: Failed Report Handling
- Webhook refunds 5 credits when report_delivered=false or quality≠Complete
- Dashboard shows red error card with original query + "Try Again" CTA
- credit_transactions reason enum expanded with 'refund'

### fix: Journalist Wire Publishing
- Journalist reports default to wire_status='none' (was 'auto')
- Journalists click "Publish to Wire" → instant publish (wire_status='auto')
- Subscribers click "Request Publish to Wire" → pending admin approval

### feat: Personalized Reporter Presets
- GPT-4o-mini generates 8 tailored search queries per user daily
- Inngest dailyPresetGeneration cron (6am UTC)
- On-demand refresh for 1 credit via /api/presets/generate
- My Reports: horizontal carousel + "Refresh Suggestions" button
- Home page: mobile stacked carousels, desktop tab switcher
- Call Hero reads ?query= URL param on mount

### feat: Persistent Vote Tracking
- reporter_call_votes + commentary_votes tables (unique per user)
- POST /api/reporter/vote — upsert + recalculate denormalized counts
- GET /api/reporter/votes — batch fetch user votes for wire feed
- Commentary votes require auth + track user
- Toggle behavior: same direction removes vote

### feat: Commentary Feed (/commentary) + Agent Profile Updates
- New tab between Home and Debates
- Twitter-style feed of all agent commentary with report banners
- Agent profile: Commentary tab, rivals card with names/avatars/relationship tags
- Category banner + full headline on commentary posts

### feat: Category Banners, Related Reports, Commentary Permissions
- Full-width category banners on cards + article pages (replace pills)
- Related Reports horizontal carousel (entity/query/category scoring)
- Commentary CTA gated by role (subscribers: own reports only)
- Commentary delete for report owners (soft-delete)
- User role in auth context client-side

### feat: Stripe Integration + Credit System
- Products: Pro ($25/mo), 100/500/1000 credit packs
- /api/stripe/checkout, /api/stripe/portal, /api/webhooks/stripe
- Full lifecycle: checkout → renewal → cancellation → pause → resume
- deduct_credits RPC function (atomic with balance check)
- Inngest weekly free refill (5cr) + monthly pro refill (100cr)
- Subscribe page: all CTAs wired to live Stripe Checkout

### feat: Commentary Agent System
- 29 global prompts + 29 KB docs + 812-pair relationship matrix
- Commentary Host transfer agent for Retell call pairing
- Full UX: select → connect → live waveform → done → playback
- Commentary upvotes/downvotes + agent profile running vote count

### feat: User Roles, Wire Filtering, Journalist Program
- user_role enum (subscriber/journalist/admin), wire_status enum
- My Reports dashboard, post-call UX, report owner access
- Investigative Journalists page + application form
- "Independent" → "Investigative" rename

### feat: About Us + Mission Page Rewrite (stop-slop)
- Complete content rewrite: active voice, specific claims, no filler
- What We Built: Reporter (bipartisan) vs 29 Agents (biased)
- "Evidence is the best weapon of truth"
- Mission: specific problem stats, two layers, who it's for

### feat: Sponsor BIPI + Contact Us Pages
- /work-with-us/organizations: 4 placement options, who we work with/decline
- /contact: 8 contact reasons, form saves to DB + emails via Brevo

### fix: Various UX/UI
- Nav header: "Biased Bipartisans" → "BiPi"
- Call Hero: Georgia serif heading, 12+ languages (was 8)
- Mobile: bottom sheets sit above dock nav (bottom-[72px])
- Mobile: language list scrollable, no search input zoom
- Mobile: textarea 16px prevents iOS zoom
- Auth: unified flow (removed sign-in/sign-up toggle)
- Email: removed min-height:100vh causing infinite scroll

---

## 2026-04-06

### feat: Stripe Integration, Credit System & Weekly Refill

#### Stripe Products (live)
- **BIPI Pro Subscription** — $25/month recurring (`price_1TJI9NECA3vMoocVMb6cSyTx`)
- **100 Credits** — $25 one-time (`price_1TJI9aECA3vMoocVPRjFnXBD`)
- **500 Credits** — $115 one-time (`price_1TJI9bECA3vMoocVVAdBLGJS`)
- **1000 Credits** — $200 one-time (`price_1TJI9cECA3vMoocVKGYBa0PT`)

#### API Routes
- `POST /api/stripe/checkout` — creates Stripe Checkout session (subscription or payment), creates/reuses Stripe customer, stores `stripe_customer_id` on user_profiles
- `POST /api/stripe/portal` — Stripe Customer Portal for subscription management and billing history
- `POST /api/webhooks/stripe` — handles 7 events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`

#### Subscribe Page
- All CTAs wired to live Stripe Checkout (was "Coming soon" stubs)
- Success banner on `?success=true` redirect
- Pro users: "Manage" button opens Stripe Customer Portal
- Loading states on all checkout buttons

#### Credit System Fix
- `deduct_credits` RPC function (migration 00030) — atomic deduction with balance check, replaces fragile try/catch fallback in reporter call + commentary APIs

#### Weekly/Monthly Credit Refill (Inngest)
- `weeklyFreeRefill` — every Monday, free users get 5 credits (capped at 50)
- `monthlyProRefill` — 1st of month, pro users reset to 100 credits
- Both log `credit_transactions` with reason `weekly_free` / `monthly_pro`

---

### feat: User Roles, Wire Filtering & Investigative Journalist Program

#### Database (migration 00027)
- `user_role` enum on `user_profiles`: subscriber, journalist, admin
- `wire_status` enum on `reporter_calls`: none, auto, pending, approved, rejected
- `journalist_applications` table for program intake
- RLS policy prevents users from self-promoting their role

#### Wire Feed Filtering
- Only journalist/admin reports auto-publish to The Wire (`wire_status = 'auto'`)
- Subscriber reports stay in dashboard (`wire_status = 'none'`) unless admin-approved
- Existing published reports backfilled to `wire_status = 'auto'`

#### Dashboard & Report Ownership
- `/my/reports` — functional page showing user's reports with wire status badges
- Post-call UX: "View My Reports" replaces "will appear on The Wire"
- Report owners can view their own reports even if not on wire
- "Request Publish to Wire" button for subscriber-owned reports

#### Investigative Journalists Page
- `/work-with-us/journalists` — program description + dedicated application form
- Fields: name, email, portfolio URL, expertise multi-select, statement
- `POST /api/journalist-apply` — public endpoint, inserts to `journalist_applications`
- Renamed "Independent Journalists" → "Investigative Journalists" in hamburger menu

---

### feat: Commentary System — Full Flow

#### Commentary Agents (29 agents)
- 29 global prompts in `docs/prompts/commentary/`
- 29 KB documents in `docs/kb/`
- 812-pair relationship matrix in `docs/agent-relationships/`
- Commentary Host transfer agent (DB + prompt) — introduces commentating agent
- Multi-agent Retell ID support: `retell_commentary_agent_id`, `retell_call_agent_id` columns (migration 00028)

#### Commentary Request → Live Listening → Playback
- API creates two Retell calls (Commentary Host + Commentary Agent) with agents service relay
- Browser subscribes to shared LiveKit room for live audio
- Full UX flow: select agent → confirm with bio → connecting → live waveform → done
- Webhook auto-publishes transcript + audio to `report_commentary`
- Commentary list auto-refreshes after publish

#### Commentary Permissions
- Subscribers: only see commentary CTA on own reports
- Journalists/Admins: see CTA on all wire reports
- User `role` available client-side via `useAuth().profile.role`

#### Commentary Cards
- Upvote/downvote with net vote count (migration 00029)
- Transcript truncated to 280 chars with "View All" toggle
- Agent avatar + name linked to profile page
- Delete button for report owners (soft-delete via `is_published = false`)
- Running vote count displayed on agent profile Votes stat card

#### Commentary Feed (`/commentary`)
- New tab between Home and Debates in desktop + mobile nav
- Twitter-style feed of all commentary across reports
- Category banner with full report headline, links to report
- Per-post: agent avatar/name, timestamp, transcript, audio player, votes

---

### feat: Article Page Redesign

#### Category Banners
- Full-width category banner at top of report cards (replaces pills)
- Same banner on report detail page (replaces pill badges)
- Removed "Verified Sources" pill

#### Editorial Callout Redesign
- **Fact**: Centered pull-stat with gold rules, serif text, "Verified" label
- **Person**: Indented aside with gold vertical rule, small-caps "Who"
- **Date**: Timeline marker with gold dot + connecting line
- **Issue**: Full-width horizontal rules framing italic editorial note
- **Quote**: Large faded gold quotation mark, serif italic pull-quote
- All text sizes bumped, labels in gold (#C8A44A), improved spacing

#### Article Readability
- Paragraph text: 17px, 1.8 line height
- Headline: Georgia serif, 2xl/3xl/4xl
- Section headings: larger with more top margin
- 5-unit paragraph spacing

#### Layout Reorder
- Agent commentary immediately after article body
- Related Reports horizontal carousel (ranked by entity/query/category overlap)
- Sources & entities card below commentary
- Request Commentary CTA at bottom
- Discussion (Reporter Chat) archived

#### Related Reports
- `getRelatedReports` query: scores by entity overlap (+10), query word overlap (+3), same category (+1)
- Horizontal scroll carousel with snap, up to 5 reports
- Each card: category banner, full headline, age

---

### feat: Agent Profile Updates

#### Rivals & Alliances Card
- Agent avatar + name (clickable to profile) via foreign key join
- Relationship type tag (natural_enemy, ally, etc.) as pill in top-right
- Removed respect/rivalry percentages and color-coded backgrounds

#### Commentary Tab
- New tab between Overview and Recent Debates
- Shows agent's commentary with report reference banners, transcript, audio, votes

---

## 2026-04-04

### feat: Phase 7 — Credit Gating & Top-Up Flow

#### Credit enforcement
- `/api/reporter/call`: Requires authentication (401) + 5 credits (402 if insufficient). Deducts credits on call creation, logs `credit_transactions` with reason `report` and reference to `call_id`. Returns `creditsRemaining` in response.
- `/api/votes`: Requires authentication. Uses `user.id` as voter ID instead of anonymous IP hash.
- `call-hero.tsx`: Shows "Sign in" link when not authenticated. Displays credits badge in composer toolbar when logged in. Refreshes profile after call completes to update credit count. Catches 402 responses and shows TopUpModal instead of generic error.

#### Top-up credits modal (`top-up-modal.tsx`)
- Triggered on insufficient credits (402 from reporter call API)
- Shows balance / needed / deficit in a 3-column stat card
- "Get Credits" CTA → `/subscribe`
- Pro upsell card for free users ("100 credits/month for $25")
- Spring animation, backdrop blur, mobile bottom-sheet pattern

#### Subscribe page — pro-awareness
- Pro members: compact status bar at top ("You're on Pro, X credits remaining") with Manage button. Buy Credits section is primary focus.
- Free users: full Pro card with features shown first, Buy Credits below.

#### `useIsProUser()` hook
- Wired to real `profile.tier === 'pro'` check in `pro-upgrade-modal.tsx`

---

### feat: Bipi Onboarding Agent — Interest Discovery via Live Call

- New Retell agent "Bipi" (`agent_dc30d418ef88204e5452f1eed5`) for conversational interest discovery
- `/api/onboarding/call`: Creates direct 1-on-1 Retell web call, passes `user_id`, `user_name`, `existing_interests` as dynamic variables
- Webhook handler: Routes onboarding calls to `handleOnboardingCall()`, extracts `user_interests` + `interest_entities` from post-call analysis, updates `user_profiles.interests`
- Uses `retell-client-js-sdk` `RetellWebClient` for proper two-way voice (microphone + speaker)
- Settings page (`/my/settings`): replaced static 8-category picker with "Personalize with Bipi" call CTA, inline call flow, shows interests as amber pills
- Agent prompt reference: `docs/prompts/bipi-onboarding-agent.md`

---

### feat: Subscribe Page Redesign

- Conversion-focused Pro card: AI-Powered tailored reports, 20 reports/month, unlimited algorithm refinements, multi-lingual, 1-on-1 calls
- Credit tiers with expandable value breakdown (chevron toggle per row):
  - 100 credits ($25): 20 reports / 1.5 hours agent call time
  - 500 credits ($105): 100 reports / 7.5 hours, save 16%
  - 1,000 credits ($200): 200 reports / 15 hours, save 20%

---

### feat: Vercel Web Analytics + Google AdSense

- `@vercel/analytics` installed, `<Analytics />` component in root layout
- Google AdSense meta tag (`ca-pub-3338044547412009`) in root layout
- AdSense script loaded only on `/reports/[slug]` pages (lazyOnload strategy)
- Two ad placements: after summary (horizontal) and after transcript (auto)
- `AdSlot` component for reusable ad insertion

---

### feat: User Auth, Credits System, Dashboard & Navigation Overhaul

#### Database — Migration `00024_user_auth.sql`
- **`user_profiles`** — extends Supabase Auth `auth.users` with `tier` (free/pro), `credits` (default 10), `interests` (TEXT[]), Stripe fields, timestamps
- **`credit_transactions`** — audit log: signup_bonus, weekly_free, monthly_pro, purchase, report, commentary, agent_call
- **`user_reports`** — links users to their generated reports (favorite toggle, unique per user+report)
- Added `user_id` FK to `reporter_calls` and `report_comments`
- Auto-create profile trigger: on `auth.users` INSERT → creates `user_profiles` row + logs 10 signup credits
- RLS: users read/update own profile, public reads display names, users manage own reports/transactions

#### Auth System
- `@supabase/ssr` cookie-based clients (server.ts + client.ts)
- `middleware.ts`: refreshes sessions, protects `/my/*` routes (redirect to `/auth`)
- `AuthProvider` context: exposes `user`, `profile`, `isLoading`, `signOut`, `refreshProfile`
- `/auth` page: email input → 6-digit OTP code → inline verification → redirect to `/my`
  - Auto-focus, paste-friendly code inputs, auto-submit on 6 digits
  - Sign In / Create Account toggle

#### Navigation Overhaul
- Branding: "Bipi AI Debate" → "Biased Bipartisans" (desktop + mobile)
- Full-screen hamburger menu (both mobile + desktop):
  - About Us: "What is Biased Bipartisans?", "Our Mission: Think Further"
  - Work With Us: "Independent Journalists", "Companies and Organizations", "Contact Us"
  - Buy BIPI: "Buy Credits"
  - Auth state: Sign In/Subscribe buttons OR profile/credits/dashboard/sign-out
- Desktop header: keeps inline nav links + adds Sign In, Subscribe, hamburger
- Mobile header: brand left-aligned, hamburger right-aligned
- `HeaderAuthButtons`: credits badge + avatar when logged in, Sign In + Subscribe when not

#### Pages
- `/auth` — OTP sign-in with email/code steps
- `/subscribe` — Pro card ($25/mo, 100 credits), credit purchase tiers ($0.25→$0.20/credit), Stripe placeholder
- `/my` — Dashboard home: credits card, quick actions, upsell CTAs for free users
- `/my/reports` — Report list (empty state, pending population)
- `/my/settings` — Display name, interests picker (8 topic tags), sign out

#### Email Template
- `docs/email-templates/magic-code.html` — dark theme branded OTP email with amber code, ready for Supabase Auth > Email Templates

---

## 2026-04-03

### feat: Reddit/News-Style Report Detail Page

#### Database — Migrations `00022_report_page.sql` + `00023_sources_json.sql`
- Added `slug`, `transcript`, `report_image_url`, `sources_json` columns to `reporter_calls`
- Backfilled slugs from headlines for existing rows
- Created `report_comments` (threaded, schema-complete, UX empty state)
- Created `report_commentary` + `report_commentary_requests` tables
- RLS: public read, session-based inserts

#### Webhook Updates
- Extracts full transcript from `call.transcript_object` (Retell `call_analyzed` payload)
- Formats transcript as "The Reporter: ..." turns, filters out Caller (Wire Host)
- Generates unique slug from headline before DB insert
- Extracts `sources_with_urls` from post-call analysis → stores as `sources_json` JSONB

#### Report Detail Page (`/reports/[slug]`)
- Hero image (conditional, uses `<img>` for arbitrary external URLs)
- Post header: category badge, verified sources badge
- Headline, author row (Reporter avatar, name, relative time, language, duration)
- Engagement bar: upvote/downvote (functional), comments (static "0"), share (copies URL)
- User query callout, summary, full-width audio player (reuses `NewsAudioPlayer`)
- Full Report body: Reporter-only turns, expandable for long reports
- Structured citations: numbered list with clickable source links (title + URL + hostname), fallback to plain text
- Metadata card: source count, duration, language, key entities as pills
- "Request Commentary" CTA: gradient card with agent selection bottom sheet (pro gate)
- Agent commentary section with audio + transcript
- Comment thread empty state with ghost skeleton + "Sign in" prompt

#### Wire Feed Cards
- `ReporterCallCard` now wrapped in `<Link>` to `/reports/[slug]`
- Vote buttons + audio player have `stopPropagation` to prevent navigation

### fix: Browser Audio Autoplay Edge Cases
- Singleton `AudioContext` (prevents browser limit exhaustion across multiple calls)
- `el.play()` retry after 500ms + periodic 2-second retry interval
- "Tap to Enable Audio" fallback button in live call state
- `room.startAudio()` called after connection

---

## 2026-04-02

### feat: Home Page Chat Hero + Debate Page Hero Migration

Complete UX redesign of the home page and debate page hero sections.

#### Home page — AI Chat Assistant Interface
- Replaced the old hero (HeroShader + CTA buttons) with an AI chat assistant interface for the "Make a Call to Reporter" feature
- Perplexity-inspired composer with progressive disclosure:
  - **Main composer**: clean textarea (~80% of card), minimal toolbar with `[+]` button, language pill, and send button
  - **Mobile: Plus → Bottom sheet** with drag handle, dimmed backdrop, spring animation. Contains horizontal-scroll agent selector with avatars + deep research toggle with iOS-style switch
  - **Mobile: Language → Bottom sheet** with searchable language list, current selection highlighted
  - **Desktop: Plus → Floating dropdown** with agent list + deep research option
  - **Desktop: Language → Floating dropdown** with search
- All secondary controls hidden via progressive disclosure — no visible dropdowns cluttering the default state
- Preset query suggestions: horizontal snap-scroll carousel on mobile, 2-column grid on desktop
- Inline call flow (connecting → live → done → error) replaces the old modal pattern
- Removed old "Make a Call" button + `MakeCallModal` usage from ReporterForum

#### Debate page — HeroShader with search overlay
- Moved the HeroShader (WebGL animated background) from home page to `/debates`
- New copy: "Where AI Agents Battle Ideas"
- Search input + expertise filter button overlaid on the hero
- No changes to search/filter state management — stays in `DebateExploreClient`

#### Database — `reporter_presets` table (Migration `00021_reporter_presets.sql`)
- New table: `id`, `title`, `query_template`, `category`, `sort_order`, `is_active`
- RLS: public read for active presets
- Seeded 8 investigative preset queries: Epstein's Zorro Ranch, CIA MK Ultra, US Democratic Instability, CIA Project Bluebird, Operation Mockingbird, UAP Disclosure Timeline, BRICS De-Dollarization, CBDC Surveillance Concerns
- Query function: `listActiveReporterPresets(db)` in `packages/db/src/queries/reporter-presets.ts`

#### Enhanced dynamic variables (`/api/reporter/call`)
- Now sends `response_language`, `research_mode` ("on"/"off"), and `timezone` as Retell LLM dynamic variables alongside existing `user_query` and `current_date`
- All new fields optional with defaults — backward compatible

#### Shared constants
- Extracted `LANGUAGES` array to `apps/web/src/lib/constants.ts`, used by both `call-hero.tsx` and `make-call-modal.tsx`

#### Removed
- Playlists nav item (both desktop and mobile)
- Old "Make a Call" button from The Wire header
- `MakeCallModal` import from `ReporterForum`

---

### feat: Mobile Dock Navigation + Light/Dark Theme

#### Mobile dock
- Fixed bottom nav bar: Home, Debates, Tourneys, Agents, Theme toggle
- Active route highlighting with amber accent
- Safe-area padding for notched devices (`env(safe-area-inset-bottom)`)
- Hidden on desktop (`md:hidden`)

#### Desktop nav
- Hidden on mobile (`hidden md:block`)
- Added `ThemeToggle` (Sun/Moon icon) to desktop nav

#### Theme system
- `ThemeProvider` with React context, `localStorage` persistence, system preference detection
- `ThemeToggle` component in both desktop nav and mobile dock
- Bottom padding (`pb-20 md:pb-0`) on main content to prevent dock overlap

---

### refactor: Semantic Theme Tokens for First-Class Light Mode

Replaced the "inverted dark mode" approach with a proper semantic token system.

#### Token architecture (`globals.css` + `@theme inline`)
- **Surfaces**: `t-bg` (page), `t-surface` (cards), `t-surface-el` (inputs), `t-surface-inset`
- **Text**: `t-text` (4 tiers: primary, secondary, muted, faint)
- **Borders**: `t-edge`, `t-edge-strong`, `t-edge-muted`
- **Interactive**: `t-hover`, `t-active`, `t-focus`
- **Accent**: `t-accent`, `t-accent-soft`, `t-accent-text`
- **Badge**: `t-badge`, `t-badge-border`
- **Shadows**: `shadow-t`, `shadow-t-lg` (subtle in dark, visible in light)

#### Light mode token values
| Token | Dark | Light |
|-------|------|-------|
| `t-bg` | `#0a0a0a` | `#f8f9fa` (warm off-white) |
| `t-surface` | `#171717` | `#ffffff` (pure white cards) |
| `t-edge` | `rgba(38,38,38,0.6)` | `#e5e7eb` (visible gray-200) |
| `t-text` | `#f5f5f5` | `#111827` (gray-900 high contrast) |
| `t-accent` | `#f59e0b` (amber-500) | `#d97706` (amber-600 for white bg) |

#### Global light mode overrides
- Comprehensive CSS overrides for ALL raw `neutral-*` classes across 51 unmigrated files
- 20+ background variants, 10 text tiers, 16 border variants, 12 gradient overrides
- All hover, focus, group-hover, ring, shadow, divide, placeholder states
- Auto box-shadow on card elements in light mode

#### Colored tint overrides
- All `*-950/opacity` tinted backgrounds (agent heroes, category pills, participant cards) mapped to crisp `*-50`/`*-100` equivalents instead of muddy pastels
- Text colors: `*-400`/`*-200` → `*-600`/`*-700` for readable contrast on light tints
- Colored borders: `*-800/opacity` → `*-200` light equivalents
- Badge backgrounds: `*-900` → `*-100` for crisp light pills
- Covers all 15 color families: red, blue, amber, orange, green, emerald, purple, violet, sky, cyan, pink, indigo, teal, zinc, yellow

#### Migrated components
- Root layout, public layout, mobile dock, theme toggle
- Call hero, reporter forum, reporter call card
- Debate explore client (hero + search/filter)

**Dark mode is pixel-identical** — no dark mode changes.

---

### fix: Browser Audio Autoplay on First Call

#### Problem
First call after page load had no audio. Second call always worked.

#### Root cause
The `fetch('/api/reporter/call')` network request takes 1-3 seconds, which expires the browser's user gesture. By the time LiveKit audio tracks arrive, `autoplay = true` is silently blocked. Previous fix (preloading `livekit-client`) only eliminated ~200ms from a 2-5 second async chain — insufficient.

#### Fix
- **`unlockAudio()`** — runs synchronously at the start of the click handler, before any `await`. Creates an `AudioContext`, calls `resume()`, and plays a silent buffer while the gesture is still valid. This permanently marks the page as "allowed to play audio".
- **`attachAudio()`** — explicitly calls `el.play()` instead of relying solely on `autoplay` attribute
- **`room.startAudio()`** — LiveKit's official audio unlock method, called after connection
- Applied to both `call-hero.tsx` and `make-call-modal.tsx`

---

### Dependencies added
- `lucide-react` — icon library for dock and composer icons
- `clsx` + `tailwind-merge` — `cn()` utility for conditional class merging

---

## 2026-04-01

### fix: Reporter call lifecycle improvements

- **`feat: replace End Call with Leave Call`** — Changed "End Call" to "Leave Call" so the reporter agent continues its report after the user disconnects. Reports complete naturally and appear on The Wire.
- **`fix: revert debate admin end route`** — Restored original admin endpoint for ending debate calls.
- **`fix: use correct Retell API endpoint`** — Fixed the Retell API call for ending calls (was using wrong endpoint).
- **`fix: publish gate`** — Tightened publishing criteria: `report_delivered = true` AND `report_quality = 'Complete'` AND `source_count > 4` required for auto-publish to The Wire.
- **`fix: end-call logging`** — Added diagnostic logging to the end-call route to debug silent failures.
- **`fix: End Call ends both Retell calls`** — Properly terminates both Reporter and Wire Host Retell calls; fixes audio race condition on call cleanup.

---

## 2026-03-28

### feat: News Board

Full news portal feature. Replaces the home page "Playlist / See Debates in Action" section with an editorial News Board. Each report has a dedicated article page with audio playback, structured body content, callout elements, and an Agent Commentary zone.

#### Database — Migration `00018_news_board.sql`

- **`news_reports`** — slug, headline, subheadline, summary, `body` (JSONB array of content blocks), `category` (TEXT with CHECK constraint against the 8 expertise domain values), hero image, audio URL + duration, `is_published` / `is_featured` flags, `callouts` (JSONB), `sources` (JSONB), `published_at`. Partial indexes on published/featured rows.
- **`report_images`** — per-report images with `display_order` int for injection between body blocks. Cascade delete.
- **`agent_commentary`** — voice memo + transcript per agent per report. `is_published` flag. Partial index on published rows ordered by `created_at ASC`.
- **`commentary_requests`** — anonymous session-based requests (matches `audience_messages` pattern — no auth table required). `status` CHECK (`pending` / `fulfilled` / `rejected`).
- RLS: public SELECT on published `news_reports` and `agent_commentary`; open INSERT on `commentary_requests`; service-role ALL on all tables.
- Migration applied to Supabase project `ttmjfvfgvmmyvplhgkgk`.

#### TypeScript types (`packages/shared/src/types/common.ts`)

- `NewsCategory` — union of the 8 exact expertise domain string values
- `ContentBlock` — `{ type: 'paragraph'|'heading'|'quote'|'divider', content, level? }`
- `Callout` — `{ type: 'person'|'fact'|'date'|'issue'|'quote', content, block_order? }`
- `NewsSource` — `{ label, url?, timestamp? }`
- `NewsReport`, `ReportImage`, `AgentCommentary`, `CommentaryRequest`

#### DB query functions (`packages/db/src/queries/news.ts`)

- `listPublishedReports(db, limit?)` — published, `published_at DESC`
- `getFeaturedReport(db)` — featured + published, most recent
- `getReportBySlug(db, slug)` — single published report by slug
- `listReportImages(db, reportId)` — `display_order ASC`
- `listAgentCommentary(db, reportId)` — published only, `created_at ASC`, joined with `agents(name, slug, avatar_url, archetype)`
- `listAllAgentsForCommentary(db)` — all non-moderator agents for the request modal
- `createCommentaryRequest(db, { reportId, agentId, sessionId })` — anonymous insert

#### API route

- `POST /api/commentary-requests` — validates `reportId`, `agentId`, `sessionId`; inserts into `commentary_requests` via Supabase server client

#### Home page (`apps/web/src/app/(public)/page.tsx`)

- Removed `<DebateCardStack />` import and render block (lines 122–141)
- Added `listPublishedReports(db, 8)` to the existing `Promise.all` fetch
- Replaced section with `<NewsBoard reports={newsReports} />`
- Removed now-unused `stackDebates`, `getRecordingUrl`, and `DebateCardStack` import

#### `<NewsBoard />` (`apps/web/src/components/home/news-board.tsx`)

Client component (category filter uses `useState`). Layout:

1. **Featured hero card** — hero image with overlay, headline, subheadline, category badge, summary, "Read Report →" CTA. Falls back to text-only card when no image.
2. **2-card story row** — image thumbnail + headline + category badge.
3. **Secondary headline** — text-forward, no large image; headline + category + summary inline.
4. **Category filter tabs** — "All" + tabs for each category that has grid reports. Active tab uses `expertiseColors` from `agent-colors.ts`.
5. **Filterable grid** — remaining reports in a 1/2/3-col responsive grid.
6. **Empty state** — clean "No reports published yet" panel when `reports.length === 0`.

Category badge colors use the existing `expertiseColors` / `getExpertiseColor()` from `apps/web/src/lib/agent-colors.ts` — no new color system introduced.

#### Article page (`apps/web/src/app/(public)/news/[slug]/page.tsx`)

Server component with `export const dynamic = 'force-dynamic'`. Fetches report, images, commentary, and all agents in parallel. Returns 404 via `notFound()` for unpublished or missing slugs.

#### `<NewsArticleClient />` (`apps/web/src/components/public/news-article-client.tsx`)

Client component. Sections top-to-bottom:

1. **Hero block** — full-width image with gradient overlay (hidden if no image), headline, subheadline, category badge, publish date, audio duration hint.
2. **Audio player** — rendered only when `audio_url` is non-null. Uses `<NewsAudioPlayer />`.
3. **Report body** — `buildBodyNodes()` interleaves content blocks, report images (injected at `display_order` position), and callouts (pinned at `block_order` or auto-distributed evenly). Five callout styles: `person` (blue left-border), `fact` (amber accent), `date` (calendar icon), `issue` (orange warning), `quote` (blockquote).
4. **Sources block** — numbered citations with linked URLs and timestamps.
5. **Commentary divider** — dual gradient rule with center label "Agent Commentary / Opinion & analysis — not editorial".
6. **Agent Commentary zone**:
   - *With commentary:* `<CommentaryCard />` per item — agent avatar/name/archetype badge (uses `archetypeColors`), `<MiniAudioPlayer />` (if audio), collapsible transcript (collapsed by default). Cards ordered `created_at ASC`.
   - *Without commentary:* empty state with "No agents have weighed in yet." copy and "Request Commentary" CTA.
   - "Request more commentary" button persists when commentary already exists.
7. **Modals** — `request` → `<CommentaryRequestModal />`; `upgrade` → `<ProUpgradeModal />`; `success` → inline confirmation panel.

#### `<NewsAudioPlayer />` + `<MiniAudioPlayer />` (`apps/web/src/components/public/news-audio-player.tsx`)

- Full player: play/pause toggle, scrub bar with gradient progress fill, elapsed / remaining time (tabular numerals), speed cycle button (0.75×, 1×, 1.25×, 1.5×). Uses native `<audio>` + React refs; no external dependency.
- Mini player: compact play/pause + progress bar for commentary cards.

#### `<CommentaryRequestModal />` (`apps/web/src/components/public/commentary-request-modal.tsx`)

Bottom-sheet drawer on mobile, centered modal on desktop (`sm:items-center`). Lists all non-moderator agents with avatar, name, archetype (colored via `archetypeColors`). Multi-select checkboxes. Pro gate fires on submit — if `isProUser()` returns `false`, closes and opens `<ProUpgradeModal />` instead of writing to DB. Session ID is persisted in `localStorage` under `bipi_session_id`.

#### `<ProUpgradeModal />` + `isProUser()` (`apps/web/src/components/public/pro-upgrade-modal.tsx`)

- **`isProUser()` always returns `false`** — placeholder until auth/subscriptions are built. Marked with `// TODO` comment.
- Modal: Pro badge, headline, 4-bullet value prop list, "Upgrade to Pro" CTA → `/pricing`, "Maybe later" dismiss.
- `/pricing` route does not yet exist; the link is forward-safe.

#### Build notes

- No new npm dependencies introduced.
- Magic UI MCP was available but not needed — Tailwind + Framer Motion conventions already in the codebase cover all UI needs.
- `requester_session_id` (TEXT) used on `commentary_requests` instead of a `user_id` FK — no users table exists; matches the `audience_messages` anonymous session pattern.
- Pro tier gating is application-layer only per spec. `isProUser()` must be replaced when a subscription system is introduced — flagged in code and here.

---

## 2026-03-27

### feat: Playlists & Tournaments

#### Database — Migration `00017_playlists_tournaments.sql`
- New tables: `playlists`, `playlist_debates`, `tournaments`, `tournament_rounds`, `tournament_matchups`, `agent_trophies`
- New FK columns: `tournament_id` + `playlist_id` on `debates`; `trophy_count` on `agents`
- Full RLS policies (public read, service-role write) + indexes

#### Slug deduplication (`packages/db/src/utils/slugs.ts`)
- `generateUniqueDebateSlug(db, baseSlug)` — checks DB and appends `-2`, `-3`, etc. on collision; prevents unique-constraint crashes on duplicate debate titles
- `generateTournamentDebateSlug(slug, round, matchup)` — deterministic, always-unique tournament debate slug
- Updated `apps/web/src/app/api/admin/debates/route.ts` to use the new DB-aware slug function

#### DB query functions
- `packages/db/src/queries/playlists.ts` — `listPublishedPlaylists`, `getPlaylistBySlug`, `getPlaylistDebates`, `getPlaylistWithDebates`, `getPlaylistDebateCount`
- `packages/db/src/queries/tournaments.ts` — `listTournaments`, `getTournamentBySlug`, `getTournamentRounds`, `getTournamentMatchups`, `getTournamentMatchupByDebateId`, `getAgentTrophies`, `createTournamentDebate`, `advanceTournamentWinner` (race-safe conditional UPDATE), `awardTournamentTrophy`, `isRoundComplete`

#### Admin API
- `POST /api/admin/tournaments` — builds a full bracket: Fisher-Yates seeding, all rounds + matchups created upfront (later rounds first for self-referential FK), `next_matchup_id` wiring, bye handling, round-1 debate creation
- `POST /api/admin/tournaments/[slug]/advance` — manual matchup advance for testing/admin override

#### Inngest jobs
- `advance-tournament-round.ts` — listens to `tournament/matchup-completed`; advances winner to next slot, creates next-round debate when both agents filled, marks round complete, emits `tournament/round-completed` for the final
- `award-trophy.ts` — listens to `tournament/round-completed` (final only); awards champion/finalist/semifinalist trophies, marks tournament completed with `champion_agent_id`
- Updated `post-debate-pipeline.ts` — detects tournament debates via `getTournamentMatchupByDebateId`, determines winner from `composite_score` (fallback: `ai_judge_score`, then `speaking_order`), emits `tournament/matchup-completed`
- Registered both new functions in `apps/jobs/src/index.ts`

#### Frontend (mobile-first, fully responsive)
- `/playlists` — Playlist Hub: themed grid cards with debate count
- `/playlists/[slug]` — Individual playlist: ordered debate list with participant chips and status badges
- `/tournaments` — Tournament listing grouped by status (active/upcoming/completed) with champion display and progress info
- `/tournaments/[slug]` — Bracket page: `TournamentBracket` client component, champion banner, progress bar, round quick-nav
- `/tournaments/[slug]/round-[n]` — Round deep-link: VS layout, agent chips with archetype colors, debate links, round navigation
- `TournamentBracket` component (`apps/web/src/components/public/tournament-bracket.tsx`) — horizontal-scroll bracket, winner highlights, BYE/TBD slots, archetype color accents
- `/debates/[slug]` — Tournament context badge (🏆) + playlist badge (🎵) in debate header
- Nav: added **Tournaments** and **Playlists** links

---

## 2026-03-22

### feat: Composite Scoring (#3) + Public Score Display (#4)

#### Audience Score (`packages/eval/src/audience-score.ts`)
- Extracts standalone 0-1 audience score from `debate_votes` table
- Positive votes: strongest_argument, best_evidence, best_rebuttal, best_concession, round_winner, most_persuasive
- Evasive penalty: most_evasive votes reduce score by up to 15%
- Null when no votes exist (excluded from composite via weight redistribution)

#### Composite Score (`packages/eval/src/composite-score.ts`)
- Weighted average: AI Judge (45%) + Objective (30%) + Audience (25%)
- When a layer is null, weights redistribute proportionally among available layers
- Stored in `agent_eval_runs.composite_score`

#### Pipeline updates
- `run-pipeline/route.ts` now runs 5 steps: Layer 0 → Layer 1 → Layer 2 → Audience → Composite
- `run-ai-judges/route.ts` re-runs all layers + recomputes audience + composite

#### Public score display
- **Debate detail page** — "Performance Scores" sidebar section for ended debates: composite badge + 3-layer breakdown per agent
- **Agent profile page** — "Performance" MiniCard: average composite score + recent debate history (up to 5, linked)
- **Admin evaluations** — audience + composite scores in agent header row

#### DB migration
- `00013_add_composite_audience_scores.sql` — `audience_score` + `composite_score` columns on `agent_eval_runs`

#### New components
- `apps/web/src/components/public/score-display.tsx` — `CompositeScoreBadge` (colored pill) + `LayerBreakdown` (3 meter bars with weights)

---

### feat: Layer 1 AI Judge Panel + Layer 2 Objective Metrics + auto-trigger pipeline

#### `packages/eval` — New shared eval package
- Created `@bipi/eval` workspace package housing all evaluation logic, importable from both `apps/web` and `apps/jobs`
- Moved Layer 0 heuristic scorer (`evaluate-debate.ts`) from `apps/jobs` into the package

#### Layer 1 — AI Judge Panel (`packages/eval/src/ai-judge-evaluate.ts`)
- Multi-LLM judging: intended Claude Sonnet + GPT-4o; currently GPT-4o only (Claude disabled — Anthropic billing workspace issue; TODO comments mark where to restore)
- 5 dimensions per judge: argument strength, logical coherence, evidence quality, responsiveness, rhetorical effectiveness
- Zod-validated JSON output with per-dimension reasoning strings
- Scores stored in `agent_eval_judge_scores` table (migration `00011_add_ai_judge_scores.sql`)

#### Layer 2 — Objective Metrics (`packages/eval/src/objective-metrics-evaluate.ts`)
- 7 dimensions: epistemic discipline, distinctiveness, factual accuracy, direct rebuttal, relevance, consistency, claim support
- Single LLM (GPT-4o; Claude intended once billing resolved)
- Distinctiveness passes full transcript + other debater names for cross-agent comparison
- Scores stored in `agent_eval_objective_scores` table; `objective_score` column added to `agent_eval_runs` (migration `00012_add_layer2_objective_scores.sql`)

#### Pipeline route — `apps/web/src/app/api/admin/debates/[id]/run-pipeline/route.ts`
- Runs all 3 layers sequentially (Layer 0 → 1 → 2)
- Authenticated via `x-internal-key` header; returns 400 if debate not `ended`

#### Auto-trigger on debate end
- `debate-conductor.ts` fires a fire-and-forget POST to `WEB_SERVICE_URL/api/admin/debates/[id]/run-pipeline` when a debate ends
- `WEB_SERVICE_URL` and `INTERNAL_API_KEY` set as Railway env vars on agents service

#### Admin UI (`/admin/evaluations`)
- Layer 2 section: 7 score bars with reasoning tooltips
- `objective_score` in agent header alongside heuristic + AI judge scores
- "Run Evaluation Pipeline" button when no evals exist (`RunPipelineButton` component)
- "Run AI Judges" re-runs Layers 1+2 on demand

#### Supporting changes
- `packages/shared/src/types/common.ts` — `AgentEvalObjectiveScore` type; `objective_score` on `AgentEvalRun`
- `packages/db/src/queries/evolution.ts` — `insertObjectiveScore`, `getObjectiveScoresForEvalRun`, `updateEvalRunObjectiveScore`
- `apps/web/src/app/api/admin/debates/[id]/run-ai-judges/route.ts` — rewritten to call `@bipi/eval` directly (was calling broken jobs service URL)
- `apps/jobs/package.json` — added `@bipi/eval`, removed direct eval deps now in shared package

#### Known issues
- Claude disabled in Layers 1+2 pending Anthropic billing workspace resolution
- `@bipi/jobs` Railway service misconfigured (root dir points to `apps/agents` Dockerfile); all deployments failing

---

## 2026-03-21

### fix: silence moderator LLM during non-moderator turns
- **File:** `apps/agents/src/retell/debate-conductor.ts`
- **Problem:** Moderator's Retell LLM generates speech during debater turns because it hears the full debate audio via AudioRelay broadcast. While AudioRelay correctly drops these frames during live streaming, the moderator's Retell call *recording* captures everything. Since playback uses the moderator's recording, the audience hears moderator talk-over in replays.
- **Fix:** Conductor now injects `current_phase: "LISTENING"` into the moderator on every non-moderator turn (previously only injected the phase label on moderator turns). Moderator's Retell system prompt updated to stay silent when `current_phase` is `LISTENING`.
- **Affects:** Playback recording quality, live debate (moderator no longer generates suppressed audio).

### fix: buffer next-speaker frames to prevent speech chopping
- **File:** `apps/agents/src/retell/audio-relay.ts`
- **Problem:** The early-advance check requires 1000ms of silence (`MIN_SILENCE_BEFORE_HANDOFF_MS`) before watching for the next speaker. If the next speaker's LLM starts generating audio before the 1s gate (common at closing argument transitions where the moderator gives an explicit instruction), those early frames are silently dropped — first words/sentences cut off.
- **Fix:** Added `nextSpeakerBuffer` — when the expected next speaker produces audio frames while the current speaker is silent but < 1000ms, frames are buffered (up to 50 = 1s). When the silence gate opens and early advance triggers, the buffer is flushed to the public room before the triggering frame.
- **Affects:** All turn transitions, especially moderator→debater closing argument handoffs.

### fix: send speaker_change data messages for live speaker highlighting
- **File:** `apps/agents/src/retell/debate-conductor.ts`, `apps/web/src/components/public/debate-room.tsx`
- **Problem:** No speaker highlighting during live debates — browsers had no way to know who was currently speaking.
- **Fix:** Conductor sends `speaker_change` LiveKit data message at each turn start. DebateRoom handles it to update `activeSpeakerId`.

### fix: add diagnostic logging to transcript delivery paths
- **Files:** `apps/web/src/components/public/debate-room.tsx`, `apps/agents/src/retell/live-transcript-poller.ts`, `apps/web/src/lib/supabase/client.ts`
- **Problem:** Live transcript not appearing — all 3 delivery mechanisms (LiveKit data, Supabase Realtime, polling) failing silently with no diagnostics.
- **Fix:** Added error logging to polling query, Realtime subscription error callback, LiveKit data message handler, and Supabase client env var check.
- **Root cause found:** Retell `transcript_object` is only populated after call ends — LiveTranscriptPoller was always a no-op during live calls. Live transcript backlogged (needs Deepgram streaming STT or Retell WebSocket API).

### docs: update 07-todo.md with root cause analysis
- **File:** `docs/plan/07-todo.md`
- **Changes:** Updated audio overlap and speech chopping items with identified root causes, deployed fixes, and remaining actions. Backlogged live transcript with implementation options.

---

## 2026-03-20

### fix: use moderator recording for playback + live transcript polling fallback
- **Commit:** `d03978e`
- **Fix:** Select moderator's recording (full mixed audio) for debate playback by matching against agent ID. Added polling fallback for live transcript delivery.

### fix: advance turn immediately on speaker disconnect + orphan cleanup on startup
- **Commit:** `95ab3c9`
- **Fix:** When a Retell call disconnects mid-turn, advance the turn immediately instead of waiting for the 8s silence timeout. Added orphan call cleanup on scheduler startup.

### fix: always replace live-poller turns with sorted+merged Retell transcripts
- **Commit:** `568ce17`
- **Fix:** `collectTranscripts` now always replaces any turns written by the live poller with the final sorted and merged Retell transcripts, ensuring chronological order.

### fix: correct turn timestamps + recording retry + smarter fallback guard
- **Commit:** `7c269d8`
- **Fix:** Fixed turn timestamp encoding (recording-relative offsets using Unix epoch carrier). Added recording URL retry. Improved fallback guard in collectTranscripts.

### fix: load speakers from debate_participants + fix upcoming card icon
- **Commit:** `a2d26c9`
- **Fix:** DebateCard now loads speaker names from `debate_participants` join instead of hardcoded values. Fixed upcoming debate card icon.

---

## Earlier

### docs: add BIPI master plan and CLAUDE.md project instructions
- **Commit:** `8f3cd8e`
- **Added:** `docs/plan/00-overview.md` through `docs/plan/07-todo.md` — comprehensive project plan covering agent personas, token integration, scoring system, evolution pipeline, architecture, roadmap, and active task tracker. Added `CLAUDE.md` with project instructions.
