import { getSupabaseClient } from '@bipi/db'
import { createLogger } from '@bipi/shared'
import { evaluateDebate } from './evaluate-debate.js'
import { runAiJudgeEvaluation } from './ai-judge-evaluate.js'
import { extractMemories } from './extract-memories.js'
import { generateReflections } from './generate-reflection.js'
import { updateTraits } from './update-traits.js'
import { checkConvergence } from './check-convergence.js'

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
 *
 * Can be triggered by Inngest event or called directly.
 */
export async function runPostDebatePipeline(debateId: string): Promise<PipelineResult> {
  const db = getSupabaseClient()
  const startTime = Date.now()

  log.info(`Starting post-debate pipeline for debate ${debateId}`)

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

  const durationMs = Date.now() - startTime
  log.info(`Pipeline complete in ${(durationMs / 1000).toFixed(1)}s`)

  return {
    debateId,
    agentIds,
    convergenceAlerts: alerts.length,
    durationMs,
  }
}

export interface PipelineResult {
  debateId: string
  agentIds: string[]
  convergenceAlerts: number
  durationMs: number
}
