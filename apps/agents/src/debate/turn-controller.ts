import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient, getDebate, getDebateFormat, getDebateParticipants } from '@bipi/db'
import { compilePersonaPacket, createRuntimeInstructions, createModeratorInstructions, type TopicFraming, type RoundDefinition } from '@bipi/agent-core'
import type { RoundPhase, UUID } from '@bipi/shared'
import { createLogger } from '@bipi/shared'

import { DebateStateManager, type DebateParticipantInfo } from '../services/debate-state.js'
import { persistTurn, extractClaimTier, buildRoundSummary } from '../services/turn-persistence.js'
import {
  buildOpeningPrompt,
  buildRebuttalPrompt,
  buildPressurePrompt,
  buildClosingPrompt,
  buildContextUpdate,
  type TurnRecord,
} from './turn-prompt-builder.js'
import type { LLMMessage } from '../llm/types.js'
import { streamAnthropicResponse, completeAnthropicResponse } from '../workers/anthropic-stream.js'
import type { StreamingTTSPublisher } from '../workers/streaming-tts.js'
import type { AudioPublisher } from '../livekit/audio-publisher.js'
import { LiveKitRoomManager } from '../livekit/room-manager.js'

const log = createLogger('agents:turn-controller')

export interface TurnResult {
  speakerName: string
  speakerId: string
  archetype: string
  roundPhase: RoundPhase
  turnIndex: number
  transcript: string
  isModerator: boolean
}

export interface DebateCompleteSummary {
  debateId: string
  totalTurns: number
  roundsCompleted: number
  durationMs: number
  airtimeByAgent: Record<string, number>
}

export interface TurnControllerConfig {
  debateId: string
  /** Per-agent streaming TTS publishers. If absent, voice synthesis is skipped. */
  ttsPublishers?: Map<string, StreamingTTSPublisher>
  /** Per-agent LiveKit audio sources for streaming audio to the room. */
  audioPublishers?: Map<string, AudioPublisher>
  /** LiveKit room manager for broadcasting data messages. */
  roomManager?: LiveKitRoomManager
  roomName?: string
  onTurnComplete?: (turn: TurnResult) => void | Promise<void>
  onRoundComplete?: (phase: string, summary: string) => void | Promise<void>
  onDebateComplete?: (summary: DebateCompleteSummary) => void | Promise<void>
}

/**
 * TurnController is the streaming-powered replacement for DebateOrchestrator.
 *
 * Key difference from the old orchestrator:
 * - LLM calls use Anthropic STREAMING (text arrives token by token)
 * - TTS synthesis uses ElevenLabs STREAMING (audio arrives sentence by sentence)
 * - Both are pipelined: audio starts playing before the LLM has finished generating
 *
 * Everything else (turn sequencing, state management, persistence, prompt builders)
 * is unchanged from the original orchestrator.
 *
 * Latency improvement:
 *   Before: ~8-15s per turn (full LLM → full TTS → upload → publish)
 *   After:  ~300-500ms to first word (streaming LLM → streaming TTS → live publish)
 */
export class TurnController {
  private config: TurnControllerConfig
  private db: SupabaseClient

  // State — set during initialize()
  private agentHistories = new Map<string, LLMMessage[]>()
  private agentSystemPrompts = new Map<string, string>()
  private agentPackets = new Map<string, { name: string; archetype: string; maxTokens: number }>()
  private moderatorHistory: LLMMessage[] = []
  private moderatorSystemPrompt = ''
  private moderatorId = ''
  private moderatorName = ''
  private participantInfo: DebateParticipantInfo[] = []
  private roundSequence: RoundDefinition[] = []
  private topicFraming: TopicFraming | null = null
  private stateManager: DebateStateManager | null = null
  private roundTurns: TurnRecord[] = []
  private allTurns: TurnRecord[] = []

  constructor(config: TurnControllerConfig) {
    this.config = config
    this.db = getSupabaseClient()
  }

  async initialize(): Promise<void> {
    const { debateId } = this.config

    const debate = await getDebate(this.db, debateId)
    if (!debate) throw new Error(`Debate not found: ${debateId}`)

    const format = await getDebateFormat(this.db, debate.format_id)
    if (!format) throw new Error(`Debate format not found: ${debate.format_id}`)

    const participants = await getDebateParticipants(this.db, debateId)
    if (participants.length === 0) throw new Error(`No participants for debate: ${debateId}`)

    // Map topic framing
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

    // Map round sequence
    const dbRounds = format.round_sequence as unknown as Array<Record<string, unknown>>
    this.roundSequence = dbRounds.map((r) => ({
      phase: (r.phase as string) as RoundPhase,
      durationSeconds: r.duration_seconds as number,
      speakingOrder: (r.speaking_order as string) as 'sequential' | 'directed' | 'free',
      allowInterruptions: r.allow_interruptions as boolean,
      moderatorActive: r.moderator_active as boolean,
      description: r.description as string,
    }))

    const participantAgentIds: UUID[] = []
    const participantNames: Record<UUID, string> = {}

    for (const p of participants) {
      const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
      const name = (agent?.name as string) ?? 'Unknown'
      const archetype = (agent?.archetype as string) ?? 'unknown'
      participantAgentIds.push(p.agent_id)
      participantNames[p.agent_id] = name

      this.participantInfo.push({
        agentId: p.agent_id,
        name,
        archetype,
        role: p.role as 'debater' | 'moderator',
        speakingOrder: p.speaking_order,
      })
    }

    // Compile PersonaPackets and build system prompts / histories
    const moderatorDebaters = this.participantInfo
      .filter((p) => p.role === 'debater')
      .map((p) => ({ name: p.name, archetype: p.archetype, agentId: p.agentId }))

    for (const pInfo of this.participantInfo) {
      const packet = await compilePersonaPacket(this.db, {
        agentId: pInfo.agentId,
        debateId,
        roomName: debate.room_name,
        topicFraming: this.topicFraming,
        roundSequence: this.roundSequence,
        participantAgentIds,
        participantNames,
      })

      if (pInfo.role === 'moderator') {
        this.moderatorId = pInfo.agentId
        this.moderatorName = pInfo.name
        this.moderatorSystemPrompt = createModeratorInstructions(
          packet,
          moderatorDebaters,
          format.moderator_behavior as Record<string, string>,
        )
        this.moderatorHistory = []
      } else {
        this.agentSystemPrompts.set(pInfo.agentId, createRuntimeInstructions(packet))
        this.agentHistories.set(pInfo.agentId, [])
        this.agentPackets.set(pInfo.agentId, {
          name: pInfo.name,
          archetype: pInfo.archetype,
          maxTokens: packet.runtimeConstraints.maxTurnLengthTokens,
        })
      }
    }

    if (!this.moderatorId) throw new Error('No moderator participant found')

    const phases = this.roundSequence.map((r) => r.phase as RoundPhase)
    this.stateManager = new DebateStateManager(phases)

    await this.db.from('debates').update({
      status: 'live',
      started_at: new Date().toISOString(),
    }).eq('id', debateId)

    log.info(`TurnController initialized for debate ${debateId} with ${this.participantInfo.length} participants`)
  }

  getParticipants(): DebateParticipantInfo[] {
    return [...this.participantInfo]
  }

  async run(): Promise<void> {
    if (!this.stateManager || !this.topicFraming) {
      throw new Error('TurnController not initialized. Call initialize() first.')
    }

    for (let i = 0; i < this.roundSequence.length; i++) {
      const round = this.roundSequence[i]!
      await this.runRound(round)

      if (i < this.roundSequence.length - 1) {
        const nextRound = this.roundSequence[i + 1]!
        const summary = buildRoundSummary(
          this.roundTurns.map((t) => ({ speakerName: t.speakerName, transcript: t.transcript })),
        )

        const transition = await this.generateModerator(
          [
            `The ${round.phase} round has ended. You are transitioning to the ${nextRound.phase} round.`,
            `Here is what happened in the ${round.phase} round:`,
            summary,
            'Briefly summarize the key disagreements that emerged.',
            'Then frame what the next round should address.',
            'Be concise — 3-4 sentences max.',
          ].join('\n'),
        )

        const turnIdx = this.stateManager.recordModeratorTurn()
        await persistTurn(this.db, {
          debateId: this.config.debateId,
          speakerType: 'moderator',
          speakerId: this.moderatorId,
          roundPhase: round.phase as RoundPhase,
          turnIndex: turnIdx,
          transcript: transition,
        })

        const turnResult: TurnResult = {
          speakerName: this.moderatorName,
          speakerId: this.moderatorId,
          archetype: 'moderator',
          roundPhase: round.phase as RoundPhase,
          turnIndex: turnIdx,
          transcript: transition,
          isModerator: true,
        }

        await this.deliverSpeech(this.moderatorId, transition, turnResult)
        this.addContextToAllAgents(buildContextUpdate({ speakerName: this.moderatorName, archetype: 'moderator', transcript: transition }))

        await this.config.onRoundComplete?.(round.phase, summary)
        this.stateManager.advanceRound()
      }

      this.roundTurns = []
    }

    // Moderator closing
    const debateSummary = buildRoundSummary(
      this.allTurns.map((t) => ({ speakerName: t.speakerName, transcript: t.transcript })),
    )

    const closing = await this.generateModerator(
      [
        'The debate has concluded. Deliver your closing moderation.',
        'Here is a summary of the full debate:',
        debateSummary,
        'Identify the 2-3 key unresolved tensions.',
        'Note where each participant was strongest and weakest.',
        'Do NOT declare a winner. Leave the audience to decide.',
        'Be concise but substantive — aim for 4-6 sentences.',
      ].join('\n'),
    )

    const closingIdx = this.stateManager.recordModeratorTurn()
    await persistTurn(this.db, {
      debateId: this.config.debateId,
      speakerType: 'moderator',
      speakerId: this.moderatorId,
      roundPhase: 'closing' as RoundPhase,
      turnIndex: closingIdx,
      transcript: closing,
    })

    const closingResult: TurnResult = {
      speakerName: this.moderatorName,
      speakerId: this.moderatorId,
      archetype: 'moderator',
      roundPhase: 'closing' as RoundPhase,
      turnIndex: closingIdx,
      transcript: closing,
      isModerator: true,
    }

    await this.deliverSpeech(this.moderatorId, closing, closingResult)

    await this.db.from('debates').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    }).eq('id', this.config.debateId)

    const stateSum = this.stateManager.getDebateSummary()
    await this.config.onDebateComplete?.({
      debateId: this.config.debateId,
      totalTurns: stateSum.totalTurns,
      roundsCompleted: stateSum.roundsCompleted,
      durationMs: stateSum.durationMs,
      airtimeByAgent: stateSum.airtimeByAgent,
    })
  }

  private async runRound(round: RoundDefinition): Promise<void> {
    const state = this.stateManager!
    const topic = this.topicFraming!

    // Moderator round intro
    const intro = await this.generateModerator(
      [
        `You are opening the ${round.phase} round.`,
        `Topic: ${topic.headline}`,
        `Conflict: ${topic.conflictDescription}`,
        'Frame a clear, tension-creating question for the participants.',
        'Set the stakes for this round. Be concise — 2-3 sentences max.',
      ].join('\n'),
    )

    const introIdx = state.recordModeratorTurn()
    await persistTurn(this.db, {
      debateId: this.config.debateId,
      speakerType: 'moderator',
      speakerId: this.moderatorId,
      roundPhase: round.phase as RoundPhase,
      turnIndex: introIdx,
      transcript: intro,
    })

    const introResult: TurnResult = {
      speakerName: this.moderatorName,
      speakerId: this.moderatorId,
      archetype: 'moderator',
      roundPhase: round.phase as RoundPhase,
      turnIndex: introIdx,
      transcript: intro,
      isModerator: true,
    }

    await this.deliverSpeech(this.moderatorId, intro, introResult)
    this.addContextToAllAgents(buildContextUpdate({ speakerName: this.moderatorName, archetype: 'moderator', transcript: intro }))

    // Debater turns
    const orderedDebaters = state.getSpeakingOrder(this.participantInfo)

    for (const debater of orderedDebaters) {
      const prompt = this.buildPhasePrompt(round, debater)
      const agentInfo = this.agentPackets.get(debater.agentId)!

      // Stream LLM → TTS → LiveKit simultaneously
      const startTime = Date.now()
      const transcript = await this.generateAgentTurnStreaming(debater.agentId, prompt)
      const durationMs = Date.now() - startTime

      const claimTier = extractClaimTier(transcript)
      const turnIdx = state.recordTurn(debater.agentId)

      await persistTurn(this.db, {
        debateId: this.config.debateId,
        speakerType: 'agent',
        speakerId: debater.agentId,
        roundPhase: round.phase as RoundPhase,
        turnIndex: turnIdx,
        transcript,
        claimTier,
        durationMs,
      })

      const turnRecord: TurnRecord = { speakerName: debater.name, archetype: debater.archetype, transcript }
      this.roundTurns.push(turnRecord)
      this.allTurns.push(turnRecord)

      const turnResult: TurnResult = {
        speakerName: debater.name,
        speakerId: debater.agentId,
        archetype: debater.archetype,
        roundPhase: round.phase as RoundPhase,
        turnIndex: turnIdx,
        transcript,
        isModerator: false,
      }

      await this.config.onTurnComplete?.(turnResult)

      // Broadcast data message to audience
      if (this.config.roomManager && this.config.roomName) {
        await this.config.roomManager.sendData(this.config.roomName, {
          type: 'turn',
          speakerName: turnResult.speakerName,
          speakerId: turnResult.speakerId,
          archetype: turnResult.archetype,
          roundPhase: turnResult.roundPhase,
          turnIndex: turnResult.turnIndex,
          transcript: turnResult.transcript,
          isModerator: false,
          audioUrl: null,  // streaming — no URL needed
          timestamp: new Date().toISOString(),
        })
      }

      // All other agents hear this turn
      const contextMsg = buildContextUpdate(turnRecord)
      for (const otherInfo of this.participantInfo) {
        if (otherInfo.agentId !== debater.agentId && otherInfo.role === 'debater') {
          this.agentHistories.get(otherInfo.agentId)?.push({ role: 'user', content: contextMsg })
        }
      }
      this.moderatorHistory.push({ role: 'user', content: contextMsg })

      // Moderator airtime check
      const imbalancedAgent = state.checkAirtimeImbalance()
      if (imbalancedAgent && round.moderatorActive) {
        const imbalancedName = this.participantInfo.find((p) => p.agentId === imbalancedAgent)?.name ?? 'an agent'
        const interjection = await this.generateModerator(
          `You need to interject mid-round.\n${imbalancedName} has been dominating the conversation. Redirect to ensure balanced participation.\nBe direct and brief — 1-2 sentences. Stay neutral on substance.`,
        )

        const interjectionIdx = state.recordModeratorTurn()
        await persistTurn(this.db, {
          debateId: this.config.debateId,
          speakerType: 'moderator',
          speakerId: this.moderatorId,
          roundPhase: round.phase as RoundPhase,
          turnIndex: interjectionIdx,
          transcript: interjection,
        })

        const interjectionResult: TurnResult = {
          speakerName: this.moderatorName,
          speakerId: this.moderatorId,
          archetype: 'moderator',
          roundPhase: round.phase as RoundPhase,
          turnIndex: interjectionIdx,
          transcript: interjection,
          isModerator: true,
        }

        await this.deliverSpeech(this.moderatorId, interjection, interjectionResult)
        this.addContextToAllAgents(buildContextUpdate({ speakerName: this.moderatorName, archetype: 'moderator', transcript: interjection }))
      }

      log.info(`[${agentInfo.archetype.toUpperCase()}] ${debater.name}: ${transcript.slice(0, 120)}...`)
    }
  }

  /**
   * Generate an agent's turn using STREAMING Anthropic + STREAMING ElevenLabs TTS.
   *
   * The key latency improvement: LLM and TTS run in parallel — audio starts
   * playing as soon as the first sentences are generated, not after the full response.
   */
  private async generateAgentTurnStreaming(agentId: string, turnPrompt: string): Promise<string> {
    const history = this.agentHistories.get(agentId) ?? []
    const systemPrompt = this.agentSystemPrompts.get(agentId) ?? ''
    const agentInfo = this.agentPackets.get(agentId)!

    history.push({ role: 'user', content: turnPrompt })

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ]

    const textStream = streamAnthropicResponse(messages, {
      maxTokens: agentInfo.maxTokens,
      temperature: 0.8,
    })

    const ttsPublisher = this.config.ttsPublishers?.get(agentId)
    const audioPublisher = this.config.audioPublishers?.get(agentId)

    let transcript: string

    if (ttsPublisher && audioPublisher?.isConnected) {
      // TRUE STREAMING: LLM text → ElevenLabs → LiveKit audio, all in parallel
      transcript = await ttsPublisher.synthesizeAndPublish(textStream, audioPublisher.audioSource!)
    } else {
      // Fallback: collect full text without TTS (voice not configured)
      transcript = ''
      for await (const chunk of textStream) {
        transcript += chunk
      }
      transcript = transcript.trim()
    }

    history.push({ role: 'assistant', content: transcript })
    return transcript
  }

  /**
   * Generate moderator text (non-streaming — moderator only needs text, not streamed voice).
   * For voice, moderator speech is also synthesized via streaming TTS.
   */
  private async generateModerator(prompt: string): Promise<string> {
    this.moderatorHistory.push({ role: 'user', content: prompt })

    const messages: LLMMessage[] = [
      { role: 'system', content: this.moderatorSystemPrompt },
      ...this.moderatorHistory,
    ]

    const text = await completeAnthropicResponse(messages, {
      maxTokens: 512,
      temperature: 0.7,
    })

    this.moderatorHistory.push({ role: 'assistant', content: text })
    return text
  }

  /**
   * Deliver moderator speech: synthesize + publish + emit callback.
   * Moderator voice uses streaming TTS if configured.
   */
  private async deliverSpeech(speakerId: string, text: string, turnResult: TurnResult): Promise<void> {
    const ttsPublisher = this.config.ttsPublishers?.get(speakerId)
    const audioPublisher = this.config.audioPublishers?.get(speakerId)

    if (ttsPublisher && audioPublisher?.isConnected) {
      async function* textToStream(t: string) { yield t }
      await ttsPublisher.synthesizeAndPublish(textToStream(text), audioPublisher.audioSource!)
    }

    // Broadcast data message to audience
    if (this.config.roomManager && this.config.roomName) {
      await this.config.roomManager.sendData(this.config.roomName, {
        type: 'turn',
        speakerName: turnResult.speakerName,
        speakerId: turnResult.speakerId,
        archetype: turnResult.archetype,
        roundPhase: turnResult.roundPhase,
        turnIndex: turnResult.turnIndex,
        transcript: turnResult.transcript,
        isModerator: turnResult.isModerator,
        audioUrl: null,
        timestamp: new Date().toISOString(),
      })
    }

    await this.config.onTurnComplete?.(turnResult)
  }

  private buildPhasePrompt(round: RoundDefinition, debater: DebateParticipantInfo): string {
    const topic = this.topicFraming!

    switch (round.phase) {
      case 'opening':
        return buildOpeningPrompt(topic, round)
      case 'rebuttal':
        return buildRebuttalPrompt(this.roundTurns, round)
      case 'pressure':
        return buildPressurePrompt(
          this.allTurns,
          round,
          'Address the weakest point in your argument that has been raised.',
        )
      case 'closing':
        return buildClosingPrompt(this.allTurns, round)
      default:
        return buildOpeningPrompt(topic, round)
    }
  }

  private addContextToAllAgents(contextMsg: string): void {
    for (const [agentId, history] of this.agentHistories) {
      history.push({ role: 'user', content: contextMsg })
    }
  }
}
