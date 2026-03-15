import type { VoiceProvider, Voice, SynthesisResult } from './types.js'

/**
 * Placeholder voice provider for text-first v1.
 * Logs synthesis requests but returns empty audio buffers.
 * Replace with a real provider (ElevenLabs, PlayHT, etc.) when voice is enabled.
 */
export class PlaceholderVoiceProvider implements VoiceProvider {
  readonly name = 'placeholder'

  async synthesize(text: string, voiceId: string): Promise<SynthesisResult> {
    console.log(`[PlaceholderVoice] Would synthesize ${text.length} chars with voice ${voiceId}`)

    return {
      audio: Buffer.alloc(0),
      durationMs: 0,
      format: 'mp3',
    }
  }

  async getAvailableVoices(): Promise<Voice[]> {
    return [
      { id: 'placeholder-1', name: 'Placeholder Voice 1', provider: 'placeholder' },
      { id: 'placeholder-2', name: 'Placeholder Voice 2', provider: 'placeholder' },
    ]
  }
}
