/** Unified interface for multi-provider LLM integration */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMCompletionRequest {
  messages: LLMMessage[]
  maxTokens?: number
  temperature?: number
  stopSequences?: string[]
}

export interface LLMCompletionResponse {
  content: string
  finishReason: 'stop' | 'max_tokens' | 'tool_use' | 'unknown'
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

export interface LLMProvider {
  readonly name: string
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>
}
