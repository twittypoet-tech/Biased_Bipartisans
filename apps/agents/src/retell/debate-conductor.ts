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

// ── Playbook types ────────────────────────────────────────────────────────────

/** Role-based speaker slot — resolved to actual agent IDs at runtime */
type SpeakerSlot = 'moderator' | 'agent_a' | 'agent_b'

interface SingleTurn {
  id: string
  type?: 'single'
  speaker: SpeakerSlot
  label: string
}

interface RoundRobinTurn {
  id: string
  type: 'round_robin'
  speakers: SpeakerSlot[]
  rounds: number
  label: string
}

type PlaybookTurn = SingleTurn | RoundRobinTurn

interface TurnConfig {
  turns: PlaybookTurn[]
}

/** A resolved, flat turn with actual agent IDs */
interface ResolvedTurn {
  agentId: string
  agentName: string
  label: string
}

/**
 * Default 3-phase debate playbook used when no turn_config is set on the format.
 *
 * Phase 1 (Opening): mod intro → agent A opening → mod transition → agent B opening → mod opens discussion
 * Phase 2 (Discussion): 3 rounds of A ↔ B, then mod summarises
 * Phase 3 (Closing): mod announces → A closes → mod bridges → B closes → mod final address
 */
const DEFAULT_TURN_CONFIG: TurnConfig = {
  turns: [
    { id: 't1',  speaker: 'moderator', label: 'Introduction' },
    { id: 't2',  speaker: 'agent_a',   label: 'Opening Statement' },
    { id: 't3',  speaker: 'moderator', label: 'Transition to B' },
    { id: 't4',  speaker: 'agent_b',   label: 'Opening Statement' },
    { id: 't5',  speaker: 'moderator', label: 'Opens Discussion' },
    { id: 't6',  type: 'round_robin',  speakers: ['agent_a', 'agent_b'], rounds: 3, label: 'Open Discussion' },
    { id: 't7',  speaker: 'moderator', label: 'Discussion Summary' },
    { id: 't8',  speaker: 'moderator', label: 'Announce Closings' },
    { id: 't9',  speaker: 'agent_a',   label: 'Closing Argument' },
    { id: 't10', speaker: 'moderator', label: 'Bridge to B' },
    { id: 't11', speaker: 'agent_b',   label: 'Closing Argument' },
    { id: 't12', speaker: 'moderator', label: 'Final Address' },
  ],
}

/**
 * Expand the playbook into a flat, ordered list of resolved turns.
 * SpeakerSlots are resolved against the actual participants.
 */
function buildTurnSequence(
  config: TurnConfig,
  moderatorId: string,
  debaterIds: [string, string],  // [agent_a, agent_b]
  agentNames: Map<string, string>,
): ResolvedTurn[] {
  function resolve(slot: SpeakerSlot): string {
    if (slot === 'moderator') return moderatorId
    if (slot === 'agent_a')   return debaterIds[0]
    return debaterIds[1]
  }

  const turns: ResolvedTurn[] = []

  for (const entry of config.turns) {
    if (entry.type === 'round_robin') {
      for (let round = 0; round < entry.rounds; round++) {
        for (const slot of entry.speakers) {
          const agentId = resolve(slot)
          turns.push({
            agentId,
            agentName: agentNames.get(agentId) ?? agentId,
            label: `${entry.label} — Round ${round + 1}`,
          })
        }
      }
    } else {
      const agentId = resolve(entry.speaker)
      turns.push({
        agentId,
        agentName: agentNames.get(agentId) ?? agentId,
        label: entry.label,
      })
    }
  }

  return turns
}

// ── Conductor ─────────────────────────────────────────────────────────────────

/**
 * DebateConductor orchestrates a structured, turn-based Retell debate end-to-end.
 *
 * 1.  Load debate + format + participants from DB
 * 2.  Create one Retell web call per participant (using their retell_agent_id)
 * 3.  Update debate status → "live"
 * 4.  Set up public LiveKit room with one participant per agent (speaker highlighting)
 * 5.  Start AudioRelay — routes audio according to the active turn
 * 6.  Start LiveTranscriptPoller — polls Retell every 3s, writes turns to DB
 * 7.  Execute the playbook turn sequence (onTurnEnd callback drives each advance)
 *     while the overall debate timer runs in parallel as a ceiling
 * 8.  Stop poller + disconnect relay
 * 9.  Broadcast "debate_complete" to the public LiveKit room
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
  private qaTimer: ReturnType<typeof setInterval> | null = null
  private injectedQuestions = new Set<string>()
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

    const debaters = allParticipants.filter((p) => p.role === 'debater')
    const moderator = allParticipants.find((p) => p.role === 'moderator')

    if (debaters.length < 2) throw new Error('Need at least 2 debaters')
    if (!moderator) throw new Error('No moderator found for debate')

    log.info(`Starting: "${debate.title}" — ${allParticipants.length} participants`)

    // ── 2. Create Retell web calls ────────────────────────────────────────────
    const relayAgents: RelayAgent[] = []
    const pollerAgents: PollerAgent[] = []
    const retellCallIds: Record<string, string> = {}

    const tf = (debate.topic_framing ?? {}) as unknown as Record<string, string>
    const topicVars: Record<string, string> = {
      debate_title:         debate.title ?? '',
      debate_headline:      tf.headline ?? '',
      conflict_description: tf.conflict_description ?? '',
      forced_tradeoff:      tf.forced_tradeoff ?? '',
      decision_surface:     tf.decision_surface ?? '',
      moral_tension:        tf.moral_tension ?? '',
      strategic_tension:    tf.strategic_tension ?? '',
      identity_tension:     tf.identity_tension ?? '',
    }

    for (const participant of allParticipants) {
      const agent = participant.agents
      if (!agent?.retell_agent_id) {
        log.warn(`${agent?.name} has no retell_agent_id — skipping`)
        continue
      }

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

      const agentRole = participant.role as 'debater' | 'moderator'
      if (agentRole === 'moderator') this.moderatorAgentId = participant.agent_id

      relayAgents.push({
        agentId: participant.agent_id,
        callId: call.call_id,
        accessToken: call.access_token,
        agentName: agent.name,
        role: agentRole,
      })

      pollerAgents.push({
        agentId: participant.agent_id,
        callId: call.call_id,
        agentName: agent.name,
        role: agentRole,
        callStartedAt: callCreatedAt,
      })

      log.info(`Call created: ${call.call_id} for ${agent.name}`)
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

    // ── 4. Public LiveKit room ────────────────────────────────────────────────
    let roomManager: LiveKitRoomManager | null = null
    let publicRoomConfig: { url: string; tokens: Map<string, string> } | undefined

    if (LiveKitRoomManager.isConfigured()) {
      try {
        roomManager = new LiveKitRoomManager()
        await roomManager.createRoom(debate.room_name)

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

      // If all Retell calls die externally (e.g. their silence timeout fires),
      // treat it as a natural debate end rather than grinding through phantom turns.
      this.relay.setAllCallsDeadHandler(() => {
        if (this.stopped) return
        log.warn('All Retell calls dropped — ending debate early')
        this.stopped = true
        this.relay?.disconnect().catch(() => {})
        this.relay = null
      })
    } catch (err) {
      log.error('AudioRelay failed to connect', err instanceof Error ? err : new Error(String(err)))
      await this.cleanup(roomManager, debate.room_name)
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

    // ── 7. Build turn sequence and run ────────────────────────────────────────
    const maxMinutes = debate.duration_override_minutes ?? format?.max_duration_minutes ?? 30
    log.info(`Debate running — max ${maxMinutes}min`)

    // Resolve speaker slots → actual agent IDs
    const agentNames = new Map(relayAgents.map((a) => [a.agentId, a.agentName]))
    const debaterA = debaters[0]!.agent_id
    const debaterB = debaters[1]!.agent_id

    const turnConfig: TurnConfig =
      (debate as unknown as { turn_config?: TurnConfig }).turn_config ??
      (format as unknown as { turn_config?: TurnConfig })?.turn_config ??
      DEFAULT_TURN_CONFIG

    const turnSequence = buildTurnSequence(
      turnConfig,
      moderator.agent_id,
      [debaterA, debaterB],
      agentNames,
    )

    log.info(`Playbook: ${turnSequence.length} turns`)
    for (const [i, t] of turnSequence.entries()) {
      log.info(`  ${i + 1}. ${t.agentName} — ${t.label}`)
    }

    // Run the overall timer in parallel — fires stopped=true when time is up
    const overallTimer = this.runTimer(maxMinutes * 60_000)

    // Q&A: inject top audience question into moderator every 90s (if OPENAI_API_KEY set)
    if (this.moderatorAgentId) {
      const moderatorId = this.moderatorAgentId
      this.qaTimer = setInterval(async () => {
        if (this.stopped || !this.relay) {
          if (this.qaTimer) { clearInterval(this.qaTimer); this.qaTimer = null }
          return
        }
        const qaDb = getSupabaseClient()
        await this.injectTopQuestion(qaDb, moderatorId)
      }, 90_000)
      this.qaTimer.unref?.()
    }

    // Execute turns sequentially — each turn completes via the onTurnEnd callback
    for (const [i, turn] of turnSequence.entries()) {
      if (this.stopped) break

      const nextAgentId = turnSequence[i + 1]?.agentId ?? null
      log.info(`Starting turn: ${turn.agentName} — ${turn.label}`)

      // Inject current_phase into moderator so the single-prompt LLM knows
      // which part of the playbook it's executing (e.g. "Introduction", "Opens Discussion")
      if (turn.agentId === this.moderatorAgentId) {
        const moderatorCallId = this.callIds.get(turn.agentId)
        if (moderatorCallId) {
          await this.retell.call.update(moderatorCallId, {
            override_dynamic_variables: { current_phase: turn.label },
          } as Parameters<typeof this.retell.call.update>[1]).catch((err) => {
            log.warn(`Failed to inject current_phase for moderator: ${err instanceof Error ? err.message : String(err)}`)
          })
        }
      }

      await new Promise<void>((resolve) => {
        // Guard: if debate was stopped while we were awaiting, resolve immediately
        if (this.stopped || !this.relay) { resolve(); return }
        this.relay.setTurn(turn.agentId, nextAgentId, resolve)
      })

      log.info(`Turn complete: ${turn.agentName} — ${turn.label}`)
    }

    // Wait for overall timer if turns finished first (unlikely but correct)
    await overallTimer

    // ── 8. Stop poller + disconnect relay ─────────────────────────────────────
    log.info('Debate ending — wrapping up')
    if (this.qaTimer) { clearInterval(this.qaTimer); this.qaTimer = null }
    this.poller?.stop()
    this.poller = null
    await this.relay?.disconnect().catch(() => {})
    this.relay = null

    // ── 9. Signal debate complete ─────────────────────────────────────────────
    if (roomManager) {
      await roomManager.sendData(debate.room_name, {
        type: 'debate_complete',
        timestamp: new Date().toISOString(),
      }).catch(() => {})
    }

    // ── 10. Collect final transcripts + recording URLs ────────────────────────
    log.info('Collecting final transcripts...')
    try {
      await collectTranscripts(db, this.config.debateId, this.retell, this.callIds, participants)
    } catch (err) {
      log.error('Transcript collection error', { error: String(err) })
    }

    // ── 11. Mark ended ────────────────────────────────────────────────────────
    await updateDebateStatus(db, this.config.debateId, 'ended', {
      ended_at: new Date().toISOString(),
    })

    await this.cleanup(roomManager, debate.room_name)
    log.info(`Debate ${this.config.debateId} complete`)
  }

  private runTimer(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const end = Date.now() + durationMs
      const tick = setInterval(async () => {
        if (this.stopped || Date.now() >= end) {
          clearInterval(tick)
          this.stopped = true
          resolve()
          return
        }
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
      }, 1_000)
      tick.unref?.()
    })
  }

  private async cleanup(
    roomManager: LiveKitRoomManager | null,
    roomName: string,
  ): Promise<void> {
    if (roomManager) {
      await roomManager.deleteRoom(roomName).catch(() => {})
    }
  }

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
    if (this.qaTimer) { clearInterval(this.qaTimer); this.qaTimer = null }
    this.poller?.stop()
    this.poller = null
    // Disconnecting the relay closes every LiveKit room connection — Retell detects
    // the disconnect and ends each call once end_call_after_silence_ms elapses.
    // Ensure all Retell agents have end_call_after_silence_ms ≤ 20000 so calls
    // terminate promptly rather than lingering for minutes.
    this.relay?.disconnect().catch(() => {})
    this.relay = null
    log.info(`Debate ${this.config.debateId} stopped`)
  }
}
