import type { LLMProvider } from './types.js'
import { AnthropicProvider } from './anthropic-provider.js'
import { OpenAIProvider } from './openai-provider.js'

export type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse, LLMMessage } from './types.js'

const providers = new Map<string, LLMProvider>()

/**
 * Get or create an LLM provider instance.
 * Each agent specifies its provider in config — this factory returns the right one.
 */
export function getLLMProvider(providerName: string): LLMProvider {
  const existing = providers.get(providerName)
  if (existing) return existing

  let provider: LLMProvider
  switch (providerName) {
    case 'anthropic':
      provider = new AnthropicProvider()
      break
    case 'openai':
      provider = new OpenAIProvider()
      break
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`)
  }

  providers.set(providerName, provider)
  return provider
}
