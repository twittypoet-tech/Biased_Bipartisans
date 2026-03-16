import { createLogger } from '@bipi/shared'
import {
  getSupabaseClient,
  getScheduledDebatesDue,
  getDebateParticipants,
  getDebateFormat,
  updateDebateStatus,
} from '@bipi/db'
import { LiveKitRoomManager } from './livekit/room-manager.js'
import { LiveConversation } from './debate/live-conversation.js'
import { AudioPublisher } from './livekit/audio-publisher.js'
import { createTTSPublishers } from './workers/streaming-tts.js'
import { DebateConductor } from './retell/debate-conductor.js'

const log = createLogger('agents:scheduler')

const POLL_INTERVAL_MS = 30_000  // 30 seconds

/**
 * DebateScheduler polls for scheduled debates that are due to start.
 *
 * Freeflow debates (debate_style = 'freeflow') are run via DebateConductor,
 * which creates Retell web calls and cross-routes audio between agents.
 *
 * Structured debates use the legacy LiveConversation pipeline.
 */
export class DebateScheduler {
  private running = false
  private activeDebates = new Set<string>()
  private timer: ReturnType<typeof setInterval> | null = null
  private conductors = new Map<string, DebateConductor>()

  start(): void {
    if (this.running) return
    this.running = true

    const livekitStatus = LiveKitRoomManager.isConfigured() ? 'enabled' : 'disabled'
    const ttsStatus = process.env.ELEVENLABS_API_KEY ? 'elevenlabs-streaming' : 'disabled'
    const retellStatus = process.env.RETELL_API_KEY ? 'enabled' : 'disabled'
    log.info(
      `Scheduler started (poll every ${POLL_INTERVAL_MS / 1000}s, livekit: ${livekitStatus}, tts: ${ttsStatus}, retell: ${retellStatus})`,
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
    // Signal all active Retell conductors to stop
    for (const conductor of this.conductors.values()) {
      conductor.stop()
    }
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

        // Determine debate style from format
        const format = debate.format_id ? await getDebateFormat(db, debate.format_id) : null
        const isFreeflow = format?.debate_style === 'freeflow'

        this.activeDebates.add(debate.id)
        log.info(
          `Starting debate: "${debate.title}" (${debate.id}) — style: ${isFreeflow ? 'freeflow' : 'structured'}`,
        )

        if (isFreeflow) {
          this.runFreeflowDebate(debate.id).catch((err) => {
            const msg = err instanceof Error ? err.stack ?? err.message : JSON.stringify(err)
            log.error(`Freeflow debate ${debate.id} failed: ${msg}`)
          })
        } else {
          this.runStructuredDebate(debate.id, debate.room_name, participants).catch((err) => {
            const msg = err instanceof Error ? err.stack ?? err.message : JSON.stringify(err)
            log.error(`Structured debate ${debate.id} failed: ${msg}`)
          })
        }
      }
    } catch (err) {
      log.error('Scheduler poll error', { error: err instanceof Error ? err.message : JSON.stringify(err) })
    }
  }

  // ── Freeflow: Retell-based ────────────────────────────────────────────────

  private async runFreeflowDebate(debateId: string): Promise<void> {
    let conductor: DebateConductor
    try {
      conductor = new DebateConductor({ debateId })
    } catch (err) {
      // Constructor throws when env vars are missing — mark failed and stop retrying
      const msg = err instanceof Error ? err.message : String(err)
      log.error(`Cannot start debate ${debateId}: ${msg}`)
      this.activeDebates.delete(debateId)
      try {
        const db = getSupabaseClient()
        await updateDebateStatus(db, debateId, 'cancelled')
      } catch { /* best effort */ }
      return
    }

    this.conductors.set(debateId, conductor)

    try {
      await conductor.run()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error(`Debate ${debateId} failed: ${msg}`)
      try {
        const db = getSupabaseClient()
        await updateDebateStatus(db, debateId, 'cancelled')
      } catch { /* best effort */ }
    } finally {
      this.conductors.delete(debateId)
      this.activeDebates.delete(debateId)
    }
  }

  // ── Structured: legacy LiveConversation pipeline ──────────────────────────

  private async runStructuredDebate(
    debateId: string,
    roomName: string,
    participants: Array<{ agent_id: string; role: string; agents?: unknown }>,
  ): Promise<void> {
    const audioPublishers = new Map<string, AudioPublisher>()
    const ttsPublishers = (() => {
      if (!process.env.ELEVENLABS_API_KEY) return new Map()
      const meta = participants.map((p) => {
        const agent = (p as unknown as Record<string, unknown>).agents as
          | Record<string, unknown>
          | undefined
        return {
          agentId: p.agent_id,
          archetype: (agent?.archetype as string) ?? 'moderator',
          voiceId: null,
        }
      })
      return createTTSPublishers(meta)
    })()

    try {
      const roomManager = LiveKitRoomManager.isConfigured() ? new LiveKitRoomManager() : null

      if (roomManager) {
        try {
          await roomManager.createRoom(roomName)
          log.info(`LiveKit room created: ${roomName}`)
        } catch (err) {
          log.warn('Failed to create LiveKit room, continuing without live streaming', {
            error: String(err),
          })
        }

        const livekitUrl = process.env.LIVEKIT_URL!
        for (const p of participants) {
          const agent = (p as unknown as Record<string, unknown>).agents as
            | Record<string, unknown>
            | undefined
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
            log.warn(`Failed to connect audio publisher for ${name}`, { error: err instanceof Error ? err.message : JSON.stringify(err) })
          }
        }
      }

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
      log.error(`Debate ${debateId} error`, { error: err instanceof Error ? err.message : JSON.stringify(err) })
      try {
        const db = getSupabaseClient()
        await updateDebateStatus(db, debateId, 'cancelled')
      } catch {
        // best effort
      }
    } finally {
      for (const [, publisher] of audioPublishers) {
        await publisher.disconnect().catch(() => {})
      }
      for (const [, tts] of ttsPublishers) {
        await tts.close().catch(() => {})
      }
      this.activeDebates.delete(debateId)
    }
  }

  /**
   * Directly trigger a debate by ID — used by the web app's "Start Now" button.
   * Validates synchronously (participants, RETELL_API_KEY, retell_agent_id) so
   * errors are returned to the HTTP caller. The long-running debate run fires in
   * the background after validation passes.
   */
  async triggerDebate(debateId: string): Promise<void> {
    if (this.activeDebates.has(debateId)) {
      log.warn(`Debate ${debateId} is already active — ignoring trigger`)
      return
    }

    // ── Validate env ──────────────────────────────────────────────────────────
    if (!process.env.RETELL_API_KEY) {
      throw new Error('RETELL_API_KEY is not set on the agents service')
    }
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set on agents service')
    }

    // ── Validate participants ─────────────────────────────────────────────────
    const db = getSupabaseClient()
    const participants = await getDebateParticipants(db, debateId)
    const hasDebaters = participants.some((p) => p.role === 'debater')
    const hasModerator = participants.some((p) => p.role === 'moderator')

    if (!hasDebaters || !hasModerator) {
      throw new Error(`Debate ${debateId} is missing debaters or moderator`)
    }

    // Check that debaters have retell_agent_id — DebateConductor will skip agents
    // without one, potentially leaving < 2 relay agents and aborting.
    const missingRetell = participants
      .filter((p) => p.role === 'debater' || p.role === 'moderator')
      .filter((p) => {
        const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
        return !agent?.retell_agent_id
      })
      .map((p) => {
        const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
        return (agent?.name as string) ?? p.agent_id
      })

    if (missingRetell.length > 0) {
      throw new Error(
        `These agents are missing a Retell agent ID and cannot join the debate: ${missingRetell.join(', ')}. ` +
        `Set retell_agent_id on each agent in Supabase.`,
      )
    }

    // ── All good — fire and track ─────────────────────────────────────────────
    this.activeDebates.add(debateId)
    log.info(`Direct trigger: starting freeflow debate ${debateId}`)

    this.runFreeflowDebate(debateId).catch((err) => {
      log.error(`Triggered freeflow debate ${debateId} failed`, { error: err instanceof Error ? err.message : JSON.stringify(err) })
    })
  }

  get activeCount(): number {
    return this.activeDebates.size
  }
}
