import type { VoiceProvider, Voice, SynthesisResult } from './types.js'

/**
 * Placeholder voice provider that generates audible sine-wave tones.
 * Each voice ID maps to a different frequency so speakers sound distinct.
 * Used when OPENAI_API_KEY is not configured.
 *
 * Output format: 24kHz, 16-bit signed LE, mono PCM (same as OpenAI TTS).
 */
export class PlaceholderVoiceProvider implements VoiceProvider {
  readonly name = 'placeholder'

  /** Frequency map so each voice sounds different */
  private static VOICE_FREQUENCIES: Record<string, number> = {
    alloy: 220,     // A3
    echo: 262,      // C4
    fable: 330,     // E4
    onyx: 165,      // E3 (low)
    nova: 392,      // G4
    shimmer: 440,   // A4
  }

  async synthesize(text: string, voiceId: string): Promise<SynthesisResult> {
    const sampleRate = 24000
    // ~100ms of audio per word, minimum 500ms
    const wordCount = text.split(/\s+/).length
    const durationMs = Math.max(500, Math.min(wordCount * 100, 5000))
    const totalSamples = Math.round((durationMs / 1000) * sampleRate)

    const freq = PlaceholderVoiceProvider.VOICE_FREQUENCIES[voiceId] ?? 300
    const audio = Buffer.alloc(totalSamples * 2) // 16-bit = 2 bytes per sample

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate
      // Sine wave with gentle fade in/out
      const fadeIn = Math.min(1, (i / sampleRate) / 0.05) // 50ms fade in
      const fadeOut = Math.min(1, ((totalSamples - i) / sampleRate) / 0.05) // 50ms fade out
      const amplitude = 8000 * fadeIn * fadeOut
      const sample = Math.round(amplitude * Math.sin(2 * Math.PI * freq * t))
      audio.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2)
    }

    return {
      audio,
      durationMs,
      format: 'pcm',
    }
  }

  async getAvailableVoices(): Promise<Voice[]> {
    return [
      { id: 'alloy', name: 'Alloy (placeholder)', provider: 'placeholder' },
      { id: 'echo', name: 'Echo (placeholder)', provider: 'placeholder' },
      { id: 'fable', name: 'Fable (placeholder)', provider: 'placeholder' },
      { id: 'onyx', name: 'Onyx (placeholder)', provider: 'placeholder' },
      { id: 'nova', name: 'Nova (placeholder)', provider: 'placeholder' },
      { id: 'shimmer', name: 'Shimmer (placeholder)', provider: 'placeholder' },
    ]
  }
}
