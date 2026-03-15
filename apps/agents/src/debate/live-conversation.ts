import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient, getDebate, getDebateFormat, getDebateParticipants } from '@bipi/db'
import { getTopAudienceQuestions, markQuestionAddressed, type AudienceMessage } from '@bipi/db'
import { compilePersonaPacket, createRuntimeInstructions, createModeratorInstructions, type TopicFraming } from '@bipi/agent-core'
import { createLogger } from '@bipi/shared'

import { persistTurn, extractClaimTier } from '../services/turn-persistence.js'
import { DebateStateManager, type DebateParticipantInfo } from '../services/debate-state.js'
import type { LLMMessage } from '../llm/types.js'
import { streamAnthropicResponse, completeAnthropicResponse } from '../workers/anthropic-stream.js'
import type { StreamingTTSPublisher } from '../workers/streaming-tts.js'
import type { AudioPublisher } from '../livekit/audio-publisher.js'
import { LiveKitRoomManager } from '../livekit/room-manager.js'

const log = createLogger('agents:live-conversation')

// ─── Types ────────────────────────────────────────────────────────────────────

/** A speech record shared across all agent contexts */
interface SpeechRecord {
  speakerId: string
  speakerName: string
  archetype: string
  transcript: string
  isModerator: boolean
  turnId?: string
}

type ConversationPhase = 'opening' | 'exchange' | 'audience_qa' | 'closing'

export interface LiveConversationConfig {
  debateId: string
  /** Max back-and-forth exchanges before closing statements (default: 8) */
  maxExchanges?: number
  /** How often to check for audience questions, in exchanges (default: every 2) */
  audienceCheckInterval?: number
  ttsPublishers?: Map<string, StreamingTTSPublisher>
  audioPublishers?: Map<string, AudioPublisher>
  roomManager?: LiveKitRoomManager
  roomName?: string
  onTurnComplete?: (turn: SpeechRecord) => void | Promise<void>
  onDebateComplete?: (summary: { totalTurns: number; durationMs: number }) => void | Promise<void>
}

// ─── LiveConversation ─────────────────────────────────────────────────────────

/**
 * LiveConversation replaces the scripted TurnController with a fully reactive
 * conversation engine. Instead of following a predetermined round sequence,
 * each agent always responds to exactly what the other agent just said.
 *
 * Key differences from TurnController:
 *  - No fixed round sequence — dynamic flow: openings → exchanges → closings
 *  - Every turn after the first is a direct reaction to the prior speech
 *  - Audience questions are injected naturally between exchanges
 *  - Soft interrupt: any turn can be cut short at sentence boundary
 *  - Both agents hear the full shared transcript at all times
 *
 * The conversation feels like a live argument because the agents ARE arguing
 * with each other — not reading from a script.
 */
export class LiveConversation {
  private config: LiveConversationConfig
  private db: SupabaseClient

  // Participants
  private debaters: DebateParticipantInfo[] = []
  private moderatorInfo: DebateParticipantInfo | null = null

  // Per-agent LLM state
  private agentSystemPrompts = new Map<string, string>()
  private agentHistories = new Map<string, LLMMessage[]>()
  private agentMaxTokens = new Map<string, number>()
  private moderatorSystemPrompt = ''
  private moderatorHistory: LLMMessage[] = []

  // Shared state — what every agent "hears"
  private sharedHistory: SpeechRecord[] = []
  private topicFraming: TopicFraming | null = null

  // Conversation control
  private exchangeCount = 0
  private turnIndex = 0
  private startTime = 0
  private interruptPending: string | null = null  // agentId requesting floor
  private stateManager: DebateStateManager | null = null

  constructor(config: LiveConversationConfig) {
    this.config = config
    this.db = getSupabaseClient()
  }

  // ─── Initialization ──────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    const { debateId } = this.config

    const debate = await getDebate(this.db, debateId)
    if (!debate) throw new Error(`Debate not found: ${debateId}`)

    const format = await getDebateFormat(this.db, debate.format_id)
    if (!format) throw new Error(`Debate format not found: ${debate.format_id}`)

    const participants = await getDebateParticipants(this.db, debateId)
    if (participants.length === 0) throw new Error(`No participants for debate: ${debateId}`)

    // Topic framing
    const dbFraming = debate.topic_framing as unknown as Record<string, unknown>
    this.topicFraming = {
      headline: dbFraming.headline as string,
      conflictDescription: (dbFraming.conflict_description ?? dbFraming.conflictDescription) as string,
      forcedTradeoff: (dbFraming.forced_tradeoff ?? dbFraming.forcedTradeoff) as string,
      moralTension: (dbFraming.moral_tension ?? dbFraming.moralTension ?? null) as string | null,
      strategicTension: (dbFraming.strategic_tension ?? dbFraming.strategicTension ?? null) as string | null,
      identityTension: (dbFraming.identity_tension ?? dbFraming.identityTension ?? null) as string | null,
      decisionSurface: (dbFraming.decision_surface ?? dbFraming.decisionSurface) as string,
    }

    // Participant metadata
    const participantAgentIds = participants.map((p) => p.agent_id)
    const participantNames: Record<string, string> = {}

    for (const p of participants) {
      const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
      const name = (agent?.name as string) ?? 'Unknown'
      const archetype = (agent?.archetype as string) ?? 'unknown'
      participantNames[p.agent_id] = name

      const info: DebateParticipantInfo = {
        agentId: p.agent_id,
        name,
        archetype,
        role: p.role as 'debater' | 'moderator',
        speakingOrder: p.speaking_order,
      }

      if (p.role === 'moderator') {
        this.moderatorInfo = info
      } else {
        this.debaters.push(info)
      }
    }

    if (this.debaters.length < 2) throw new Error('Live conversation requires at least 2 debaters')
    if (!this.moderatorInfo) throw new Error('No moderator participant found')

    // Sort debaters by speaking_order
    this.debaters.sort((a, b) => a.speakingOrder - b.speakingOrder)

    // Compile PersonaPackets for each participant
    const moderatorDebaters = this.debaters.map((d) => ({
      name: d.name,
      archetype: d.archetype,
      agentId: d.agentId,
    }))

    for (const pInfo of [...this.debaters, this.moderatorInfo]) {
      const packet = await compilePersonaPacket(this.db, {
        agentId: pInfo.agentId,
        debateId,
        roomName: debate.room_name,
        topicFraming: this.topicFraming,
        roundSequence: [],  // no fixed rounds in live conversation
        participantAgentIds,
        participantNames,
      })

      if (pInfo.role === 'moderator') {
        this.moderatorSystemPrompt = createModeratorInstructions(
          packet,
          moderatorDebaters,
          (format.moderator_behavior as Record<string, string>) ?? {},
        )
        this.moderatorHistory = []
      } else {
        this.agentSystemPrompts.set(pInfo.agentId, createRuntimeInstructions(packet))
        this.agentHistories.set(pInfo.agentId, [])
        this.agentMaxTokens.set(pInfo.agentId, packet.runtimeConstraints.maxTurnLengthTokens)
      }
    }

    const phases = ['opening', 'rebuttal', 'closing'] as const
    this.stateManager = new DebateStateManager(phases as unknown as import('@bipi/shared').RoundPhase[])

    await this.db.from('debates').update({
      status: 'live',
      started_at: new Date().toISOString(),
    }).eq('id', debateId)

    log.info(`LiveConversation initialized — ${this.debaters.length} debaters, topic: "${this.topicFraming.headline}"`)
  }

  // ─── Main loop ────────────────────────────────────────────────────────────

  async run(): Promise<void> {
    if (!this.topicFraming || !this.stateManager) {
      throw new Error('LiveConversation not initialized. Call initialize() first.')
    }

    this.startTime = Date.now()
    const maxExchanges = this.config.maxExchanges ?? 8
    const audienceInterval = this.config.audienceCheckInterval ?? 2

    // ── Phase 1: Moderator opens ─────────────────────────────────────────
    await this.moderatorOpen()

    // ── Phase 2: Opening statements ──────────────────────────────────────
    for (const debater of this.debaters) {
      await this.speakOpening(debater)
    }

    // ── Phase 3: Reactive exchange loop ──────────────────────────────────
    let lastSpeakerId = this.debaters[this.debaters.length - 1]!.agentId

    while (this.exchangeCount < maxExchanges) {
      // Check for audience question at regular intervals
      if (this.exchangeCount > 0 && this.exchangeCount % audienceInterval === 0) {
        const questions = await getTopAudienceQuestions(this.db, this.config.debateId, 1)
        if (questions.length > 0) {
          await this.handleAudienceQuestion(questions[0]!)
          continue  // don't count as an exchange, just continue the loop
        }
      }

      // Alternate speakers
      const nextDebater = this.getNextDebater(lastSpeakerId)
      await this.speakReactive(nextDebater, lastSpeakerId)

      lastSpeakerId = nextDebater.agentId
      this.exchangeCount++
    }

    // ── Phase 4: Closing statements (same order as openings) ─────────────
    await this.moderatorTransitionToClosing()

    for (const debater of this.debaters) {
      await this.speakClosing(debater)
    }

    // ── Phase 5: Moderator closes ────────────────────────────────────────
    await this.moderatorClose()

    // Mark debate ended
    await this.db.from('debates').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    }).eq('id', this.config.debateId)

    const durationMs = Date.now() - this.startTime
    await this.config.onDebateComplete?.({ totalTurns: this.turnIndex, durationMs })
  }

  // ─── Speaking methods ─────────────────────────────────────────────────────

  private async moderatorOpen(): Promise<void> {
    const topic = this.topicFraming!
    const names = this.debaters.map((d) => d.name).join(' and ')
    const prompt = [
      `Welcome the audience and introduce this live debate between ${names}.`,
      `Topic: "${topic.headline}"`,
      `The core tension: ${topic.conflictDescription}`,
      `The key tradeoff: ${topic.forcedTradeoff}`,
      `Set the stage with a sharp, provocative framing. 3-4 sentences.`,
    ].join('\n')

    const transcript = await this.generateModerator(prompt)
    await this.persistAndBroadcast({
      speakerId: this.moderatorInfo!.agentId,
      speakerName: this.moderatorInfo!.name,
      archetype: 'moderator',
      transcript,
      isModerator: true,
      phase: 'opening',
    })
  }

  private async speakOpening(debater: DebateParticipantInfo): Promise<void> {
    const topic = this.topicFraming!
    const others = this.debaters.filter((d) => d.agentId !== debater.agentId)
    const otherNames = others.map((d) => d.name).join(' and ')

    const prompt = [
      `Make your opening statement.`,
      `Topic: "${topic.headline}"`,
      `You are arguing against ${otherNames}.`,
      `Establish your core position clearly. State the most important thing you believe about this topic.`,
      `Be direct. 3-5 sentences.`,
    ].join('\n')

    const transcript = await this.generateAndSpeakWithPersist(debater, prompt, 'opening')
    this.sharedHistory.push({ speakerId: debater.agentId, speakerName: debater.name, archetype: debater.archetype, transcript, isModerator: false })
    this.injectIntoOtherAgents(debater.agentId, debater.name, transcript)
  }

  private async speakReactive(debater: DebateParticipantInfo, prevSpeakerId: string): Promise<void> {
    const prevSpeaker = this.sharedHistory.findLast((r) => r.speakerId === prevSpeakerId)
    if (!prevSpeaker) return

    const prompt = this.buildReactivePrompt(debater, prevSpeaker)
    const transcript = await this.generateAndSpeakWithPersist(debater, prompt, 'rebuttal')
    this.sharedHistory.push({ speakerId: debater.agentId, speakerName: debater.name, archetype: debater.archetype, transcript, isModerator: false })
    this.injectIntoOtherAgents(debater.agentId, debater.name, transcript)
  }

  private async handleAudienceQuestion(question: AudienceMessage): Promise<void> {
    // Moderator reads the question
    const modPrompt = [
      `An audience member asks: "${question.content}"`,
      `Briefly introduce this question to both debaters. 1-2 sentences.`,
      `Then ask both ${this.debaters.map((d) => d.name).join(' and ')} to address it.`,
    ].join('\n')

    const modTranscript = await this.generateModerator(modPrompt)
    const { turnId } = await this.persistAndBroadcast({
      speakerId: this.moderatorInfo!.agentId,
      speakerName: this.moderatorInfo!.name,
      archetype: 'moderator',
      transcript: modTranscript,
      isModerator: true,
      phase: 'rebuttal',
    })

    // Mark question addressed
    await markQuestionAddressed(this.db, question.id, turnId)

    // Inject the question into all agents as context
    const questionContext = `[AUDIENCE QUESTION]: "${question.content}"`
    for (const history of this.agentHistories.values()) {
      history.push({ role: 'user', content: questionContext })
    }

    // Each debater responds to the audience question
    for (const debater of this.debaters) {
      const prompt = [
        `Address this audience question: "${question.content}"`,
        `Connect your answer to your core position. Be genuine and direct.`,
        `2-3 sentences.`,
      ].join('\n')

      const transcript = await this.generateAndSpeak(debater.agentId, prompt)
      this.sharedHistory.push({ speakerId: debater.agentId, speakerName: debater.name, archetype: debater.archetype, transcript, isModerator: false })
      this.injectIntoOtherAgents(debater.agentId, debater.name, transcript)
    }
  }

  private async moderatorTransitionToClosing(): Promise<void> {
    const recentSummary = this.sharedHistory
      .slice(-6)
      .map((r) => `${r.speakerName}: "${r.transcript.slice(0, 120)}..."`)
      .join('\n')

    const prompt = [
      `The main debate is wrapping up. Transition to closing statements.`,
      `Recent exchange:`,
      recentSummary,
      `Identify the 1-2 key unresolved tensions. Then hand the floor to each debater for their final argument.`,
      `3-4 sentences.`,
    ].join('\n')

    const transcript = await this.generateModerator(prompt)
    await this.persistAndBroadcast({
      speakerId: this.moderatorInfo!.agentId,
      speakerName: this.moderatorInfo!.name,
      archetype: 'moderator',
      transcript,
      isModerator: true,
      phase: 'closing',
    })
  }

  private async speakClosing(debater: DebateParticipantInfo): Promise<void> {
    const debateSummary = this.sharedHistory
      .slice(0, 12)
      .map((r) => `${r.speakerName}: "${r.transcript.slice(0, 100)}..."`)
      .join('\n')

    const prompt = [
      `Make your closing argument.`,
      `The debate covered:`,
      debateSummary,
      `What is the single most important thing you want the audience to walk away believing?`,
      `Be decisive and memorable. 3-4 sentences.`,
    ].join('\n')

    const transcript = await this.generateAndSpeakWithPersist(debater, prompt, 'closing')
    this.sharedHistory.push({ speakerId: debater.agentId, speakerName: debater.name, archetype: debater.archetype, transcript, isModerator: false })
    this.injectIntoOtherAgents(debater.agentId, debater.name, transcript)
  }

  private async moderatorClose(): Promise<void> {
    const allSummary = this.sharedHistory
      .filter((r) => !r.isModerator)
      .map((r) => `${r.speakerName}: "${r.transcript.slice(0, 100)}..."`)
      .join('\n')

    const prompt = [
      `Close the debate. Full exchange summary:`,
      allSummary,
      `Note the strongest argument from each side.`,
      `Identify what remains unresolved.`,
      `Do NOT declare a winner. Let the audience decide.`,
      `4-5 sentences.`,
    ].join('\n')

    const transcript = await this.generateModerator(prompt)
    await this.persistAndBroadcast({
      speakerId: this.moderatorInfo!.agentId,
      speakerName: this.moderatorInfo!.name,
      archetype: 'moderator',
      transcript,
      isModerator: true,
      phase: 'closing',
    })
  }

  // ─── Prompt builders ──────────────────────────────────────────────────────

  /**
   * The heart of the reactive conversation.
   * Each agent responds to exactly what the other just said — no scripts.
   */
  private buildReactivePrompt(debater: DebateParticipantInfo, prevSpeech: SpeechRecord): string {
    const recentOpponent = this.sharedHistory
      .filter((r) => r.speakerId !== debater.agentId && !r.isModerator)
      .slice(-2)
      .map((r) => `${r.speakerName}: "${r.transcript}"`)
      .join('\n')

    return [
      `${prevSpeech.speakerName} just said:`,
      `"${prevSpeech.transcript}"`,
      ``,
      `Respond directly. You can:`,
      `- Challenge a specific claim or assumption they made`,
      `- Expose a contradiction with something they said earlier`,
      `- Concede a point if they scored one, then immediately pivot to a stronger angle`,
      `- Escalate — push your core argument harder`,
      ``,
      `Be direct and conversational. 2-4 sentences unless you have a critical argument to make.`,
      recentOpponent ? `\n[Recent context]\n${recentOpponent}` : '',
    ].join('\n')
  }

  // ─── LLM + TTS pipeline ───────────────────────────────────────────────────

  private async generateAndSpeak(agentId: string, turnPrompt: string): Promise<string> {
    const history = this.agentHistories.get(agentId) ?? []
    const systemPrompt = this.agentSystemPrompts.get(agentId) ?? ''
    const maxTokens = this.agentMaxTokens.get(agentId) ?? 512

    history.push({ role: 'user', content: turnPrompt })

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ]

    const textStream = streamAnthropicResponse(messages, {
      maxTokens,
      temperature: 0.82,  // slightly higher — live conversation is more spontaneous
    })

    const ttsPublisher = this.config.ttsPublishers?.get(agentId)
    const audioPublisher = this.config.audioPublishers?.get(agentId)

    let transcript: string

    if (ttsPublisher && audioPublisher?.isConnected) {
      // Full streaming pipeline with soft interrupt support
      transcript = await ttsPublisher.synthesizeAndPublish(
        this.interruptableStream(textStream, agentId),
        audioPublisher.audioSource!,
      )
    } else {
      transcript = ''
      for await (const chunk of this.interruptableStream(textStream, agentId)) {
        transcript += chunk
      }
      transcript = transcript.trim()
    }

    history.push({ role: 'assistant', content: transcript })
    return transcript
  }

  /**
   * Wraps a text stream with sentence-boundary interrupt detection.
   * If another agent requests the floor mid-speech, generation stops
   * at the next sentence boundary (., !, ?).
   */
  private async *interruptableStream(
    source: AsyncIterable<string>,
    speakerId: string,
  ): AsyncGenerator<string> {
    let sentenceBuffer = ''
    let sentenceCount = 0
    const maxSentences = 6  // hard cap per turn in live conversation

    for await (const chunk of source) {
      sentenceBuffer += chunk
      yield chunk

      // Count sentence endings
      const endings = (chunk.match(/[.!?]+\s/g) ?? []).length
      sentenceCount += endings

      // Check interrupt at sentence boundary
      if (endings > 0) {
        // Another agent requested the floor
        if (this.interruptPending && this.interruptPending !== speakerId) {
          log.info(`[INTERRUPT] ${speakerId} yielding floor to ${this.interruptPending}`)
          this.interruptPending = null
          return
        }
        // Enforce sentence cap
        if (sentenceCount >= maxSentences) {
          return
        }
      }
    }
  }

  private async generateModerator(prompt: string): Promise<string> {
    this.moderatorHistory.push({ role: 'user', content: prompt })
    const messages: LLMMessage[] = [
      { role: 'system', content: this.moderatorSystemPrompt },
      ...this.moderatorHistory,
    ]
    const text = await completeAnthropicResponse(messages, { maxTokens: 512, temperature: 0.7 })
    this.moderatorHistory.push({ role: 'assistant', content: text })
    return text
  }

  // ─── Persistence + broadcast ──────────────────────────────────────────────

  private async persistAndBroadcast(args: {
    speakerId: string
    speakerName: string
    archetype: string
    transcript: string
    isModerator: boolean
    phase: string
  }): Promise<{ turnId: string }> {
    this.turnIndex++

    const turnRecord = await persistTurn(this.db, {
      debateId: this.config.debateId,
      speakerType: args.isModerator ? 'moderator' : 'agent',
      speakerId: args.speakerId,
      roundPhase: args.phase as import('@bipi/shared').RoundPhase,
      turnIndex: this.turnIndex,
      transcript: args.transcript,
      claimTier: args.isModerator ? undefined : extractClaimTier(args.transcript),
    })

    // Broadcast to audience via LiveKit data channel
    if (this.config.roomManager && this.config.roomName) {
      await this.config.roomManager.sendData(this.config.roomName, {
        type: 'turn',
        speakerName: args.speakerName,
        speakerId: args.speakerId,
        archetype: args.archetype,
        roundPhase: args.phase,
        turnIndex: this.turnIndex,
        transcript: args.transcript,
        isModerator: args.isModerator,
        audioUrl: null,
        timestamp: new Date().toISOString(),
      }).catch(() => {})
    }

    await this.config.onTurnComplete?.({
      speakerId: args.speakerId,
      speakerName: args.speakerName,
      archetype: args.archetype,
      transcript: args.transcript,
      isModerator: args.isModerator,
      turnId: turnRecord?.id,
    })

    return { turnId: turnRecord?.id ?? '' }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async generateAndSpeakWithPersist(
    debater: DebateParticipantInfo,
    prompt: string,
    phase: string,
  ): Promise<string> {
    const transcript = await this.generateAndSpeak(debater.agentId, prompt)
    await this.persistAndBroadcast({
      speakerId: debater.agentId,
      speakerName: debater.name,
      archetype: debater.archetype,
      transcript,
      isModerator: false,
      phase,
    })
    return transcript
  }

  private injectIntoOtherAgents(speakerId: string, speakerName: string, transcript: string): void {
    const contextMsg = `[${speakerName}]: ${transcript}`
    for (const [agentId, history] of this.agentHistories) {
      if (agentId !== speakerId) {
        history.push({ role: 'user', content: contextMsg })
      }
    }
    this.moderatorHistory.push({ role: 'user', content: contextMsg })
  }

  private getNextDebater(lastSpeakerId: string): DebateParticipantInfo {
    const lastIdx = this.debaters.findIndex((d) => d.agentId === lastSpeakerId)
    const nextIdx = (lastIdx + 1) % this.debaters.length
    return this.debaters[nextIdx]!
  }

  /** Request an interrupt — the current speaker yields at the next sentence boundary */
  requestInterrupt(fromAgentId: string): void {
    this.interruptPending = fromAgentId
    log.info(`Interrupt requested by ${fromAgentId}`)
  }
}
