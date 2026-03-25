-- Add expertise column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS expertise text[] NOT NULL DEFAULT '{}';

-- Populate expertise for all agents based on domain mapping
UPDATE agents SET expertise = ARRAY['History & Politics'] WHERE name = 'The Hawk';
UPDATE agents SET expertise = ARRAY['History & Politics'] WHERE name = 'The Dove';
UPDATE agents SET expertise = ARRAY['Environmental Science', 'Medicine & Healthcare', 'Statistics & Data Science', 'Technology & Innovation'] WHERE name = 'The Technocrat';
UPDATE agents SET expertise = ARRAY[]::text[] WHERE name = 'The Moderator';
UPDATE agents SET expertise = ARRAY['History & Politics', 'Rhetoric & Persuasion'] WHERE name = 'The Populist';
UPDATE agents SET expertise = ARRAY['History & Politics', 'Medicine & Healthcare'] WHERE name = 'The Peacekeeper';
UPDATE agents SET expertise = ARRAY['History & Politics', 'Rhetoric & Persuasion'] WHERE name = 'The Politician';
UPDATE agents SET expertise = ARRAY['Statistics & Data Science', 'History & Politics'] WHERE name = 'The Economist';
UPDATE agents SET expertise = ARRAY['Law & Jurisprudence', 'Philosophy & Ethics'] WHERE name = 'The Freeman';
UPDATE agents SET expertise = ARRAY['History & Politics'] WHERE name = 'The Historian';
UPDATE agents SET expertise = ARRAY['Law & Jurisprudence', 'Statistics & Data Science'] WHERE name = 'The Logician';
UPDATE agents SET expertise = ARRAY['Environmental Science', 'Medicine & Healthcare', 'Statistics & Data Science'] WHERE name = 'The Realist';
UPDATE agents SET expertise = ARRAY['Philosophy & Ethics'] WHERE name = 'The Idealist';
UPDATE agents SET expertise = ARRAY['History & Politics'] WHERE name = 'The Revolutionary';
UPDATE agents SET expertise = ARRAY['Environmental Science', 'Technology & Innovation'] WHERE name = 'The Futurist';
UPDATE agents SET expertise = ARRAY['Rhetoric & Persuasion', 'Technology & Innovation'] WHERE name = 'The Mirror';
UPDATE agents SET expertise = ARRAY['Law & Jurisprudence'] WHERE name = 'The Judge';
UPDATE agents SET expertise = ARRAY['Technology & Innovation'] WHERE name = 'The Operator';
UPDATE agents SET expertise = ARRAY['Technology & Innovation'] WHERE name = 'The Visionary';
UPDATE agents SET expertise = ARRAY['Philosophy & Ethics', 'Technology & Innovation'] WHERE name = 'The Synthesizer';
UPDATE agents SET expertise = ARRAY['Law & Jurisprudence'] WHERE name = 'The Prosecutor';
UPDATE agents SET expertise = ARRAY['Rhetoric & Persuasion'] WHERE name = 'The Everyman';
UPDATE agents SET expertise = ARRAY['Philosophy & Ethics'] WHERE name = 'The Cynic';
UPDATE agents SET expertise = ARRAY['Philosophy & Ethics', 'Rhetoric & Persuasion'] WHERE name = 'The Evangelist';
UPDATE agents SET expertise = ARRAY['Rhetoric & Persuasion'] WHERE name = 'The Gaslighter';
UPDATE agents SET expertise = ARRAY['History & Politics'] WHERE name = 'The General';
UPDATE agents SET expertise = ARRAY['Law & Jurisprudence'] WHERE name = 'The Elitist';
UPDATE agents SET expertise = ARRAY['Philosophy & Ethics'] WHERE name = 'The Scholar';
UPDATE agents SET expertise = ARRAY['Rhetoric & Persuasion'] WHERE name = 'The Contrarian';
UPDATE agents SET expertise = ARRAY['Philosophy & Ethics'] WHERE name = 'The Traditionalist';
