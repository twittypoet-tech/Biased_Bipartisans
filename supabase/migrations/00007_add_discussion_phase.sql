-- Migration 007: Add 'discussion' to round_phase enum
--
-- Kept separate from 006: ALTER TYPE ... ADD VALUE has transaction
-- visibility constraints in PostgreSQL and must run independently.
--
-- 'discussion' is the primary phase label for freeflow debates.
-- Existing structured turns (opening/rebuttal/pressure/closing) are unaffected.

ALTER TYPE round_phase ADD VALUE 'discussion';
