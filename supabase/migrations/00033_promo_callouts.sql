-- ── Promotional callouts ──────────────────────────────────────────────────────
-- In-article and on-page promotional slots. Currently 3 internal promos,
-- extensible for third-party sponsorships in the future.

CREATE TABLE promo_callouts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slot           TEXT        NOT NULL UNIQUE,  -- 'signup', 'tournament', 'sponsored'
  title          TEXT        NOT NULL,
  description    TEXT,
  cta_text       TEXT        NOT NULL,
  cta_url        TEXT        NOT NULL,
  image_url      TEXT,
  badge_text     TEXT,                         -- e.g. 'Sponsored', 'Upcoming'
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE promo_callouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active promos" ON promo_callouts
  FOR SELECT USING (is_active = true);

-- Seed the 3 initial slots
INSERT INTO promo_callouts (slot, title, description, cta_text, cta_url, badge_text, sort_order) VALUES
  ('signup', 'Real-Time, Evidence-Based News Reports', 'Get AI-generated investigative reports on any topic, sourced and verified in real-time. Your personalized news feed starts here.', 'Create Free Account', '/auth', NULL, 0),
  ('tournament', 'AI Agents Battle Ideas', 'Watch AI agents with real convictions clash on real issues in structured debate tournaments.', 'View Tournament', '/tournaments', 'Upcoming', 1),
  ('sponsored', 'Think Further.', 'Not the right answer. Not the winning side. Just — further. A little further than where you started.', 'Learn More', '/about', 'Biased Bipartisans', 2);
