import OpenAI from 'openai'
import { createLogger } from '@bipi/shared'
import type { VoiceProvider, Voice, SynthesisResult } from './types.js'

const log = createLogger('agents:voice:openai')

/** OpenAI TTS voice IDs */
export type OpenAIVoiceId = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

const AVAILABLE_VOICES: Voice[] = [
  { id: 'alloy', name: 'Alloy', provider: 'openai' },
  { id: 'echo', name: 'Echo', provider: 'openai' },
  { id: 'fable', name: 'Fable', provider: 'openai' },
  { id: 'onyx', name: 'Onyx', provider: 'openai' },
  { id: 'nova', name: 'Nova', provider: 'openai' },
  { id: 'shimmer', name: 'Shimmer', provider: 'openai' },
]

/**
 * OpenAI TTS voice provider.
 *
 * Synthesizes speech using OpenAI's `tts-1` model.
 * Requests PCM format (24kHz, 16-bit mono) to avoid MP3 decoding.
 */
export class OpenAITTSProvider implements VoiceProvider {
  readonly name = 'openai'
  private client: OpenAI

  constructor() {
    this.client = new OpenAI()
  }

  async synthesize(text: string, voiceId: string): Promise<SynthesisResult> {
    const voice = voiceId as OpenAIVoiceId
    log.debug(`Synthesizing ${text.length} chars with voice "${voice}"`)

    const response = await this.client.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      response_format: 'pcm', // 24kHz 16-bit mono PCM
    })

    const arrayBuffer = await response.arrayBuffer()
    const audio = Buffer.from(arrayBuffer)

    // PCM format: 24kHz, 16-bit (2 bytes per sample), mono (1 channel)
    const bytesPerSample = 2
    const sampleRate = 24000
    const totalSamples = audio.length / bytesPerSample
    const durationMs = Math.round((totalSamples / sampleRate) * 1000)

    log.debug(`Synthesized ${durationMs}ms of audio (${audio.length} bytes)`)

    return {
      audio,
      durationMs,
      format: 'pcm',
    }
  }

  async getAvailableVoices(): Promise<Voice[]> {
    return AVAILABLE_VOICES
  }
}
