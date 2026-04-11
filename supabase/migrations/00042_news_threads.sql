-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00042: news_threads
--
-- Some stories need ongoing coverage even when we just covered them recently:
-- wars, elections, major court cases, sustained crises. The default scout
-- novelty filter (drop if covered in last 48h) would silently kill these.
--
-- A news_thread is a curated, named storyline. The scout matches candidate
-- stories against active threads via keyword overlap. Thread matches bypass
-- the standard 48h dedup, but the scout still requires the candidate to bring
-- a genuinely new angle vs the most recent thread coverage.
--
-- The user manages the thread list via Telegram commands routed through
-- skills/ops-console.md.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE news_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  -- Lowercase phrases the scout matches against headline + summary + topic
  -- (any one match counts as a thread hit)
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Set by article-writer-worker after a successful publish
  last_covered_at TIMESTAMPTZ,
  total_articles INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_news_threads_active ON news_threads(slug) WHERE is_active = true;

-- Link news_reports back to threads (nullable: standalone articles still allowed)
ALTER TABLE news_reports ADD COLUMN thread_id UUID REFERENCES news_threads(id) ON DELETE SET NULL;
CREATE INDEX idx_news_reports_thread ON news_reports(thread_id, published_at DESC) WHERE thread_id IS NOT NULL;

-- Same for the queue
ALTER TABLE article_queue ADD COLUMN thread_id UUID REFERENCES news_threads(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: a starter set of obvious ongoing storylines.
-- All start active. The user can /threads pause <slug> any they don't want.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO news_threads (slug, label, description, keywords) VALUES
  ('russia-ukraine-war',
   'Russia–Ukraine war',
   'Active conflict between Russia and Ukraine. New developments include strikes, troop movements, peace talks, sanctions, weapons transfers, casualty reports, leadership statements.',
   ARRAY['ukraine', 'russia', 'putin', 'zelensky', 'kyiv', 'kharkiv', 'donetsk', 'crimea', 'nato ukraine', 'ukraine war', 'russian invasion']),

  ('israel-gaza-war',
   'Israel–Gaza war',
   'Active conflict in Gaza between Israel and Hamas, plus regional escalation. New developments include strikes, hostage situations, ceasefire talks, humanitarian crises, US/Iran/Hezbollah involvement.',
   ARRAY['gaza', 'israel hamas', 'hamas', 'idf', 'rafah', 'west bank', 'netanyahu', 'hostage', 'israeli strike', 'gaza ceasefire']),

  ('us-2026-midterms',
   'US 2026 midterm elections',
   'Campaigns, polling, candidate announcements, fundraising, primaries, voter laws, election security, debates leading to November 2026.',
   ARRAY['midterm', '2026 election', 'senate race', 'house race', 'gubernatorial', 'primary election', 'campaign finance', 'democratic candidate', 'republican candidate']),

  ('china-taiwan-tensions',
   'China–Taiwan tensions',
   'Cross-strait military activity, diplomatic exchanges, US arms transfers, trade restrictions, semiconductor policy, Taiwan election cycles.',
   ARRAY['taiwan', 'china taiwan', 'taipei', 'pla', 'taiwan strait', 'cross-strait', 'beijing taiwan', 'tsmc']),

  ('iran-tensions',
   'Iran tensions',
   'Iran nuclear program, sanctions, regional proxies, IRGC, US-Iran diplomacy, Israeli-Iranian exchanges.',
   ARRAY['iran', 'tehran', 'ayatollah', 'irgc', 'iran nuclear', 'iran sanctions', 'iran israel']),

  ('trump-administration',
   'Trump administration policy and personnel',
   'Executive orders, agency appointments, regulatory rollbacks, court challenges, congressional fights, second-term staffing, policy reversals.',
   ARRAY['trump executive order', 'trump administration', 'white house', 'trump appoint', 'trump policy', 'trump cabinet']),

  ('ai-regulation',
   'AI regulation and policy',
   'Federal and state AI laws, court rulings, agency rules, congressional bills, EU AI Act enforcement, model release controversies, labor disputes.',
   ARRAY['ai regulation', 'ai law', 'ai bill', 'eu ai act', 'ai executive order', 'ai liability', 'ai compliance', 'state ai law']),

  ('supreme-court-2026-term',
   'Supreme Court 2026 term',
   'SCOTUS arguments, opinions, emergency rulings, shadow docket activity, recusals, ethics, lower-court decisions on major federal questions.',
   ARRAY['supreme court', 'scotus', 'roberts court', 'justice', 'oral argument', 'scotus ruling', 'scotus opinion'])
ON CONFLICT (slug) DO NOTHING;
