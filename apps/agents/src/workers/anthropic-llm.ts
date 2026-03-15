import Anthropic from '@anthropic-ai/sdk'
import { llm } from '@livekit/agents'
import type { APIConnectOptions } from '@livekit/agents'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

/**
 * Custom LLM adapter that bridges the Anthropic SDK to the @livekit/agents LLM interface.
 *
 * LiveKit agents-js requires an `LLM` subclass that implements `chat()` returning
 * an async-iterable `LLMStream`. This adapter uses Anthropic's streaming API
 * to yield `ChatChunk` objects, enabling sentence-by-sentence TTS synthesis.
 */
export class AnthropicLLM extends llm.LLM {
  private _anthropicClient: Anthropic
  private _model: string
  private _temperature: number
  private _maxTokens: number

  constructor(options?: { apiKey?: string; model?: string; temperature?: number; maxTokens?: number }) {
    super()
    this._anthropicClient = new Anthropic({ apiKey: options?.apiKey ?? process.env.ANTHROPIC_API_KEY })
    this._model = options?.model ?? CLAUDE_MODEL
    this._temperature = options?.temperature ?? 0.8
    this._maxTokens = options?.maxTokens ?? 1024
  }

  label(): string {
    return `anthropic/${this._model}`
  }

  get model(): string {
    return this._model
  }

  chat({
    chatCtx,
    toolCtx: _toolCtx,
    connOptions,
  }: {
    chatCtx: llm.ChatContext
    toolCtx?: llm.ToolContext
    connOptions: APIConnectOptions
  }): AnthropicLLMStream {
    return new AnthropicLLMStream(this, {
      chatCtx,
      connOptions,
      client: this._anthropicClient,
      model: this._model,
      temperature: this._temperature,
      maxTokens: this._maxTokens,
    })
  }
}

class AnthropicLLMStream extends llm.LLMStream {
  private client: Anthropic
  private _streamModel: string
  private temperature: number
  private maxTokens: number

  constructor(
    llmInstance: AnthropicLLM,
    opts: {
      chatCtx: llm.ChatContext
      connOptions: APIConnectOptions
      client: Anthropic
      model: string
      temperature: number
      maxTokens: number
    },
  ) {
    super(llmInstance, { chatCtx: opts.chatCtx, connOptions: opts.connOptions })
    this.client = opts.client
    this._streamModel = opts.model
    this.temperature = opts.temperature
    this.maxTokens = opts.maxTokens
  }

  protected async run(): Promise<void> {
    const items = this.chatCtx.items

    // Extract system message and conversation messages
    let systemContent = ''
    const conversationMessages: Anthropic.MessageParam[] = []

    for (const item of items) {
      if (item.type !== 'message') continue
      const msg = item as llm.ChatMessage

      // Collect text content
      const textContent = msg.content
        .filter((c): c is string => typeof c === 'string')
        .join('\n')

      if (!textContent) continue

      if (msg.role === 'system' || msg.role === 'developer') {
        systemContent += (systemContent ? '\n' : '') + textContent
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        conversationMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: textContent,
        })
      }
    }

    if (conversationMessages.length === 0) {
      return
    }

    let chunkIndex = 0

    const stream = this.client.messages.stream({
      model: this._streamModel,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      ...(systemContent ? { system: systemContent } : {}),
      messages: conversationMessages,
    })

    for await (const event of stream) {
      if (this.abortController.signal.aborted) break

      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        this.queue.put({
          id: `anthropic-${chunkIndex++}`,
          delta: {
            role: 'assistant',
            content: event.delta.text,
          },
        })
      } else if (event.type === 'message_delta' && event.usage) {
        this.queue.put({
          id: `anthropic-usage`,
          usage: {
            completionTokens: event.usage.output_tokens,
            promptTokens: 0,
            promptCachedTokens: 0,
            totalTokens: event.usage.output_tokens,
          },
        })
      }
    }
  }
}
