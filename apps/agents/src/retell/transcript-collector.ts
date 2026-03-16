import type Retell from 'retell-sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { insertDebateTurn, saveDebateRecording, getNextTurnIndex } from '@bipi/db'
import { createLogger } from '@bipi/shared'
import type { RoundPhase, SpeakerType } from '@bipi/shared'

const log = createLogger('agents:retell:transcripts')

const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 5 * 60_000  // wait up to 5min for calls to end

interface TranscriptEntry {
  role: 'agent' | 'user'
  content: string
  words?: Array<{ word: string; start: number; end: number }>
}

interface TimedTurn {
  agentId: string
  speakerType: SpeakerType
  content: string
  startSec: number       // seconds from start of this call (used for sorting)
  durationMs: number | null
}

/**
 * Wait for all Retell calls to end, then parse their transcripts and write
 * debate_turns records to Supabase.
 *
 * Each Retell call's transcript_object contains alternating agent/user entries.
 * In our relay setup:
 *   - "agent" entries  = the Retell agent's actual speech (what we record)
 *   - "user" entries   = audio injected by the relay (other agents → ignored)
 *
 * Turns from all calls are merged and sorted by start timestamp, then given
 * sequential turn_index values for correct ordering in the UI.
 */
export async function collectTranscripts(
  db: SupabaseClient,
  debateId: string,
  retell: Retell,
  callIds: Map<string, string>,        // agentId → retellCallId
  participants: Array<{ agent_id: string; role: string; agents?: unknown }>,
): Promise<void> {
  const participantByAgentId = new Map(participants.map((p) => [p.agent_id, p]))

  // Poll until all calls end or timeout
  const pending = new Map(callIds)
  const allTurns: TimedTurn[] = []
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (pending.size > 0 && Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    for (const [agentId, callId] of [...pending]) {
      try {
        const call = await retell.call.retrieve(callId)
        if (call.call_status !== 'ended') continue

        pending.delete(agentId)
        log.info(`Call ended: ${callId} (agent ${agentId})`)

        // Save recording URL if present (Retell records calls when enabled in agent config)
        const recordingUrl = (call as unknown as Record<string, unknown>).recording_url as
          | string
          | undefined
        if (recordingUrl) {
          await saveDebateRecording(db, debateId, agentId, recordingUrl).catch((err) => {
            log.warn(`Failed to save recording URL for ${agentId}`, { error: String(err) })
          })
          log.info(`Recording saved for agent ${agentId}`)
        }

        const entries = (call as unknown as Record<string, unknown>).transcript_object as
          | TranscriptEntry[]
          | undefined

        if (!entries || entries.length === 0) {
          log.warn(`No transcript_object for call ${callId}`)
          continue
        }

        const participant = participantByAgentId.get(agentId)
        const speakerType: SpeakerType =
          participant?.role === 'moderator' ? 'moderator' : 'agent'

        const turns = extractAgentTurns(agentId, speakerType, entries)
        allTurns.push(...turns)
      } catch (err) {
        log.error(`Error polling call ${callId}`, { error: String(err) })
      }
    }
  }

  if (pending.size > 0) {
    log.warn(`Timed out waiting for ${pending.size} call(s): ${[...pending.values()].join(', ')}`)
  }

  // Only insert turns if the live transcript poller didn't already write them.
  // If turns exist in the DB, the poller ran successfully — skip re-insertion.
  const { count: existingCount } = await db
    .from('debate_turns')
    .select('*', { count: 'exact', head: true })
    .eq('debate_id', debateId)

  if ((existingCount ?? 0) > 0) {
    log.info(`Skipping turn insertion — ${existingCount} turns already written by live poller`)
    return
  }

  if (allTurns.length === 0) {
    log.warn('No turns to persist')
    return
  }

  // Fallback: poller wasn't running. Sort by start time and insert now.
  allTurns.sort((a, b) => a.startSec - b.startSec)

  const total = allTurns.length
  for (let i = 0; i < total; i++) {
    const t = allTurns[i]!
    const position = i / total
    const roundPhase: RoundPhase =
      position < 0.15 ? 'opening' : position > 0.85 ? 'closing' : 'discussion'

    try {
      await insertDebateTurn(db, {
        debate_id: debateId,
        speaker_type: t.speakerType,
        speaker_id: t.agentId,
        round_phase: roundPhase,
        turn_index: i,
        transcript: t.content,
        claim_tier: null,
        claim_tags: [],
        evidence_metadata: null,
        duration_ms: t.durationMs,
        audio_url: null,
        started_at: t.startSec ? new Date(t.startSec * 1000).toISOString() : null,
        ended_at: t.durationMs ? new Date((t.startSec + t.durationMs / 1000) * 1000).toISOString() : null,
      })
    } catch (err) {
      log.error(`Failed to insert turn ${i} for ${t.agentId}`, { error: String(err) })
    }
  }

  log.info(`Persisted ${allTurns.length} turns for debate ${debateId} (fallback)`)
}

function extractAgentTurns(
  agentId: string,
  speakerType: SpeakerType,
  entries: TranscriptEntry[],
): TimedTurn[] {
  const turns: TimedTurn[] = []
  // Accumulate start time by tracking previous entry durations when no word timing
  let runningStartSec = 0

  for (const entry of entries) {
    const wordStart = entry.words?.[0]?.start ?? runningStartSec
    const wordEnd = entry.words?.[entry.words.length - 1]?.end ?? null
    const durationMs = wordEnd != null ? Math.round((wordEnd - wordStart) * 1000) : null

    // Advance running clock estimate (avg ~150 words/min → 2.5 words/sec)
    const wordCount = entry.content.split(/\s+/).length
    runningStartSec += wordCount / 2.5

    if (entry.role !== 'agent') continue  // skip relay-injected "user" audio

    turns.push({
      agentId,
      speakerType,
      content: entry.content,
      startSec: wordStart,
      durationMs,
    })
  }

  return turns
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
