import type { SupabaseClient } from '@supabase/supabase-js'
import { getDebateTurns, getDebateParticipants, getDebateVotes } from '@bipi/db'
import { insertMemoryCandidate } from '@bipi/db'
import type { DebateTurn, UUID } from '@bipi/shared'

type MemoryCategory =
  | 'argument_success'
  | 'concession'
  | 'rivalry_moment'
  | 'topic_position'
  | 'audience_highlight'

interface MemoryCandidate {
  content: string
  category: MemoryCategory
  significance: number
}

/**
 * Extract memory candidates from a completed debate for each agent.
 * Memories capture key moments: strong arguments, concessions, rivalries, audience reception.
 */
export async function extractMemories(db: SupabaseClient, debateId: UUID, agentIds: string[]): Promise<void> {
  const [turns, participants, votes] = await Promise.all([
    getDebateTurns(db, debateId),
    getDebateParticipants(db, debateId),
    getDebateVotes(db, debateId),
  ])

  for (const agentId of agentIds) {
    const agentTurns = turns.filter((t) => t.speaker_id === agentId && t.speaker_type === 'agent')
    const candidates = generateCandidates(agentId, agentTurns, turns, votes)

    for (const candidate of candidates) {
      await insertMemoryCandidate(db, {
        agent_id: agentId,
        debate_id: debateId,
        status: 'candidate',
        category: candidate.category,
        content: candidate.content,
        significance: candidate.significance,
      })
    }
  }
}

function generateCandidates(
  agentId: string,
  agentTurns: DebateTurn[],
  allTurns: DebateTurn[],
  votes: Array<{ target_agent_id: string | null; vote_type: string; target_turn_id: string | null }>,
): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = []

  // 1. Opening position — always worth remembering
  const openingTurn = agentTurns.find((t) => t.round_phase === 'opening')
  if (openingTurn) {
    candidates.push({
      content: `Opened with: ${summarize(openingTurn.transcript, 150)}`,
      category: 'topic_position',
      significance: 0.6,
    })
  }

  // 2. Strongest rebuttal (based on votes)
  const rebuttalVotes = votes.filter(
    (v) => v.vote_type === 'best_rebuttal' && v.target_agent_id === agentId,
  )
  if (rebuttalVotes.length > 0) {
    const rebuttalTurns = agentTurns.filter((t) => t.round_phase === 'rebuttal')
    if (rebuttalTurns.length > 0) {
      candidates.push({
        content: `Delivered strong rebuttal (${rebuttalVotes.length} votes): ${summarize(rebuttalTurns[0]!.transcript, 150)}`,
        category: 'argument_success',
        significance: 0.7 + Math.min(rebuttalVotes.length * 0.05, 0.2),
      })
    }
  }

  // 3. Concession moments — look for concession patterns in text
  for (const turn of agentTurns) {
    if (detectsConcession(turn.transcript)) {
      candidates.push({
        content: `Made a concession: ${summarize(turn.transcript, 150)}`,
        category: 'concession',
        significance: 0.65,
      })
      break // only capture one concession memory per debate
    }
  }

  // 4. Rivalry moments — direct exchanges in pressure round
  const pressureTurns = agentTurns.filter((t) => t.round_phase === 'pressure')
  if (pressureTurns.length > 0) {
    candidates.push({
      content: `Under pressure: ${summarize(pressureTurns[0]!.transcript, 150)}`,
      category: 'rivalry_moment',
      significance: 0.6,
    })
  }

  // 5. Audience highlight — most voted turn
  const strongestVotes = votes.filter(
    (v) => v.vote_type === 'strongest_argument' && v.target_agent_id === agentId,
  )
  if (strongestVotes.length >= 2) {
    const closingTurn = agentTurns.find((t) => t.round_phase === 'closing')
    candidates.push({
      content: `Audience favorite (${strongestVotes.length} strongest-argument votes): ${summarize(closingTurn?.transcript ?? agentTurns[agentTurns.length - 1]?.transcript ?? '', 150)}`,
      category: 'audience_highlight',
      significance: 0.75,
    })
  }

  // 6. Evasiveness flag — negative memory
  const evasiveVotes = votes.filter(
    (v) => v.vote_type === 'most_evasive' && v.target_agent_id === agentId,
  )
  if (evasiveVotes.length >= 2) {
    candidates.push({
      content: `Flagged as evasive by audience (${evasiveVotes.length} votes). Needs to address this tendency.`,
      category: 'rivalry_moment',
      significance: 0.7,
    })
  }

  return candidates
}

function detectsConcession(text: string): boolean {
  const patterns = [
    'i concede',
    'you make a fair point',
    'i\'ll grant',
    'that\'s a valid',
    'you\'re right about',
    'i have to acknowledge',
    'fair enough',
    'i\'ll give you that',
  ]
  const lower = text.toLowerCase()
  return patterns.some((p) => lower.includes(p))
}

function summarize(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trim() + '...'
}
