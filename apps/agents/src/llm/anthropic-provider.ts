import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse } from './types.js'

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY })
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const systemMessage = request.messages.find((m) => m.role === 'system')
    const nonSystemMessages = request.messages.filter((m) => m.role !== 'system')

    const response = await this.client.messages.create({
      model: request.messages[0]?.content.includes('model:')
        ? 'claude-sonnet-4-20250514'
        : 'claude-sonnet-4-20250514',
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      system: systemMessage?.content ?? '',
      messages: nonSystemMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      stop_sequences: request.stopSequences,
    })

    const textBlock = response.content.find((b) => b.type === 'text')

    return {
      content: textBlock?.text ?? '',
      finishReason: response.stop_reason === 'end_turn' ? 'stop' : response.stop_reason === 'max_tokens' ? 'max_tokens' : 'unknown',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }
  }
}
