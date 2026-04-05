-- Add structured content columns to reporter_calls
-- Mirrors news_reports.body/callouts for rich editorial rendering
ALTER TABLE reporter_calls ADD COLUMN IF NOT EXISTS body JSONB;
ALTER TABLE reporter_calls ADD COLUMN IF NOT EXISTS callouts JSONB;
