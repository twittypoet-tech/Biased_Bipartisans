import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient, getDebate, getDebateFormat, getDebateParticipants } from '@bipi/db'
import { compilePersonaPacket, type TopicFraming, type RoundDefinition } from '@bipi/agent-core'
import type { RoundPhase, UUID } from '@bipi/shared'

import { AgentRunner } from './agent-runner.js'
import { ModeratorRunner, type ModeratorParticipant } from './moderator-runner.js'
import {
  buildOpeningPrompt,
  buildRebuttalPrompt,
  buildPressurePrompt,
  buildClosingPrompt,
  buildContextUpdate,
  type TurnRecord,
} from './turn-prompt-builder.js'
import { DebateStateManager, type DebateParticipantInfo } from '../services/debate-state.js'
import { persistTurn, extractClaimTier, buildRoundSummary } from '../services/turn-persistence.js'

/** Result of a single turn, emitted via callback */
export interface TurnResult {
  speakerName: string
  speakerId: string
  archetype: string
  roundPhase: RoundPhase
  turnIndex: number
  transcript: string
  isModerator: boolean
}

/** Summary emitted when the debate completes */
export interface DebateCompleteSummary {
  debateId: string
  totalTurns: number
  roundsCompleted: number
  durationMs: number
  airtimeByAgent: Record<string, number>
}

/** Configuration for the orchestrator */
export interface DebateOrchestratorConfig {
  debateId: string
  onTurnComplete?: (turn: TurnResult) => void | Promise<void>
  onRoundComplete?: (phase: string, summary: string) => void | Promise<void>
  onDebateComplete?: (summary: DebateCompleteSummary) => void | Promise<void>
}

/**
 * DebateOrchestrator is the main debate engine.
 *
 * It coordinates multiple AgentRunners + one ModeratorRunner through
 * the debate's round sequence. The moderator drives round transitions,
 * assigns speaking turns, and enforces debate structure.
 *
 * Usage:
 *   const orchestrator = new DebateOrchestrator({ debateId: '...' })
 *   await orchestrator.initialize()
 *   await orchestrator.run()
 */
export class DebateOrchestrator {
  private config: DebateOrchestratorConfig
  private db: SupabaseClient
  private agents: AgentRunner[] = []
  private moderator: ModeratorRunner | null = null
  private stateManager: DebateStateManager | null = null
  private participantInfo: DebateParticipantInfo[] = []
  private roundSequence: RoundDefinition[] = []
  private topicFraming: TopicFraming | null = null
  private moderatorId: string | null = null
  private roundTurns: TurnRecord[] = []
  private allTurns: TurnRecord[] = []

  constructor(config: DebateOrchestratorConfig) {
    this.config = config
    this.db = getSupabaseClient()
  }

  /**
   * Initialize the orchestrator: load debate data, compile PersonaPackets,
   * create AgentRunners and ModeratorRunner.
   */
  async initialize(): Promise<void> {
    const { debateId } = this.config

    // 1. Load debate and format
    const debate = await getDebate(this.db, debateId)
    if (!debate) throw new Error(`Debate not found: ${debateId}`)

    const format = await getDebateFormat(this.db, debate.format_id)
    if (!format) throw new Error(`Debate format not found: ${debate.format_id}`)

    // 2. Load participants
    const participants = await getDebateParticipants(this.db, debateId)
    if (participants.length === 0) throw new Error(`No participants for debate: ${debateId}`)

    // 3. Map topic framing from DB (snake_case) to runtime (camelCase)
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

    // 4. Map round sequence from DB format
    const dbRounds = format.round_sequence as unknown as Array<Record<string, unknown>>
    this.roundSequence = dbRounds.map((r) => ({
      phase: (r.phase as string) as RoundPhase,
      durationSeconds: r.duration_seconds as number,
      speakingOrder: (r.speaking_order as string) as 'sequential' | 'directed' | 'free',
      allowInterruptions: r.allow_interruptions as boolean,
      moderatorActive: r.moderator_active as boolean,
      description: r.description as string,
    }))

    // 5. Build participant info and name map
    const participantAgentIds: UUID[] = []
    const participantNames: Record<UUID, string> = {}

    for (const p of participants) {
      const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
      const agentName = (agent?.name as string) ?? 'Unknown'
      const agentArchetype = (agent?.archetype as string) ?? 'unknown'
      const agentId = p.agent_id

      participantAgentIds.push(agentId)
      participantNames[agentId] = agentName

      this.participantInfo.push({
        agentId,
        name: agentName,
        archetype: agentArchetype,
        role: p.role as 'debater' | 'moderator',
        speakingOrder: p.speaking_order,
      })
    }

    // 6. Compile PersonaPackets and create runners
    const moderatorParticipants: ModeratorParticipant[] = []

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
        // Collect debater info for the moderator
        const debaters = this.participantInfo
          .filter((p) => p.role === 'debater')
          .map((p) => ({ name: p.name, archetype: p.archetype, agentId: p.agentId }))

        this.moderator = new ModeratorRunner(
          packet,
          debaters,
          format.moderator_behavior as Record<string, string>,
        )
        this.moderatorId = pInfo.agentId
      } else {
        this.agents.push(new AgentRunner(packet))
        moderatorParticipants.push({
          name: pInfo.name,
          archetype: pInfo.archetype,
          agentId: pInfo.agentId,
        })
      }
    }

    if (!this.moderator) {
      throw new Error('No moderator participant found in debate')
    }

    // 7. Initialize state manager
    const phases = this.roundSequence.map((r) => r.phase as RoundPhase)
    this.stateManager = new DebateStateManager(phases)

    // 8. Update debate status to LIVE
    await this.db.from('debates').update({
      status: 'live',
      started_at: new Date().toISOString(),
    }).eq('id', debateId)
  }

  /**
   * Run the full debate through all rounds.
   */
  async run(): Promise<void> {
    if (!this.stateManager || !this.moderator || !this.topicFraming) {
      throw new Error('Orchestrator not initialized. Call initialize() first.')
    }

    // Run each round
    for (let i = 0; i < this.roundSequence.length; i++) {
      const round = this.roundSequence[i]!
      await this.runRound(round)

      // Transition to next round (unless this was the last one)
      if (i < this.roundSequence.length - 1) {
        const nextRound = this.roundSequence[i + 1]!
        const summary = buildRoundSummary(
          this.roundTurns.map((t) => ({ speakerName: t.speakerName, transcript: t.transcript })),
        )

        const transition = await this.moderator.generateTransition(
          round.phase,
          nextRound.phase,
          summary,
        )

        // Persist moderator transition
        const turnIdx = this.stateManager!.recordModeratorTurn()
        await persistTurn(this.db, {
          debateId: this.config.debateId,
          speakerType: 'moderator',
          speakerId: this.moderatorId!,
          roundPhase: round.phase as RoundPhase,
          turnIndex: turnIdx,
          transcript: transition,
        })

        await this.emitTurn({
          speakerName: this.moderator.name,
          speakerId: this.moderatorId!,
          archetype: 'moderator',
          roundPhase: round.phase as RoundPhase,
          turnIndex: turnIdx,
          transcript: transition,
          isModerator: true,
        })

        // All agents hear the moderator's transition
        for (const agent of this.agents) {
          agent.addContext(buildContextUpdate({
            speakerName: this.moderator.name,
            archetype: 'moderator',
            transcript: transition,
          }))
        }

        await this.config.onRoundComplete?.(round.phase, summary)
        this.stateManager!.advanceRound()
      }

      this.roundTurns = []
    }

    // Debate complete — moderator closing
    const debateSummary = buildRoundSummary(
      this.allTurns.map((t) => ({ speakerName: t.speakerName, transcript: t.transcript })),
    )

    const closing = await this.moderator.generateClosing(debateSummary)
    const closingIdx = this.stateManager.recordModeratorTurn()
    await persistTurn(this.db, {
      debateId: this.config.debateId,
      speakerType: 'moderator',
      speakerId: this.moderatorId!,
      roundPhase: 'closing' as RoundPhase,
      turnIndex: closingIdx,
      transcript: closing,
    })

    await this.emitTurn({
      speakerName: this.moderator.name,
      speakerId: this.moderatorId!,
      archetype: 'moderator',
      roundPhase: 'closing' as RoundPhase,
      turnIndex: closingIdx,
      transcript: closing,
      isModerator: true,
    })

    // Update debate status to ENDED
    await this.db.from('debates').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    }).eq('id', this.config.debateId)

    // Emit debate complete
    const stateSum = this.stateManager.getDebateSummary()
    await this.config.onDebateComplete?.({
      debateId: this.config.debateId,
      totalTurns: stateSum.totalTurns,
      roundsCompleted: stateSum.roundsCompleted,
      durationMs: stateSum.durationMs,
      airtimeByAgent: stateSum.airtimeByAgent,
    })
  }

  /**
   * Execute a single round phase.
   */
  private async runRound(round: RoundDefinition): Promise<void> {
    const moderator = this.moderator!
    const state = this.stateManager!
    const topic = this.topicFraming!

    // Moderator opens the round
    const intro = await moderator.generateRoundIntro(
      round.phase,
      `Topic: ${topic.headline}\nConflict: ${topic.conflictDescription}`,
    )

    const introIdx = state.recordModeratorTurn()
    await persistTurn(this.db, {
      debateId: this.config.debateId,
      speakerType: 'moderator',
      speakerId: this.moderatorId!,
      roundPhase: round.phase as RoundPhase,
      turnIndex: introIdx,
      transcript: intro,
    })

    await this.emitTurn({
      speakerName: moderator.name,
      speakerId: this.moderatorId!,
      archetype: 'moderator',
      roundPhase: round.phase as RoundPhase,
      turnIndex: introIdx,
      transcript: intro,
      isModerator: true,
    })

    // All agents hear the moderator's intro
    for (const agent of this.agents) {
      agent.addContext(buildContextUpdate({
        speakerName: moderator.name,
        archetype: 'moderator',
        transcript: intro,
      }))
    }

    // Get speaking order for this phase
    const orderedDebaters = state.getSpeakingOrder(this.participantInfo)

    // Each debater takes their turn
    for (const debater of orderedDebaters) {
      const agent = this.agents.find((a) => a.agentId === debater.agentId)
      if (!agent) continue

      // Build the appropriate prompt for this phase
      const prompt = this.buildPhasePrompt(round, debater)

      // Generate the agent's response
      const startTime = Date.now()
      const transcript = await agent.generateTurn(prompt)
      const durationMs = Date.now() - startTime

      // Extract claim tier from the response
      const claimTier = extractClaimTier(transcript)

      // Record the turn in state
      const turnIdx = state.recordTurn(debater.agentId)

      // Persist to database
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

      const turnRecord: TurnRecord = {
        speakerName: debater.name,
        archetype: debater.archetype,
        transcript,
      }

      this.roundTurns.push(turnRecord)
      this.allTurns.push(turnRecord)

      // Emit the turn
      await this.emitTurn({
        speakerName: debater.name,
        speakerId: debater.agentId,
        archetype: debater.archetype,
        roundPhase: round.phase as RoundPhase,
        turnIndex: turnIdx,
        transcript,
        isModerator: false,
      })

      // All OTHER agents hear this turn
      const contextMsg = buildContextUpdate(turnRecord)
      for (const otherAgent of this.agents) {
        if (otherAgent.agentId !== debater.agentId) {
          otherAgent.addContext(contextMsg)
        }
      }

      // Moderator also hears each turn
      moderator.addContext(contextMsg)

      // Check for airtime imbalance — moderator may interject
      const imbalancedAgent = state.checkAirtimeImbalance()
      if (imbalancedAgent && round.moderatorActive) {
        const imbalancedName = this.participantInfo.find((p) => p.agentId === imbalancedAgent)?.name ?? 'an agent'
        const interjection = await moderator.generateInterjection(
          `${imbalancedName} has been dominating the conversation. Redirect to ensure balanced participation.`,
        )

        const interjectionIdx = state.recordModeratorTurn()
        await persistTurn(this.db, {
          debateId: this.config.debateId,
          speakerType: 'moderator',
          speakerId: this.moderatorId!,
          roundPhase: round.phase as RoundPhase,
          turnIndex: interjectionIdx,
          transcript: interjection,
        })

        await this.emitTurn({
          speakerName: moderator.name,
          speakerId: this.moderatorId!,
          archetype: 'moderator',
          roundPhase: round.phase as RoundPhase,
          turnIndex: interjectionIdx,
          transcript: interjection,
          isModerator: true,
        })

        for (const a of this.agents) {
          a.addContext(buildContextUpdate({
            speakerName: moderator.name,
            archetype: 'moderator',
            transcript: interjection,
          }))
        }
      }
    }
  }

  /**
   * Build the correct prompt for the current phase.
   */
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
          `Address the weakest point in your argument that has been raised.`,
        )

      case 'closing':
        return buildClosingPrompt(this.allTurns, round)

      default:
        return buildOpeningPrompt(topic, round)
    }
  }

  private async emitTurn(turn: TurnResult): Promise<void> {
    await this.config.onTurnComplete?.(turn)
  }
}
