import Anthropic from '@anthropic-ai/sdk'
import type { LLMMessage } from '../llm/types.js'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

/**
 * Streams text chunks from Anthropic Claude.
 *
 * Returns an async generator of text delta strings — each chunk is a
 * partial token from Claude's response. The caller can pipe these into
 * ElevenLabs StreamingTTSPublisher for real-time voice synthesis.
 *
 * This is the streaming equivalent of the existing `AnthropicProvider.complete()`.
 */
export async function* streamAnthropicResponse(
  messages: LLMMessage[],
  options?: {
    model?: string
    maxTokens?: number
    temperature?: number
    stopSequences?: string[]
  },
): AsyncGenerator<string> {
  const systemMessage = messages.find((m) => m.role === 'system')
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  const stream = getClient().messages.stream({
    model: options?.model ?? CLAUDE_MODEL,
    max_tokens: options?.maxTokens ?? 1024,
    temperature: options?.temperature ?? 0.8,
    ...(systemMessage ? { system: systemMessage.content } : {}),
    messages: nonSystemMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    ...(options?.stopSequences ? { stop_sequences: options.stopSequences } : {}),
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

/**
 * Collects all chunks from streamAnthropicResponse into a single string.
 * Used when streaming TTS is not needed (e.g., moderator interlude text).
 */
export async function completeAnthropicResponse(
  messages: LLMMessage[],
  options?: {
    model?: string
    maxTokens?: number
    temperature?: number
    stopSequences?: string[]
  },
): Promise<string> {
  let result = ''
  for await (const chunk of streamAnthropicResponse(messages, options)) {
    result += chunk
  }
  return result.trim()
}
