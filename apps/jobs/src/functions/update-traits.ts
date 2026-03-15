import type { SupabaseClient } from '@supabase/supabase-js'
import { getAgentTraitVectors, upsertTraitVector, getEvalRunsForDebate } from '@bipi/db'
import type { UUID } from '@bipi/shared'

/** Maximum trait adjustment per debate, keyed by update_class */
const MAX_DELTA: Record<string, number> = {
  auto: 0.05,
  slow_adaptive: 0.02,
  protected: 0, // never change
}

/** Maps eval dimensions to trait names */
const EVAL_TO_TRAIT: Record<string, string> = {
  epistemic_discipline_score: 'epistemic_rigor',
  persuasion_quality_score: 'persuasiveness',
  distinctiveness_score: 'distinctiveness',
  rivalry_dynamics_score: 'rivalry_engagement',
  participation_balance_score: 'participation_discipline',
  cast_chemistry_score: 'cast_chemistry',
}

/**
 * Update agent trait vectors based on post-debate evaluation scores.
 * Respects update_class: auto traits move fastest, protected traits never change.
 */
export async function updateTraits(db: SupabaseClient, debateId: UUID, agentIds: string[]): Promise<void> {
  const evalRuns = await getEvalRunsForDebate(db, debateId)

  for (const agentId of agentIds) {
    const evalRun = evalRuns.find((e) => e.agent_id === agentId)
    if (!evalRun) continue

    const existingTraits = await getAgentTraitVectors(db, agentId)
    const traitMap = new Map(existingTraits.map((t) => [t.trait_name, t]))

    for (const [evalKey, traitName] of Object.entries(EVAL_TO_TRAIT)) {
      const evalScore = (evalRun as unknown as Record<string, number | null>)[evalKey] ?? null
      if (evalScore === null) continue

      const existing = traitMap.get(traitName)
      const currentValue = existing?.value ?? 0.5
      const updateClass = existing?.update_class ?? 'auto'
      const maxDelta = MAX_DELTA[updateClass] ?? 0

      if (maxDelta === 0) continue

      // Move trait toward eval score, capped by maxDelta
      const rawDelta = evalScore - currentValue
      const cappedDelta = Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), maxDelta)
      const newValue = clamp(currentValue + cappedDelta)

      await upsertTraitVector(db, agentId, traitName, newValue, updateClass, debateId)
    }
  }
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value))
}
