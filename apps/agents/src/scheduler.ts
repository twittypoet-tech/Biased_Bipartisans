import { createLogger } from '@bipi/shared'
import { getSupabaseClient, getScheduledDebatesDue, getDebateParticipants, updateDebateStatus, updateTurnAudioUrl } from '@bipi/db'
import { DebateOrchestrator } from './debate/orchestrator.js'
import { DebateRoomBridge } from './livekit/debate-room.js'
import { LiveKitRoomManager } from './livekit/room-manager.js'
import { VoiceSynthesizer } from './services/voice-synthesizer.js'
import type { VoiceProvider } from './voice/types.js'

const log = createLogger('agents:scheduler')

const POLL_INTERVAL_MS = 30_000 // 30 seconds

/**
 * DebateScheduler polls for scheduled debates that are due to start,
 * then runs the full DebateOrchestrator + voice pipeline for each.
 *
 * Voice (TTS + storage) works independently of LiveKit.
 * LiveKit is optional — only used for live streaming when configured.
 */
export class DebateScheduler {
  private running = false
  private activeDebates = new Set<string>()
  private voiceProvider: VoiceProvider | null = null
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(voiceProvider?: VoiceProvider) {
    this.voiceProvider = voiceProvider ?? null
  }

  start(): void {
    if (this.running) return
    this.running = true

    const livekitStatus = LiveKitRoomManager.isConfigured() ? 'enabled' : 'disabled'
    log.info(
      `Scheduler started (poll every ${POLL_INTERVAL_MS / 1000}s, voice: ${this.voiceProvider ? 'enabled' : 'disabled'}, livekit: ${livekitStatus})`,
    )

    this.poll()
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS)
  }

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

        const participants = await getDebateParticipants(db, debate.id)
        const hasDebaters = participants.some((p) => p.role === 'debater')
        const hasModerator = participants.some((p) => p.role === 'moderator')

        if (!hasDebaters || !hasModerator) {
          log.warn(`Debate ${debate.id} is due but missing participants — skipping`)
          continue
        }

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
    let synthesizer: VoiceSynthesizer | null = null

    try {
      // --- Voice synthesizer (works without LiveKit) ---
      if (this.voiceProvider) {
        synthesizer = new VoiceSynthesizer(this.voiceProvider)
        log.info(`Voice synthesizer ready for debate ${debateId}`)
      }

      // --- LiveKit bridge (optional, for live streaming) ---
      if (LiveKitRoomManager.isConfigured()) {
        try {
          bridge = new DebateRoomBridge()
          await bridge.connect(`debate-${debateId}`)
          log.info(`LiveKit room created for debate ${debateId}`)
        } catch (err) {
          log.warn(`LiveKit room creation failed, continuing without live streaming`, { error: String(err) })
          bridge = null
        }
      }

      const orchestrator = new DebateOrchestrator({
        debateId,
        onTurnComplete: async (turn) => {
          const label = turn.isModerator ? '[MOD]' : `[${turn.archetype.toUpperCase()}]`
          log.info(`${label} ${turn.speakerName}: ${turn.transcript.slice(0, 120)}...`)

          let audioUrl: string | null = null

          // 1. Synthesize TTS + save to storage (independent of LiveKit)
          if (synthesizer) {
            const result = await synthesizer.synthesizeTurn(
              debateId,
              turn.speakerId,
              turn.speakerName,
              turn.turnIndex,
              turn.transcript,
            )
            audioUrl = result.audioUrl

            // 2. Optionally stream live audio via LiveKit
            if (bridge && result.pcmBuffer && result.pcmBuffer.length > 0) {
              await bridge.publishAudio(turn.speakerId, result.pcmBuffer)
            }
          }

          // 3. Persist audio URL to the turn row
          if (audioUrl) {
            try {
              const db = getSupabaseClient()
              await updateTurnAudioUrl(db, debateId, turn.turnIndex, audioUrl)
            } catch (err) {
              log.warn(`Failed to save audio URL for turn ${turn.turnIndex}`, { error: String(err) })
            }
          }

          // 4. Broadcast turn data via LiveKit (text + audio URL)
          if (bridge) {
            await bridge.broadcastTurnData(turn, audioUrl)
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

      // Register voice agents with the synthesizer
      if (synthesizer) {
        const participants = orchestrator.getParticipants()
        synthesizer.registerAgents(
          participants.map((p) => ({
            agentId: p.agentId,
            archetype: p.archetype,
            voiceId: null,
          })),
        )
      }

      // Set up LiveKit audio publishers (only if LiveKit is running)
      if (bridge) {
        const participants = orchestrator.getParticipants()
        await bridge.setupVoicePublishers(
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
