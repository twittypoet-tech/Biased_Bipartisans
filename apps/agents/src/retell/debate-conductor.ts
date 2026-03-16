import Retell from 'retell-sdk'
import { createLogger } from '@bipi/shared'
import {
  getSupabaseClient,
  getDebate,
  getDebateFormat,
  getDebateParticipants,
  updateDebateStatus,
  saveDebateRecording,
  getTopAudienceQuestions,
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
  private phaseTimers: ReturnType<typeof setTimeout>[] = []
  private qaTimer: ReturnType<typeof setInterval> | null = null
  private injectedQuestions = new Set<string>()   // prevent re-injecting same question
  private moderatorAgentId: string | null = null

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

    // Build topic variables to inject into every agent's system prompt via
    // {{variable_name}} placeholders. Add these to your Retell agent prompts.
    const tf = (debate.topic_framing ?? {}) as Record<string, string>
    const topicVars: Record<string, string> = {
      debate_title:          debate.title ?? '',
      debate_headline:       tf.headline ?? '',
      conflict_description:  tf.conflict_description ?? '',
      forced_tradeoff:       tf.forced_tradeoff ?? '',
      decision_surface:      tf.decision_surface ?? '',
      moral_tension:         tf.moral_tension ?? '',
      strategic_tension:     tf.strategic_tension ?? '',
      identity_tension:      tf.identity_tension ?? '',
    }

    for (const participant of allParticipants) {
      const agent = participant.agents
      if (!agent?.retell_agent_id) {
        log.warn(`${agent?.name} has no retell_agent_id — skipping`)
        continue
      }

      // Tell each agent who the other participants are
      const opponents = allParticipants
        .filter((p) => p.agent_id !== participant.agent_id)
        .map((p) => `${p.agents.name} (${p.role})`)
        .join(', ')

      log.info(`Creating Retell call for ${agent.name}`)
      const callCreatedAt = new Date()
      const call = await this.retell.call.createWebCall({
        agent_id: agent.retell_agent_id,
        retell_llm_dynamic_variables: {
          ...topicVars,
          other_participants: opponents,
          my_role: participant.role,
        },
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
      const agentRole = participant.role as 'debater' | 'moderator'
      if (agentRole === 'moderator') this.moderatorAgentId = participant.agent_id

      relayAgents.push({
        agentId: participant.agent_id,
        callId: call.call_id,
        accessToken: call.access_token,
        agentName,
        role: agentRole,
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
      log.error('AudioRelay failed to connect', err instanceof Error ? err : new Error(JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Object ? err as object : {})) || String(err)))
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

    // Schedule phase transitions now that maxMinutes is known:
    // Opening (0 – 90s): moderator speaks uninterrupted for the intro
    // Debate (90s – 80% of max): VAD floor control, all agents can respond
    // Closing (80% – end): moderator wraps up without debater interruption
    const openingMs = 90_000
    const closingMs = maxMinutes * 60_000 * 0.80

    this.phaseTimers.push(
      setTimeout(() => {
        if (!this.stopped) { this.relay?.setPhase('debate'); log.info('Phase: opening → debate') }
      }, openingMs),
      setTimeout(() => {
        if (!this.stopped) { this.relay?.setPhase('closing'); log.info('Phase: debate → closing') }
      }, closingMs),
    )

    // Q&A: after the opening phase, inject top audience question every 90s
    // into the moderator's call as TTS audio (requires OPENAI_API_KEY)
    if (this.moderatorAgentId) {
      const moderatorId = this.moderatorAgentId
      this.phaseTimers.push(
        setTimeout(() => {
          if (this.stopped) return
          this.qaTimer = setInterval(async () => {
            if (this.stopped || !this.relay) {
              if (this.qaTimer) { clearInterval(this.qaTimer); this.qaTimer = null }
              return
            }
            const qaDb = getSupabaseClient()
            await this.injectTopQuestion(qaDb, moderatorId)
          }, 90_000)
          this.qaTimer?.unref?.()
        }, openingMs),
      )
    }

    await this.runTimer(maxMinutes * 60_000)

    // ── 8. Stop poller + disconnect relay ─────────────────────────────────────
    log.info('Debate timer done — wrapping up')
    for (const t of this.phaseTimers) clearTimeout(t)
    this.phaseTimers = []
    if (this.qaTimer) { clearInterval(this.qaTimer); this.qaTimer = null }
    this.poller?.stop()
    this.poller = null
    await this.relay?.disconnect().catch(() => {})
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
      const tick = setInterval(async () => {
        if (this.stopped || Date.now() >= end) {
          clearInterval(tick)
          resolve()
          return
        }
        // Poll DB — stop early if admin ended the debate
        try {
          const db = getSupabaseClient()
          const debate = await getDebate(db, this.config.debateId)
          if (debate?.status === 'ended' || debate?.status === 'cancelled') {
            log.info(`Debate ${this.config.debateId} ended in DB — stopping early`)
            this.stopped = true
            clearInterval(tick)
            resolve()
          }
        } catch { /* best effort */ }
      }, 10_000)
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

  /**
   * Synthesize the top unaddressed audience question as TTS and inject it
   * into the moderator's Retell call as "user" audio. The moderator hears it
   * and incorporates it naturally into the next turn.
   * Only runs when OPENAI_API_KEY is set; silently skips otherwise.
   */
  private async injectTopQuestion(
    db: ReturnType<typeof getSupabaseClient>,
    moderatorAgentId: string,
  ): Promise<void> {
    if (!this.relay || !process.env.OPENAI_API_KEY) return
    try {
      const questions = await getTopAudienceQuestions(db, this.config.debateId, 1)
      if (!questions.length) return
      const question = questions[0]!
      if (this.injectedQuestions.has(question.id)) return

      const { OpenAITTSProvider } = await import('../voice/openai-tts.js')
      const tts = new OpenAITTSProvider()
      const result = await tts.synthesize(
        `An audience member asks: ${question.content}`,
        'nova',
      )
      if (result.format === 'pcm') {
        await this.relay.injectAudio(moderatorAgentId, result.audio)
        this.injectedQuestions.add(question.id)
        log.info(`Injected audience question: "${question.content.slice(0, 60)}"`)
      }
    } catch (err) {
      log.warn('Failed to inject audience question', { error: String(err) })
    }
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    for (const t of this.phaseTimers) clearTimeout(t)
    this.phaseTimers = []
    if (this.qaTimer) { clearInterval(this.qaTimer); this.qaTimer = null }
    this.poller?.stop()
    this.poller = null
    // Disconnect relay immediately — this causes Retell to see the "user" leave
    this.relay?.disconnect().catch(() => {})
    this.relay = null
    // Also explicitly end all Retell calls so they don't burn minutes
    for (const [, callId] of this.callIds) {
      this.retell.call.end(callId).catch((err) => {
        log.warn(`Failed to end Retell call ${callId}`, err instanceof Error ? err : new Error(String(err)))
      })
    }
    log.info(`Debate ${this.config.debateId} stopped`)
  }
}
