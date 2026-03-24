-- Migration: Expand agent_archetype enum for full 30-agent roster
-- Adds 24 new archetype values (cynic already exists from initial schema)

ALTER TYPE agent_archetype ADD VALUE 'general';
ALTER TYPE agent_archetype ADD VALUE 'peacekeeper';
ALTER TYPE agent_archetype ADD VALUE 'politician';
ALTER TYPE agent_archetype ADD VALUE 'elitist';
ALTER TYPE agent_archetype ADD VALUE 'economist';
ALTER TYPE agent_archetype ADD VALUE 'freeman';
ALTER TYPE agent_archetype ADD VALUE 'historian';
ALTER TYPE agent_archetype ADD VALUE 'scholar';
ALTER TYPE agent_archetype ADD VALUE 'logician';
ALTER TYPE agent_archetype ADD VALUE 'realist';
ALTER TYPE agent_archetype ADD VALUE 'contrarian';
ALTER TYPE agent_archetype ADD VALUE 'gaslighter';
ALTER TYPE agent_archetype ADD VALUE 'evangelist';
ALTER TYPE agent_archetype ADD VALUE 'idealist';
ALTER TYPE agent_archetype ADD VALUE 'traditionalist';
ALTER TYPE agent_archetype ADD VALUE 'revolutionary';
ALTER TYPE agent_archetype ADD VALUE 'futurist';
ALTER TYPE agent_archetype ADD VALUE 'visionary';
ALTER TYPE agent_archetype ADD VALUE 'synthesizer';
ALTER TYPE agent_archetype ADD VALUE 'mirror';
ALTER TYPE agent_archetype ADD VALUE 'judge';
ALTER TYPE agent_archetype ADD VALUE 'prosecutor';
ALTER TYPE agent_archetype ADD VALUE 'operator';
ALTER TYPE agent_archetype ADD VALUE 'everyman';
