import type { PersonaPacket } from '@bipi/agent-core'
import { createModeratorInstructions } from '@bipi/agent-core'
import { getLLMProvider } from '../llm/index.js'
import type { LLMMessage } from '../llm/types.js'

export interface ModeratorParticipant {
  name: string
  archetype: string
  agentId: string
}

/**
 * ModeratorRunner manages the moderator agent's participation in a debate.
 *
 * The moderator is NOT "just another agent" — it's the debate engine's control plane.
 * It drives round transitions, assigns speaking turns, enforces timing,
 * directs rebuttals, clarifies claim types, and redistributes airtime.
 */
export class ModeratorRunner {
  private packet: PersonaPacket
  private systemPrompt: string
  private history: LLMMessage[]
  private participants: ModeratorParticipant[]

  constructor(
    packet: PersonaPacket,
    participants: ModeratorParticipant[],
    moderatorBehavior: Record<string, string>,
  ) {
    this.packet = packet
    this.participants = participants
    this.systemPrompt = createModeratorInstructions(packet, participants, moderatorBehavior)
    this.history = []
  }

  get agentId() { return this.packet.agentId }
  get name() { return this.packet.name }
  get llmProvider() { return this.packet.llmProvider }
  get llmModel() { return this.packet.llmModel }

  /**
   * Generate the moderator's introduction for a round.
   * The moderator frames the question, sets stakes, and directs the conversation.
   */
  async generateRoundIntro(phase: string, context: string): Promise<string> {
    const prompt = [
      `You are opening the ${phase} round.`,
      '',
      context,
      '',
      'Frame a clear, tension-creating question for the participants.',
      'Set the stakes for this round. Be concise — 2-3 sentences max.',
    ].join('\n')

    return this.generate(prompt)
  }

  /**
   * Generate a transition between rounds.
   * Summarizes the state of disagreement and bridges to the next phase.
   */
  async generateTransition(
    previousPhase: string,
    nextPhase: string,
    roundSummary: string,
  ): Promise<string> {
    const prompt = [
      `The ${previousPhase} round has ended. You are transitioning to the ${nextPhase} round.`,
      '',
      `Here is what happened in the ${previousPhase} round:`,
      roundSummary,
      '',
      'Briefly summarize the key disagreements that emerged.',
      'Then frame what the next round should address.',
      'Be concise — 3-4 sentences max.',
    ].join('\n')

    return this.generate(prompt)
  }

  /**
   * Generate the moderator's closing summary.
   * Identifies key tensions — does NOT declare a winner.
   */
  async generateClosing(debateSummary: string): Promise<string> {
    const prompt = [
      'The debate has concluded. Deliver your closing moderation.',
      '',
      'Here is a summary of the full debate:',
      debateSummary,
      '',
      'Identify the 2-3 key unresolved tensions.',
      'Note where each participant was strongest and weakest.',
      'Do NOT declare a winner. Leave the audience to decide.',
      'Be concise but substantive — aim for 4-6 sentences.',
    ].join('\n')

    return this.generate(prompt)
  }

  /**
   * Generate a mid-round interjection.
   * Used for: calling out evasion, flagging epistemic violations,
   * redistributing airtime, or forcing direct engagement.
   */
  async generateInterjection(context: string): Promise<string> {
    const prompt = [
      'You need to interject mid-round.',
      '',
      context,
      '',
      'Be direct and brief — 1-2 sentences. Stay neutral on substance.',
    ].join('\n')

    return this.generate(prompt)
  }

  /**
   * Add context to the moderator's history (e.g., agent turns).
   */
  addContext(context: string) {
    this.history.push({ role: 'user', content: context })
  }

  private async generate(prompt: string): Promise<string> {
    this.history.push({ role: 'user', content: prompt })

    const provider = getLLMProvider(this.packet.llmProvider)
    const response = await provider.complete({
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...this.history,
      ],
      maxTokens: this.packet.runtimeConstraints.maxTurnLengthTokens,
      temperature: 0.7,
    })

    this.history.push({ role: 'assistant', content: response.content })
    return response.content
  }
}
