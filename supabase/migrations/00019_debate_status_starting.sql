-- Add 'starting' to debate_status enum.
-- This transient status is set atomically by the scheduler when it claims a
-- debate, preventing a second service instance from also starting the same
-- debate (the second UPDATE finds no rows with status='scheduled').
-- The conductor upgrades the status to 'live' once Retell calls are connected.

ALTER TYPE debate_status ADD VALUE IF NOT EXISTS 'starting';
