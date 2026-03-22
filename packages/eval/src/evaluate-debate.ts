import type { SupabaseClient } from '@supabase/supabase-js'
import { getDebateTurns, getDebateVotes, getDebateParticipants } from '@bipi/db'
import { insertEvalRun } from '@bipi/db'
import type { DebateTurn, DebateVote, UUID } from '@bipi/shared'

interface AgentEvalScores {
  epistemicDiscipline: number
  persuasionQuality: number
  distinctiveness: number
  rivalryDynamics: number
  participationBalance: number
  castChemistry: number
  overall: number
  details: Record<string, unknown>
}

/**
 * Evaluate all agents in a completed debate across 6 scoring dimensions.
 * Returns the agent IDs that were evaluated.
 */
export async function evaluateDebate(db: SupabaseClient, debateId: UUID): Promise<string[]> {
  const [turns, votes, participants] = await Promise.all([
    getDebateTurns(db, debateId),
    getDebateVotes(db, debateId),
    getDebateParticipants(db, debateId),
  ])

  const debaterParticipants = participants.filter((p) => p.role === 'debater')
  const agentIds: string[] = []

  for (const participant of debaterParticipants) {
    const agentId = participant.agent_id
    const agentTurns = turns.filter((t) => t.speaker_id === agentId && t.speaker_type === 'agent')
    const allAgentTurns = turns.filter((t) => t.speaker_type === 'agent')

    const scores = computeScores(agentId, agentTurns, allAgentTurns, votes, debaterParticipants)

    await insertEvalRun(db, {
      debate_id: debateId,
      agent_id: agentId,
      epistemic_discipline_score: scores.epistemicDiscipline,
      persuasion_quality_score: scores.persuasionQuality,
      distinctiveness_score: scores.distinctiveness,
      rivalry_dynamics_score: scores.rivalryDynamics,
      participation_balance_score: scores.participationBalance,
      cast_chemistry_score: scores.castChemistry,
      overall_score: scores.overall,
      scoring_details: scores.details,
    })

    agentIds.push(agentId)
  }

  return agentIds
}

function computeScores(
  agentId: string,
  agentTurns: DebateTurn[],
  allAgentTurns: DebateTurn[],
  votes: DebateVote[],
  participants: Array<{ agent_id: string }>,
): AgentEvalScores {
  const ep = scoreEpistemicDiscipline(agentTurns)
  const pq = scorePersuasionQuality(agentId, votes)
  const dist = scoreDistinctiveness(agentId, agentTurns, allAgentTurns)
  const rivalry = scoreRivalryDynamics(agentId, agentTurns, allAgentTurns)
  const balance = scoreParticipationBalance(agentTurns, allAgentTurns, participants.length)
  const chemistry = scoreCastChemistry(agentId, votes)

  const overall = (ep + pq + dist + rivalry + balance + chemistry) / 6

  return {
    epistemicDiscipline: ep,
    persuasionQuality: pq,
    distinctiveness: dist,
    rivalryDynamics: rivalry,
    participationBalance: balance,
    castChemistry: chemistry,
    overall,
    details: {
      turnCount: agentTurns.length,
      totalTurns: allAgentTurns.length,
      claimTiersUsed: countClaimTiers(agentTurns),
      votesReceived: countVotesForAgent(agentId, votes),
    },
  }
}

/**
 * Epistemic Discipline (0-1):
 * Rewards: using claim tier labels, verified/plausible claims, evidence metadata
 * Penalizes: unlabeled claims, narrative-only arguments
 */
function scoreEpistemicDiscipline(turns: DebateTurn[]): number {
  if (turns.length === 0) return 0.5

  let score = 0.5 // baseline

  const labeled = turns.filter((t) => t.claim_tier !== null).length
  const labelRatio = labeled / turns.length
  score += labelRatio * 0.3 // up to +0.3 for labeling

  // Reward verified/plausible, penalize narrative-only
  const tiers = countClaimTiers(turns)
  const verifiedRatio = ((tiers.verified ?? 0) + (tiers.plausible_inference ?? 0)) / Math.max(labeled, 1)
  score += verifiedRatio * 0.2 // up to +0.2 for high-quality claims

  return clamp(score)
}

/**
 * Persuasion Quality (0-1):
 * Based on audience votes — strongest_argument, best_evidence, best_rebuttal
 */
function scorePersuasionQuality(agentId: string, votes: DebateVote[]): number {
  const persuasionTypes = ['strongest_argument', 'best_evidence', 'best_rebuttal', 'best_concession']
  const relevantVotes = votes.filter((v) => persuasionTypes.includes(v.vote_type))

  if (relevantVotes.length === 0) return 0.5

  const forAgent = relevantVotes.filter((v) => v.target_agent_id === agentId).length
  const ratio = forAgent / relevantVotes.length

  // Scale: 0 votes = 0.3, fair share = 0.6, dominant = 0.9+
  return clamp(0.3 + ratio * 1.2)
}

/**
 * Distinctiveness (0-1):
 * Measures how different this agent's language is from others in the debate.
 * Uses simple n-gram overlap as a proxy.
 */
function scoreDistinctiveness(agentId: string, agentTurns: DebateTurn[], allTurns: DebateTurn[]): number {
  if (agentTurns.length === 0) return 0.5

  const agentText = agentTurns.map((t) => t.transcript).join(' ').toLowerCase()
  const otherText = allTurns
    .filter((t) => t.speaker_id !== agentId)
    .map((t) => t.transcript)
    .join(' ')
    .toLowerCase()

  if (!otherText) return 0.7

  // Simple bigram overlap check
  const agentBigrams = new Set(getBigrams(agentText))
  const otherBigrams = new Set(getBigrams(otherText))

  if (agentBigrams.size === 0) return 0.5

  let overlap = 0
  for (const bg of agentBigrams) {
    if (otherBigrams.has(bg)) overlap++
  }

  const overlapRatio = overlap / agentBigrams.size
  // Lower overlap = more distinctive. Target: ~30-50% overlap is natural
  return clamp(1.0 - overlapRatio * 0.8)
}

/**
 * Rivalry Dynamics (0-1):
 * Did the agent engage with rivals? Were there direct exchanges?
 */
function scoreRivalryDynamics(agentId: string, agentTurns: DebateTurn[], allTurns: DebateTurn[]): number {
  if (agentTurns.length === 0) return 0.5

  // Check if agent's turns reference other agents' content (rebuttal engagement)
  const otherAgentIds = new Set(
    allTurns.filter((t) => t.speaker_id !== agentId && t.speaker_type === 'agent').map((t) => t.speaker_id),
  )

  if (otherAgentIds.size === 0) return 0.5

  // Count rebuttal-phase turns (indicates direct engagement)
  const rebuttalTurns = agentTurns.filter((t) => t.round_phase === 'rebuttal' || t.round_phase === 'pressure')
  const engagementRatio = rebuttalTurns.length / Math.max(agentTurns.length, 1)

  return clamp(0.4 + engagementRatio * 0.6)
}

/**
 * Participation Balance (0-1):
 * How close to equal share of turns did this agent get?
 */
function scoreParticipationBalance(agentTurns: DebateTurn[], allAgentTurns: DebateTurn[], participantCount: number): number {
  if (allAgentTurns.length === 0 || participantCount === 0) return 0.5

  const fairShare = allAgentTurns.length / participantCount
  const actual = agentTurns.length

  if (fairShare === 0) return 0.5

  const deviation = Math.abs(actual - fairShare) / fairShare
  // Perfect balance = 1.0, heavily skewed = low
  return clamp(1.0 - deviation * 0.5)
}

/**
 * Cast Chemistry (0-1):
 * Did this agent's presence improve the debate? Measured by total engagement.
 */
function scoreCastChemistry(agentId: string, votes: DebateVote[]): number {
  if (votes.length === 0) return 0.5

  const agentVotes = votes.filter((v) => v.target_agent_id === agentId).length
  const evasiveVotes = votes.filter((v) => v.target_agent_id === agentId && v.vote_type === 'most_evasive').length

  // Engagement (any votes) is positive, evasiveness is negative
  const engagementScore = Math.min(agentVotes / 10, 1.0) * 0.7
  const evasivePenalty = Math.min(evasiveVotes / 5, 1.0) * 0.3

  return clamp(0.4 + engagementScore - evasivePenalty)
}

// ── Helpers ──

function countClaimTiers(turns: DebateTurn[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const t of turns) {
    if (t.claim_tier) {
      counts[t.claim_tier] = (counts[t.claim_tier] ?? 0) + 1
    }
  }
  return counts
}

function countVotesForAgent(agentId: string, votes: DebateVote[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const v of votes) {
    if (v.target_agent_id === agentId) {
      counts[v.vote_type] = (counts[v.vote_type] ?? 0) + 1
    }
  }
  return counts
}

function getBigrams(text: string): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 2)
  const bigrams: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`)
  }
  return bigrams
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}
