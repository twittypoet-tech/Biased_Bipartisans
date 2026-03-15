import OpenAI from 'openai'
import type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse } from './types.js'

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  private client: OpenAI

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY })
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stop: request.stopSequences,
    })

    const choice = response.choices[0]

    return {
      content: choice?.message?.content ?? '',
      finishReason: choice?.finish_reason === 'stop' ? 'stop' : choice?.finish_reason === 'length' ? 'max_tokens' : 'unknown',
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    }
  }
}
