-- Add intro_audio_url to agents for caching the one-time Retell intro recording
ALTER TABLE agents ADD COLUMN IF NOT EXISTS intro_audio_url TEXT;
