import type Retell from 'retell-sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { insertDebateTurn, getNextTurnIndex } from '@bipi/db'
import { createLogger } from '@bipi/shared'
import type { RoundPhase, SpeakerType } from '@bipi/shared'
import type { LiveKitRoomManager } from '../livekit/room-manager.js'

const log = createLogger('agents:retell:poller')

const POLL_INTERVAL_MS = 3_000  // every 3s — Retell updates transcript in real-time

interface TranscriptEntry {
  role: 'agent' | 'user'
  content: string
  words?: Array<{ word: string; start: number; end: number }>
}

interface PollerAgent {
  agentId: string   // Supabase agent UUID
  callId: string    // Retell call ID
  agentName: string
  role: 'debater' | 'moderator'
  callStartedAt: Date  // time createWebCall() returned — used to compute wall-clock timestamps
}

/**
 * LiveTranscriptPoller runs during an active freeflow debate.
 *
 * Every 3 seconds it calls retell.call.retrieve() for each active call and
 * diffs the transcript_object to find new "agent" utterances. Each new
 * utterance is written to debate_turns immediately, triggering Supabase
 * Realtime to push it to connected browsers.
 *
 * Word-level timestamps from Retell are converted to wall-clock times using
 * callStartedAt, enabling DebatePlayer to sync the recording audio to the
 * right position when a turn is selected during playback.
 *
 * The poller also sends a LiveKit data message per turn so the DebateRoom
 * can highlight the active speaker before Supabase realtime delivers the row.
 */
export class LiveTranscriptPoller {
  private seenCounts = new Map<string, number>()  // callId → # transcript entries already seen
  private timer: ReturnType<typeof setInterval> | null = null
  private stopped = false
  private debateStartedAt: Date

  constructor(
    private debateId: string,
    private roomName: string,
    private agents: PollerAgent[],
    private retell: Retell,
    private db: SupabaseClient,
    private roomManager: LiveKitRoomManager | null,
    debateStartedAt?: Date,
  ) {
    this.debateStartedAt = debateStartedAt ?? new Date()
    for (const a of agents) {
      this.seenCounts.set(a.callId, 0)
    }
  }

  start(): void {
    log.info(`LiveTranscriptPoller started for debate ${this.debateId}`)
    this.poll()
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.stopped = true
    log.info('LiveTranscriptPoller stopped')
  }

  private async poll(): Promise<void> {
    if (this.stopped) return

    for (const agent of this.agents) {
      try {
        const call = await this.retell.call.retrieve(agent.callId)
        const entries = (call as unknown as Record<string, unknown>).transcript_object as
          | TranscriptEntry[]
          | undefined

        if (!entries || entries.length === 0) continue

        const seen = this.seenCounts.get(agent.callId) ?? 0
        const newEntries = entries.slice(seen)

        for (const entry of newEntries) {
          if (entry.role === 'agent' && entry.content.trim()) {
            await this.writeTurn(agent, entry)
          }
        }

        this.seenCounts.set(agent.callId, entries.length)
      } catch (err) {
        if (!this.stopped) {
          log.error(`Poll error for call ${agent.callId}`, { error: String(err) })
        }
      }
    }
  }

  private async writeTurn(agent: PollerAgent, entry: TranscriptEntry): Promise<void> {
    const firstWord = entry.words?.[0]
    const lastWord = entry.words?.[entry.words!.length - 1]

    // Convert relative word timestamps to wall-clock times
    const startedAt = firstWord
      ? new Date(agent.callStartedAt.getTime() + firstWord.start * 1000)
      : new Date()
    const endedAt = lastWord
      ? new Date(agent.callStartedAt.getTime() + lastWord.end * 1000)
      : new Date()

    const durationMs = endedAt.getTime() - startedAt.getTime()
    const roundPhase = this.inferPhase(startedAt)
    const speakerType: SpeakerType = agent.role === 'moderator' ? 'moderator' : 'agent'

    try {
      const turnIndex = await getNextTurnIndex(this.db, this.debateId)

      const turn = await insertDebateTurn(this.db, {
        debate_id: this.debateId,
        speaker_type: speakerType,
        speaker_id: agent.agentId,
        round_phase: roundPhase,
        turn_index: turnIndex,
        transcript: entry.content,
        claim_tier: null,
        claim_tags: [],
        evidence_metadata: null,
        duration_ms: durationMs,
        audio_url: null,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
      })

      log.info(`Turn ${turnIndex}: ${agent.agentName} — "${entry.content.slice(0, 60)}..."`)

      // Send LiveKit data message for immediate speaker highlighting in the UI
      // (Supabase realtime delivers the full turn within ~100ms but this is instant)
      if (this.roomManager) {
        await this.roomManager.sendData(this.roomName, {
          type: 'turn',
          speakerId: agent.agentId,
          speakerName: agent.agentName,
          roundPhase,
          turnIndex,
          turnId: turn.id,
          isModerator: agent.role === 'moderator',
        }).catch(() => {})
      }
    } catch (err) {
      log.error(`Failed to write turn for ${agent.agentName}`, { error: String(err) })
    }
  }

  /**
   * Infer the current debate phase based on elapsed time since debate started.
   * Opening: first 2 minutes. Closing: last 2 minutes (hard floor, not max).
   * Everything else is discussion.
   */
  private inferPhase(at: Date): RoundPhase {
    const elapsedMs = at.getTime() - this.debateStartedAt.getTime()
    const elapsedMin = elapsedMs / 60_000
    if (elapsedMin < 2) return 'opening'
    if (elapsedMin > 25) return 'closing'  // >25min into a 30min debate
    return 'discussion'
  }
}

export type { PollerAgent }
