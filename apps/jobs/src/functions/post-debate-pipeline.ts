import { getSupabaseClient, getTournamentMatchupByDebateId } from '@bipi/db'
import { createLogger } from '@bipi/shared'
import { evaluateDebate, runAiJudgeEvaluation } from '@bipi/eval'
import { extractMemories } from './extract-memories.js'
import { generateReflections } from './generate-reflection.js'
import { updateTraits } from './update-traits.js'
import { checkConvergence } from './check-convergence.js'
import { inngest } from '../inngest/client.js'

const log = createLogger('jobs:pipeline')

/**
 * Complete post-debate pipeline.
 *
 * Runs sequentially after a debate ends:
 * 1. Evaluate all agents (6-dimension heuristic scoring)
 * 1b. AI Judge Panel (Claude + GPT-4o scoring, Layer 1)
 * 2. Extract memory candidates from debate turns
 * 3. Generate structured reflections
 * 4. Update trait vectors based on eval scores
 * 5. Check for convergence between agents
 * 6. (conditional) Advance tournament bracket if debate is part of a tournament
 *
 * Can be triggered by Inngest event or called directly.
 */
export async function runPostDebatePipeline(debateId: string): Promise<PipelineResult> {
  const db = getSupabaseClient()
  const startTime = Date.now()

  log.info(`Starting post-debate pipeline for debate ${debateId}`)

  // Check if this debate is part of a tournament (do early so matchup data is available)
  const tournamentMatchup = await getTournamentMatchupByDebateId(db, debateId)

  // Step 1: Evaluate (heuristic scoring)
  log.info('Step 1/5: Evaluating agents...')
  const agentIds = await evaluateDebate(db, debateId)
  log.info(`Evaluated ${agentIds.length} agents`)

  // Step 1b: AI Judge Panel (Layer 1)
  log.info('Step 1b/5: Running AI judge evaluation...')
  await runAiJudgeEvaluation(db, debateId)
  log.info('AI judge evaluation complete')

  // Step 2: Extract memories
  log.info('Step 2/5: Extracting memory candidates...')
  await extractMemories(db, debateId, agentIds)
  log.info('Memory candidates extracted')

  // Step 3: Generate reflections
  log.info('Step 3/5: Generating reflections...')
  await generateReflections(db, debateId, agentIds)
  log.info('Reflections generated')

  // Step 4: Update trait vectors
  log.info('Step 4/5: Updating trait vectors...')
  await updateTraits(db, debateId, agentIds)
  log.info('Trait vectors updated')

  // Step 5: Check convergence
  log.info('Step 5/5: Checking for convergence...')
  const alerts = await checkConvergence(db, agentIds)
  if (alerts.length > 0) {
    log.warn(`${alerts.length} convergence alert(s) detected`)
    for (const alert of alerts) {
      log.warn(`Agents ${alert.agentA} <-> ${alert.agentB}: ${(alert.similarity * 100).toFixed(1)}% similar`)
    }
  } else {
    log.info('No convergence issues detected')
  }

  // Step 6: Tournament bracket advancement (if applicable)
  let tournamentAdvanced = false
  if (tournamentMatchup) {
    log.info('Step 6: Advancing tournament bracket...')

    // Determine the winner from composite scores
    // Pick agent with highest composite_score; fall back to ai_judge_score; then speaking_order
    const { data: evalRuns } = await db
      .from('agent_eval_runs')
      .select('agent_id, composite_score, ai_judge_score')
      .eq('debate_id', debateId)

    const { data: participants } = await db
      .from('debate_participants')
      .select('agent_id, speaking_order')
      .eq('debate_id', debateId)
      .eq('role', 'debater')
      .order('speaking_order')

    const winnerAgentId = determineWinner(evalRuns ?? [], participants ?? [])

    if (winnerAgentId) {
      await inngest.send({
        name: 'tournament/matchup-completed',
        data: {
          matchupId: tournamentMatchup.id,
          tournamentId: tournamentMatchup.tournament_id,
          debateId,
          winnerAgentId,
          roundNumber: tournamentMatchup.round_number,
        },
      })
      log.info(`Tournament event emitted. Winner: ${winnerAgentId}`)
      tournamentAdvanced = true
    } else {
      log.warn('Could not determine tournament winner — no eval data')
    }
  }

  const durationMs = Date.now() - startTime
  log.info(`Pipeline complete in ${(durationMs / 1000).toFixed(1)}s`)

  return {
    debateId,
    agentIds,
    convergenceAlerts: alerts.length,
    tournamentAdvanced,
    durationMs,
  }
}

function determineWinner(
  evalRuns: Array<{ agent_id: string; composite_score: number | null; ai_judge_score: number | null }>,
  participants: Array<{ agent_id: string; speaking_order: number }>,
): string | null {
  if (evalRuns.length === 0) return null

  const sorted = [...evalRuns].sort((a, b) => {
    const compDiff = (b.composite_score ?? 0) - (a.composite_score ?? 0)
    if (compDiff !== 0) return compDiff

    const judgeDiff = (b.ai_judge_score ?? 0) - (a.ai_judge_score ?? 0)
    if (judgeDiff !== 0) return judgeDiff

    // Tiebreak: lower speaking_order wins
    const aOrder = participants.find((p) => p.agent_id === a.agent_id)?.speaking_order ?? 999
    const bOrder = participants.find((p) => p.agent_id === b.agent_id)?.speaking_order ?? 999
    return aOrder - bOrder
  })

  return sorted[0]?.agent_id ?? null
}

export interface PipelineResult {
  debateId: string
  agentIds: string[]
  convergenceAlerts: number
  tournamentAdvanced: boolean
  durationMs: number
}
