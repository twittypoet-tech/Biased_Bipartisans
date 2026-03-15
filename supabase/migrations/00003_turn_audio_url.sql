-- Add audio_url column to debate_turns for persisted TTS audio
ALTER TABLE debate_turns ADD COLUMN audio_url TEXT;

-- Create storage bucket for debate audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('debate-audio', 'debate-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to debate audio files
CREATE POLICY "Public read access for debate audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'debate-audio');

-- Allow service role to upload debate audio
CREATE POLICY "Service role upload for debate audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'debate-audio');
