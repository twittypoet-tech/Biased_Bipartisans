import type { VoiceProvider } from './types.js'
import { OpenAITTSProvider } from './openai-tts.js'
import { PlaceholderVoiceProvider } from './placeholder-provider.js'

export type { VoiceProvider, Voice, SynthesisResult } from './types.js'
export { OpenAITTSProvider } from './openai-tts.js'
export { PlaceholderVoiceProvider } from './placeholder-provider.js'
export { ARCHETYPE_VOICE_MAP, getVoiceId } from './voice-map.js'

const providers = new Map<string, VoiceProvider>()

/**
 * Get or create a voice provider instance.
 * Follows the same factory pattern as getLLMProvider().
 */
export function getVoiceProvider(providerName: string): VoiceProvider {
  const existing = providers.get(providerName)
  if (existing) return existing

  let provider: VoiceProvider
  switch (providerName) {
    case 'openai':
      provider = new OpenAITTSProvider()
      break
    case 'placeholder':
      provider = new PlaceholderVoiceProvider()
      break
    default:
      throw new Error(`Unknown voice provider: ${providerName}`)
  }

  providers.set(providerName, provider)
  return provider
}
