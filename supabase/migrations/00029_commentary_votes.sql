-- Add upvote/downvote columns to report_commentary
ALTER TABLE report_commentary ADD COLUMN upvotes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE report_commentary ADD COLUMN downvotes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_report_commentary_votes ON report_commentary (upvotes DESC) WHERE is_published = true;
