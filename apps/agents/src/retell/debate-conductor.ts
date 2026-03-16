import Retell from 'retell-sdk'
import { createLogger } from '@bipi/shared'
import {
  getSupabaseClient,
  getDebate,
  getDebateFormat,
  getDebateParticipants,
  updateDebateStatus,
  saveDebateRecording,
} from '@bipi/db'
import { LiveKitRoomManager } from '../livekit/room-manager.js'
import { AudioRelay, type RelayAgent } from './audio-relay.js'
import { LiveTranscriptPoller, type PollerAgent } from './live-transcript-poller.js'
import { collectTranscripts } from './transcript-collector.js'
import type { Agent } from '@bipi/shared'

const log = createLogger('agents:retell:conductor')

export interface DebateConductorConfig {
  debateId: string
}

type ParticipantWithAgent = {
  agent_id: string
  role: string
  agents: Agent
}

/**
 * DebateConductor orchestrates a freeflow Retell-based debate end-to-end.
 *
 * 1. Load debate + format + participants from DB
 * 2. Create one Retell web call per participant (using their retell_agent_id)
 * 3. Update debate status → "live"
 * 4. Set up public LiveKit room with one participant per agent (for speaker highlighting)
 * 5. Start AudioRelay — cross-routes audio between all Retell call rooms
 * 6. Start LiveTranscriptPoller — polls Retell every 3s, writes turns to DB
 *    → Supabase Realtime delivers turns to the browser as they happen
 * 7. Run for max_duration_minutes
 * 8. Stop poller + disconnect relay (agents go silent → Retell ends calls)
 * 9. Broadcast "debate_complete" to the LiveKit room
 * 10. Collect final transcripts + recording URLs from Retell
 * 11. Update debate status → "ended"
 */
export class DebateConductor {
  private retell: Retell
  private relay: AudioRelay | null = null
  private poller: LiveTranscriptPoller | null = null
  private callIds = new Map<string, string>()      // agentId → retellCallId
  private callStartTimes = new Map<string, Date>() // agentId → when createWebCall returned
  private stopped = false

  constructor(private config: DebateConductorConfig) {
    const apiKey = process.env.RETELL_API_KEY
    if (!apiKey) throw new Error('RETELL_API_KEY is required')
    this.retell = new Retell({ apiKey })
  }

  async run(): Promise<void> {
    const db = getSupabaseClient()

    // ── 1. Load debate ────────────────────────────────────────────────────────
    const debate = await getDebate(db, this.config.debateId)
    if (!debate) throw new Error(`Debate not found: ${this.config.debateId}`)

    const format = debate.format_id ? await getDebateFormat(db, debate.format_id) : null
    const participants = await getDebateParticipants(
      db,
      this.config.debateId,
    ) as unknown as ParticipantWithAgent[]

    const allParticipants = participants.filter(
      (p) => p.role === 'debater' || p.role === 'moderator',
    )

    if (!allParticipants.some((p) => p.role === 'debater')) {
      throw new Error('No debaters found for debate')
    }

    log.info(`Starting: "${debate.title}" — ${allParticipants.length} participants`)

    // ── 2. Create Retell web calls ────────────────────────────────────────────
    const relayAgents: RelayAgent[] = []
    const pollerAgents: PollerAgent[] = []
    const retellCallIds: Record<string, string> = {}

    for (const participant of allParticipants) {
      const agent = participant.agents
      if (!agent?.retell_agent_id) {
        log.warn(`${agent?.name} has no retell_agent_id — skipping`)
        continue
      }

      log.info(`Creating Retell call for ${agent.name}`)
      const callCreatedAt = new Date()
      const call = await this.retell.call.createWebCall({
        agent_id: agent.retell_agent_id,
        metadata: {
          debate_id: this.config.debateId,
          agent_id: participant.agent_id,
          role: participant.role,
        },
      })

      this.callIds.set(participant.agent_id, call.call_id)
      this.callStartTimes.set(participant.agent_id, callCreatedAt)
      retellCallIds[participant.agent_id] = call.call_id

      const agentName = agent.name
      relayAgents.push({
        agentId: participant.agent_id,
        callId: call.call_id,
        accessToken: call.access_token,
        agentName,
      })

      pollerAgents.push({
        agentId: participant.agent_id,
        callId: call.call_id,
        agentName,
        role: participant.role as 'debater' | 'moderator',
        callStartedAt: callCreatedAt,
      })

      log.info(`Call created: ${call.call_id} for ${agentName}`)
    }

    if (relayAgents.length < 2) {
      throw new Error('Need at least 2 agents with retell_agent_id to run a debate')
    }

    // ── 3. Mark debate live ───────────────────────────────────────────────────
    const debateStartedAt = new Date()
    await updateDebateStatus(db, this.config.debateId, 'live', {
      retell_call_ids: retellCallIds,
      started_at: debateStartedAt.toISOString(),
    })

    // ── 4. Public LiveKit room — one participant per agent ────────────────────
    let roomManager: LiveKitRoomManager | null = null
    let publicRoomConfig: { url: string; tokens: Map<string, string> } | undefined

    if (LiveKitRoomManager.isConfigured()) {
      try {
        roomManager = new LiveKitRoomManager()
        await roomManager.createRoom(debate.room_name)

        // Generate a token per agent with the identity DebateRoom expects:
        // "agent-${name.toLowerCase().replace(/\s+/g, '-')}"
        const tokens = new Map<string, string>()
        for (const agent of relayAgents) {
          const identity = `agent-${agent.agentName.toLowerCase().replace(/\s+/g, '-')}`
          const token = await roomManager.generateToken(
            debate.room_name,
            agent.agentName,
            identity,
            'publisher',
          )
          tokens.set(agent.agentId, token)
        }

        publicRoomConfig = { url: process.env.LIVEKIT_URL!, tokens }
        log.info(`Public broadcast room ready: ${debate.room_name}`)
      } catch (err) {
        log.warn('Failed to set up public broadcast room', { error: String(err) })
        roomManager = null
      }
    }

    // ── 5. Start audio relay ──────────────────────────────────────────────────
    this.relay = new AudioRelay()
    try {
      await this.relay.connect(relayAgents, publicRoomConfig)
      log.info('AudioRelay live')
    } catch (err) {
      log.error('AudioRelay failed to connect', { error: String(err) })
      await this.cleanup(db, roomManager, debate.room_name)
      await updateDebateStatus(db, this.config.debateId, 'cancelled')
      throw err
    }

    // ── 6. Start live transcript poller ──────────────────────────────────────
    this.poller = new LiveTranscriptPoller(
      this.config.debateId,
      debate.room_name,
      pollerAgents,
      this.retell,
      db,
      roomManager,
      debateStartedAt,
    )
    this.poller.start()

    // ── 7. Run for max duration ───────────────────────────────────────────────
    const maxMinutes =
      debate.duration_override_minutes ?? format?.max_duration_minutes ?? 30
    log.info(`Debate running — max ${maxMinutes}min`)
    await this.runTimer(maxMinutes * 60_000)

    // ── 8. Stop poller + disconnect relay ─────────────────────────────────────
    log.info('Max duration reached — wrapping up')
    this.poller.stop()
    this.poller = null
    await this.relay.disconnect()
    this.relay = null

    // ── 9. Signal debate complete to the public LiveKit room ──────────────────
    if (roomManager) {
      await roomManager.sendData(debate.room_name, {
        type: 'debate_complete',
        timestamp: new Date().toISOString(),
      }).catch(() => {})
    }

    // ── 10. Collect final transcripts + recording URLs ────────────────────────
    log.info('Collecting final transcripts and recording URLs...')
    try {
      await collectTranscripts(db, this.config.debateId, this.retell, this.callIds, participants)
    } catch (err) {
      log.error('Transcript collection error', { error: String(err) })
    }

    // ── 11. Mark ended ────────────────────────────────────────────────────────
    await updateDebateStatus(db, this.config.debateId, 'ended', {
      ended_at: new Date().toISOString(),
    })

    // Cleanup LiveKit room
    await this.cleanup(db, roomManager, debate.room_name)

    log.info(`Debate ${this.config.debateId} complete`)
  }

  private async runTimer(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const end = Date.now() + durationMs
      const tick = setInterval(() => {
        if (this.stopped || Date.now() >= end) {
          clearInterval(tick)
          resolve()
        }
      }, 5_000)
      tick.unref?.()
    })
  }

  private async cleanup(
    _db: unknown,
    roomManager: LiveKitRoomManager | null,
    roomName: string,
  ): Promise<void> {
    if (roomManager) {
      await roomManager.deleteRoom(roomName).catch(() => {})
    }
  }

  stop(): void {
    this.stopped = true
    this.poller?.stop()
  }
}
