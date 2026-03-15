import type { PersonaPacket } from '@bipi/agent-core'
import { createRuntimeInstructions } from '@bipi/agent-core'
import { getLLMProvider } from '../llm/index.js'
import type { LLMMessage } from '../llm/types.js'

/**
 * AgentRunner manages a single agent's participation in a debate.
 * It holds the agent's persona packet, conversation history, and LLM provider.
 */
export class AgentRunner {
  private packet: PersonaPacket
  private systemPrompt: string
  private history: LLMMessage[]

  constructor(packet: PersonaPacket) {
    this.packet = packet
    this.systemPrompt = createRuntimeInstructions(packet)
    this.history = []
  }

  get agentId() { return this.packet.agentId }
  get name() { return this.packet.name }
  get archetype() { return this.packet.archetype }
  get llmProvider() { return this.packet.llmProvider }
  get llmModel() { return this.packet.llmModel }

  /**
   * Generate a response for the current debate context.
   * The prompt includes round context and what other agents have said.
   */
  async generateTurn(turnPrompt: string): Promise<string> {
    this.history.push({ role: 'user', content: turnPrompt })

    const provider = getLLMProvider(this.packet.llmProvider)
    const response = await provider.complete({
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...this.history,
      ],
      maxTokens: this.packet.runtimeConstraints.maxTurnLengthTokens,
      temperature: 0.8,
    })

    this.history.push({ role: 'assistant', content: response.content })

    return response.content
  }

  /**
   * Add context to the agent's history (e.g., what other agents said).
   */
  addContext(context: string) {
    this.history.push({ role: 'user', content: context })
  }

  /**
   * Get the current token usage estimate for this agent's conversation.
   */
  getHistoryLength(): number {
    return this.history.length
  }
}
