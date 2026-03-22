import type { SupabaseClient } from '@supabase/supabase-js'
import { getEvalRunsForDebate, updateEvalRunCompositeScore } from '@bipi/db'
import { createLogger } from '@bipi/shared'
import type { UUID } from '@bipi/shared'

const log = createLogger('eval:composite-score')

const WEIGHTS = {
  ai_judge: 0.45,
  objective: 0.30,
  audience: 0.25,
}

/**
 * Computes the composite score for each agent in a debate.
 *
 * Formula: (AI Judge * 0.45) + (Objective * 0.30) + (Audience * 0.25)
 *
 * When a layer is null (e.g., no audience votes), weights are redistributed
 * proportionally among available layers.
 *
 * Must be called after all 3 layers have run.
 */
export async function computeCompositeScores(db: SupabaseClient, debateId: UUID): Promise<void> {
  const evalRuns = await getEvalRunsForDebate(db, debateId)

  if (evalRuns.length === 0) {
    log.warn(`No eval runs found for debate ${debateId}, skipping composite scoring`)
    return
  }

  for (const run of evalRuns) {
    const composite = computeComposite(
      run.ai_judge_score ?? null,
      run.objective_score ?? null,
      run.audience_score ?? null,
    )

    await updateEvalRunCompositeScore(db, run.id, composite)
    log.info(
      `Composite score for agent ${run.agent_id}: ${composite !== null ? composite.toFixed(3) : 'null'} ` +
        `(judge=${run.ai_judge_score ?? 'null'}, obj=${run.objective_score ?? 'null'}, aud=${run.audience_score ?? 'null'})`,
    )
  }
}

function computeComposite(
  aiJudge: number | null,
  objective: number | null,
  audience: number | null,
): number | null {
  const layers: Array<{ score: number; weight: number }> = []

  if (aiJudge != null) layers.push({ score: aiJudge, weight: WEIGHTS.ai_judge })
  if (objective != null) layers.push({ score: objective, weight: WEIGHTS.objective })
  if (audience != null) layers.push({ score: audience, weight: WEIGHTS.audience })

  if (layers.length === 0) return null

  // Redistribute weights proportionally among available layers
  const totalWeight = layers.reduce((sum, l) => sum + l.weight, 0)
  return layers.reduce((sum, l) => sum + l.score * (l.weight / totalWeight), 0)
}
