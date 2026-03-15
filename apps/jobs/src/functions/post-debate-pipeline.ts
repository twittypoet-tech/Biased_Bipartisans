import { getSupabaseClient } from '@bipi/db'
import { evaluateDebate } from './evaluate-debate.js'
import { extractMemories } from './extract-memories.js'
import { generateReflections } from './generate-reflection.js'
import { updateTraits } from './update-traits.js'
import { checkConvergence } from './check-convergence.js'

/**
 * Complete post-debate pipeline.
 *
 * Runs sequentially after a debate ends:
 * 1. Evaluate all agents (6-dimension scoring)
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

  console.log(`[Pipeline] Starting post-debate pipeline for debate ${debateId}`)

  // Step 1: Evaluate
  console.log('[Pipeline] Step 1/5: Evaluating agents...')
  const agentIds = await evaluateDebate(db, debateId)
  console.log(`[Pipeline] Evaluated ${agentIds.length} agents`)

  // Step 2: Extract memories
  console.log('[Pipeline] Step 2/5: Extracting memory candidates...')
  await extractMemories(db, debateId, agentIds)
  console.log('[Pipeline] Memory candidates extracted')

  // Step 3: Generate reflections
  console.log('[Pipeline] Step 3/5: Generating reflections...')
  await generateReflections(db, debateId, agentIds)
  console.log('[Pipeline] Reflections generated')

  // Step 4: Update trait vectors
  console.log('[Pipeline] Step 4/5: Updating trait vectors...')
  await updateTraits(db, debateId, agentIds)
  console.log('[Pipeline] Trait vectors updated')

  // Step 5: Check convergence
  console.log('[Pipeline] Step 5/5: Checking for convergence...')
  const alerts = await checkConvergence(db, agentIds)
  if (alerts.length > 0) {
    console.log(`[Pipeline] WARNING: ${alerts.length} convergence alert(s) detected`)
    for (const alert of alerts) {
      console.log(`  - Agents ${alert.agentA} <-> ${alert.agentB}: ${(alert.similarity * 100).toFixed(1)}% similar`)
    }
  } else {
    console.log('[Pipeline] No convergence issues detected')
  }

  const durationMs = Date.now() - startTime
  console.log(`[Pipeline] Complete in ${(durationMs / 1000).toFixed(1)}s`)

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
