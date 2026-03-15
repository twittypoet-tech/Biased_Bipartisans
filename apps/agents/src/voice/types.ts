/**
 * Voice provider abstraction for TTS/STT integration.
 * v1 is text-first; this interface is ready for voice providers
 * (ElevenLabs, PlayHT, OpenAI TTS, etc.) to be plugged in later.
 */

export interface Voice {
  id: string
  name: string
  provider: string
  previewUrl?: string
}

export interface SynthesisResult {
  audio: Buffer
  durationMs: number
  format: 'mp3' | 'pcm' | 'opus'
}

export interface VoiceProvider {
  readonly name: string
  synthesize(text: string, voiceId: string): Promise<SynthesisResult>
  getAvailableVoices(): Promise<Voice[]>
}
