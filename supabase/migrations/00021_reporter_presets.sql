-- ── Reporter presets: curated query suggestions for the chat hero ────────────
--
-- Each preset is a pre-configured query that users can click to quickly
-- request a report. The query_template is sent as-is to Retell via the
-- /api/reporter/call endpoint.

CREATE TABLE reporter_presets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT        NOT NULL,
  query_template TEXT        NOT NULL,
  category       TEXT,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reporter_presets_active_idx ON reporter_presets (sort_order) WHERE is_active = true;

-- RLS: public read for active presets, service role full access
ALTER TABLE reporter_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active presets" ON reporter_presets
  FOR SELECT USING (is_active = true);
