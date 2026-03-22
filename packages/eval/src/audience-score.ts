import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getDebateVotes,
  getEvalRunsForDebate,
  updateEvalRunAudienceScore,
} from '@bipi/db'
import { createLogger } from '@bipi/shared'
import type { UUID } from '@bipi/shared'

const log = createLogger('eval:audience-score')

const POSITIVE_VOTE_TYPES = [
  'strongest_argument',
  'best_evidence',
  'best_rebuttal',
  'best_concession',
  'round_winner',
  'most_persuasive',
]

const NEGATIVE_VOTE_TYPE = 'most_evasive'

/**
 * Layer 3 of the scoring system: Audience Score.
 *
 * Computes a standalone 0-1 audience score per agent from debate_votes.
 * Positive votes (strongest_argument, best_evidence, etc.) increase score.
 * most_evasive votes apply a penalty.
 *
 * Must be called after evaluateDebate() — requires eval runs to exist.
 */
export async function computeAudienceScores(db: SupabaseClient, debateId: UUID): Promise<void> {
  const [votes, evalRuns] = await Promise.all([
    getDebateVotes(db, debateId),
    getEvalRunsForDebate(db, debateId),
  ])

  if (evalRuns.length === 0) {
    log.warn(`No eval runs found for debate ${debateId}, skipping audience scoring`)
    return
  }

  // Count positive and negative votes across all agents
  const positiveVotes = votes.filter((v) => POSITIVE_VOTE_TYPES.includes(v.vote_type))
  const negativeVotes = votes.filter((v) => v.vote_type === NEGATIVE_VOTE_TYPE)
  const totalPositive = positiveVotes.length
  const totalNegative = negativeVotes.length

  if (totalPositive === 0 && totalNegative === 0) {
    log.info(`No audience votes for debate ${debateId}, setting audience_score = null`)
    for (const run of evalRuns) {
      await updateEvalRunAudienceScore(db, run.id, null)
    }
    return
  }

  for (const run of evalRuns) {
    const agentId = run.agent_id
    const positiveForAgent = positiveVotes.filter((v) => v.target_agent_id === agentId).length
    const negativeForAgent = negativeVotes.filter((v) => v.target_agent_id === agentId).length

    let score: number
    if (totalPositive === 0) {
      // Only evasive votes exist — score based on penalty only
      score = Math.max(0, 0.5 - 0.15 * (negativeForAgent / totalNegative))
    } else {
      const positiveRatio = positiveForAgent / totalPositive
      const evasivePenalty = totalNegative > 0 ? 0.15 * (negativeForAgent / totalNegative) : 0
      score = Math.max(0, Math.min(1, positiveRatio - evasivePenalty))
    }

    await updateEvalRunAudienceScore(db, run.id, score)
    log.info(`Audience score for agent ${agentId}: ${score.toFixed(3)}`)
  }
}
