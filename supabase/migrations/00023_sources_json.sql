-- Add structured sources with URLs to reporter_calls
ALTER TABLE reporter_calls ADD COLUMN IF NOT EXISTS sources_json JSONB;
