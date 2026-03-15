import { createLogger } from '@bipi/shared'
import { getSupabaseClient, getScheduledDebatesDue, getDebateParticipants, updateDebateStatus } from '@bipi/db'
import { LiveKitRoomManager } from './livekit/room-manager.js'
import { LiveConversation } from './debate/live-conversation.js'
import { AudioPublisher } from './livekit/audio-publisher.js'
import { createTTSPublishers } from './workers/streaming-tts.js'

const log = createLogger('agents:scheduler')

const POLL_INTERVAL_MS = 30_000 // 30 seconds

/**
 * DebateScheduler polls for scheduled debates that are due to start.
 *
 * When the debate-worker is running as a LiveKit Worker (registered via
 * `cli.runApp`), this scheduler simply creates the LiveKit room — LiveKit
 * automatically dispatches the job to the registered worker process.
 *
 * When running without a separate worker (standalone mode, e.g. development),
 * the scheduler runs LiveConversation directly in-process using the
 * streaming TTS pipeline.
 *
 * Either way, voice synthesis now uses ElevenLabs streaming TTS (sentence-level
 * streaming via WebSocket) instead of the old batch OpenAI TTS + Supabase upload.
 */
export class DebateScheduler {
  private running = false
  private activeDebates = new Set<string>()
  private timer: ReturnType<typeof setInterval> | null = null

  start(): void {
    if (this.running) return
    this.running = true

    const livekitStatus = LiveKitRoomManager.isConfigured() ? 'enabled' : 'disabled'
    const ttsStatus = process.env.ELEVENLABS_API_KEY ? 'elevenlabs-streaming' : 'disabled'
    log.info(`Scheduler started (poll every ${POLL_INTERVAL_MS / 1000}s, livekit: ${livekitStatus}, tts: ${ttsStatus})`)

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

        this.runDebate(debate.id, debate.room_name, participants).catch((err) => {
          log.error(`Debate ${debate.id} failed`, { error: String(err) })
        })
      }
    } catch (err) {
      log.error('Scheduler poll error', { error: String(err) })
    }
  }

  private async runDebate(
    debateId: string,
    roomName: string,
    participants: Array<{ agent_id: string; role: string; agents?: unknown }>,
  ): Promise<void> {
    const audioPublishers = new Map<string, AudioPublisher>()
    const ttsPublishers = (() => {
      if (!process.env.ELEVENLABS_API_KEY) return new Map()
      const meta = participants.map((p) => {
        const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
        return {
          agentId: p.agent_id,
          archetype: (agent?.archetype as string) ?? 'moderator',
          voiceId: null,
        }
      })
      return createTTSPublishers(meta)
    })()

    try {
      // Create LiveKit room — if using separate worker process, this triggers job dispatch
      const roomManager = LiveKitRoomManager.isConfigured() ? new LiveKitRoomManager() : null

      if (roomManager) {
        try {
          await roomManager.createRoom(roomName)
          log.info(`LiveKit room created: ${roomName}`)
        } catch (err) {
          log.warn(`Failed to create LiveKit room, continuing without live streaming`, { error: String(err) })
        }

        // Connect audio publishers (one LiveKit participant per agent)
        const livekitUrl = process.env.LIVEKIT_URL!
        for (const p of participants) {
          const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
          const name = (agent?.name as string) ?? 'Unknown'
          const publisher = new AudioPublisher(name)
          const token = await roomManager.generateToken(
            roomName,
            name,
            `agent-${name.toLowerCase().replace(/\s+/g, '-')}`,
            'publisher',
          )

          try {
            await publisher.connect(livekitUrl, token)
            audioPublishers.set(p.agent_id, publisher)
          } catch (err) {
            log.warn(`Failed to connect audio publisher for ${name}`, { error: String(err) })
          }
        }
      }

      // Run the live reactive conversation
      const conversation = new LiveConversation({
        debateId,
        maxExchanges: 10,
        audienceCheckInterval: 3,
        ttsPublishers,
        audioPublishers,
        roomManager: roomManager ?? undefined,
        roomName,
        onDebateComplete: async (summary) => {
          log.info(`Debate complete: ${debateId}`, {
            turns: summary.totalTurns,
            durationMs: summary.durationMs,
          })
        },
      })

      await conversation.initialize()
      await conversation.run()

      log.info(`Debate ${debateId} finished successfully`)
    } catch (err) {
      log.error(`Debate ${debateId} error`, { error: String(err) })

      try {
        const db = getSupabaseClient()
        await updateDebateStatus(db, debateId, 'cancelled')
      } catch {
        // best effort
      }
    } finally {
      // Cleanup
      for (const [, publisher] of audioPublishers) {
        await publisher.disconnect().catch(() => {})
      }
      for (const [, tts] of ttsPublishers) {
        await tts.close().catch(() => {})
      }
      this.activeDebates.delete(debateId)
    }
  }

  get activeCount(): number {
    return this.activeDebates.size
  }
}
