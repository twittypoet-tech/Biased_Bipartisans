import { createLogger } from '@bipi/shared'
import { getSupabaseClient, getScheduledDebatesDue, getDebateParticipants, updateDebateStatus } from '@bipi/db'
import { DebateOrchestrator } from './debate/orchestrator.js'
import { DebateRoomBridge } from './livekit/debate-room.js'
import { LiveKitRoomManager } from './livekit/room-manager.js'
import type { VoiceProvider } from './voice/types.js'

const log = createLogger('agents:scheduler')

const POLL_INTERVAL_MS = 30_000 // 30 seconds

/**
 * DebateScheduler polls for scheduled debates that are due to start,
 * then runs the full DebateOrchestrator + voice pipeline for each.
 */
export class DebateScheduler {
  private running = false
  private activeDebates = new Set<string>()
  private voiceProvider: VoiceProvider | null = null
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(voiceProvider?: VoiceProvider) {
    this.voiceProvider = voiceProvider ?? null
  }

  /**
   * Start the polling loop.
   */
  start(): void {
    if (this.running) return
    this.running = true

    log.info(
      `Scheduler started (poll every ${POLL_INTERVAL_MS / 1000}s, voice: ${this.voiceProvider ? 'enabled' : 'disabled'})`,
    )

    // Run immediately, then on interval
    this.poll()
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS)
  }

  /**
   * Stop the polling loop.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.running = false
    log.info('Scheduler stopped')
  }

  private async poll(): Promise<void> {
    try {
      const db = getSupabaseClient()
      const dueDebates = await getScheduledDebatesDue(db)

      for (const debate of dueDebates) {
        if (this.activeDebates.has(debate.id)) continue

        // Check it has participants
        const participants = await getDebateParticipants(db, debate.id)
        const hasDebaters = participants.some((p) => p.role === 'debater')
        const hasModerator = participants.some((p) => p.role === 'moderator')

        if (!hasDebaters || !hasModerator) {
          log.warn(`Debate ${debate.id} is due but missing participants — skipping`)
          continue
        }

        // Start the debate in the background
        this.activeDebates.add(debate.id)
        log.info(`Starting debate: ${debate.title} (${debate.id})`)
        this.runDebate(debate.id).catch((err) => {
          log.error(`Debate ${debate.id} failed`, { error: String(err) })
        })
      }
    } catch (err) {
      log.error('Scheduler poll error', { error: String(err) })
    }
  }

  private async runDebate(debateId: string): Promise<void> {
    let bridge: DebateRoomBridge | null = null

    try {
      // Set up LiveKit room bridge with voice
      if (LiveKitRoomManager.isConfigured()) {
        bridge = new DebateRoomBridge(this.voiceProvider ?? undefined)
        await bridge.connect(`debate-${debateId}`)
      }

      const orchestrator = new DebateOrchestrator({
        debateId,
        onTurnComplete: async (turn) => {
          const label = turn.isModerator ? '[MOD]' : `[${turn.archetype.toUpperCase()}]`
          log.info(`${label} ${turn.speakerName}: ${turn.transcript.slice(0, 120)}...`)

          if (bridge) {
            await bridge.publishTurn(turn)
          }
        },
        onRoundComplete: async (phase, summary) => {
          log.info(`Round complete: ${phase}`)
          if (bridge) {
            await bridge.publishRoundComplete(phase, summary)
          }
        },
        onDebateComplete: async (summary) => {
          log.info(`Debate complete: ${debateId}`, {
            turns: summary.totalTurns,
            rounds: summary.roundsCompleted,
            durationMs: summary.durationMs,
          })
          if (bridge) {
            await bridge.disconnect()
          }
        },
      })

      await orchestrator.initialize()

      // Set up voice agents
      if (bridge?.voiceEnabled) {
        const participants = orchestrator.getParticipants()
        await bridge.setupVoiceAgents(
          participants.map((p) => ({
            agentId: p.agentId,
            name: p.name,
            archetype: p.archetype,
            voiceId: null,
          })),
        )
      }

      await orchestrator.run()

      log.info(`Debate ${debateId} finished successfully`)
    } catch (err) {
      log.error(`Debate ${debateId} error`, { error: String(err) })

      // Mark as cancelled if it failed during execution
      try {
        const db = getSupabaseClient()
        await updateDebateStatus(db, debateId, 'cancelled')
      } catch {
        // best effort
      }

      if (bridge) {
        try {
          await bridge.disconnect()
        } catch {
          // best effort cleanup
        }
      }
    } finally {
      this.activeDebates.delete(debateId)
    }
  }

  get activeCount(): number {
    return this.activeDebates.size
  }
}
