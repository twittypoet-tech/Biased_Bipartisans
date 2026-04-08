-- Newsletter subscribers and popup analytics
-- Tracks per-agent newsletter signups and popup conversion metrics for Brevo campaign integration

-- ── Newsletter subscribers ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  agent_id      UUID REFERENCES agents(id) ON DELETE SET NULL,
  source_slug   TEXT,                          -- article slug that triggered signup
  verified      BOOLEAN NOT NULL DEFAULT false,
  magic_token   TEXT,
  token_expires TIMESTAMPTZ,
  brevo_contact_id TEXT,                       -- future Brevo integration
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at   TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: one subscription per email per agent
CREATE UNIQUE INDEX idx_newsletter_email_agent
  ON newsletter_subscribers(email, agent_id)
  WHERE unsubscribed_at IS NULL;

-- Fast lookup by magic token
CREATE INDEX idx_newsletter_magic_token
  ON newsletter_subscribers(magic_token)
  WHERE magic_token IS NOT NULL AND verified = false;

-- Fast lookup by agent for Brevo campaign segmentation
CREATE INDEX idx_newsletter_agent
  ON newsletter_subscribers(agent_id)
  WHERE verified = true AND unsubscribed_at IS NULL;

-- ── Newsletter popup analytics ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_popup_analytics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     UUID REFERENCES news_reports(id) ON DELETE SET NULL,
  agent_id      UUID REFERENCES agents(id) ON DELETE SET NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('impression', 'email_entered', 'signup_clicked', 'token_sent', 'verified', 'dismissed', 'resend_requested')),
  session_id    TEXT,
  email         TEXT,                          -- only for signup events, not impressions
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_popup_analytics_report
  ON newsletter_popup_analytics(report_id, event_type);

CREATE INDEX idx_popup_analytics_agent
  ON newsletter_popup_analytics(agent_id, event_type);

CREATE INDEX idx_popup_analytics_date
  ON newsletter_popup_analytics(created_at DESC);

-- ── RLS policies ────────────────────────────────────────────────────────────

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_popup_analytics ENABLE ROW LEVEL SECURITY;

-- Anon can insert (signup) and read own token status
CREATE POLICY "Anyone can subscribe" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can verify their token" ON newsletter_subscribers
  FOR UPDATE USING (magic_token IS NOT NULL)
  WITH CHECK (true);

CREATE POLICY "Service role full access subscribers" ON newsletter_subscribers
  FOR ALL USING (auth.role() = 'service_role');

-- Analytics: anon can insert, service role reads
CREATE POLICY "Anyone can log popup analytics" ON newsletter_popup_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access analytics" ON newsletter_popup_analytics
  FOR ALL USING (auth.role() = 'service_role');
