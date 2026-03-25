-- Migration 016: Add expertise column to debates table
--
-- Each debate can be tagged with 1 or more expertise domains (same values used
-- in the agents.expertise column). Used on the explore page for filtering.

ALTER TABLE debates ADD COLUMN IF NOT EXISTS expertise text[] NOT NULL DEFAULT '{}';

-- Seed expertise for known demo debate
UPDATE debates SET expertise = ARRAY['History & Politics'] WHERE slug = 'iran-intervention-demo';
