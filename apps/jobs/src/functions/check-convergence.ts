import type { SupabaseClient } from '@supabase/supabase-js'
import { getAgentTraitVectors } from '@bipi/db'
import type { UUID } from '@bipi/shared'

interface ConvergenceAlert {
  agentA: string
  agentB: string
  similarity: number
  sharedTraits: string[]
}

/**
 * Check for convergence between agents — are they becoming too similar?
 *
 * Compares trait vectors pairwise using cosine similarity.
 * Flags pairs that exceed the similarity threshold.
 * This implements the anti-convergence doctrine from the Evolution Policy.
 */
export async function checkConvergence(
  db: SupabaseClient,
  agentIds: string[],
  threshold = 0.85,
): Promise<ConvergenceAlert[]> {
  // Load all trait vectors
  const agentTraits: Map<string, Map<string, number>> = new Map()

  for (const agentId of agentIds) {
    const traits = await getAgentTraitVectors(db, agentId)
    const traitMap = new Map(traits.map((t) => [t.trait_name, t.value]))
    agentTraits.set(agentId, traitMap)
  }

  const alerts: ConvergenceAlert[] = []

  // Pairwise comparison
  for (let i = 0; i < agentIds.length; i++) {
    for (let j = i + 1; j < agentIds.length; j++) {
      const idA = agentIds[i]!
      const idB = agentIds[j]!
      const traitsA = agentTraits.get(idA)!
      const traitsB = agentTraits.get(idB)!

      const { similarity, sharedTraits } = computeSimilarity(traitsA, traitsB)

      if (similarity >= threshold) {
        alerts.push({ agentA: idA, agentB: idB, similarity, sharedTraits })

        // Log convergence warning to drift_events table
        await db.from('agent_drift_events').insert([
          {
            agent_id: idA,
            from_stage: 'stable',
            to_stage: 'variant',
            trigger_description: `Convergence alert: similarity with agent ${idB} = ${(similarity * 100).toFixed(1)}%`,
            evidence_summary: `Shared high-similarity traits: ${sharedTraits.join(', ')}`,
            approved: false,
          },
          {
            agent_id: idB,
            from_stage: 'stable',
            to_stage: 'variant',
            trigger_description: `Convergence alert: similarity with agent ${idA} = ${(similarity * 100).toFixed(1)}%`,
            evidence_summary: `Shared high-similarity traits: ${sharedTraits.join(', ')}`,
            approved: false,
          },
        ])
      }
    }
  }

  return alerts
}

function computeSimilarity(
  traitsA: Map<string, number>,
  traitsB: Map<string, number>,
): { similarity: number; sharedTraits: string[] } {
  // Get all trait names from both agents
  const allTraits = new Set([...traitsA.keys(), ...traitsB.keys()])

  if (allTraits.size === 0) return { similarity: 0, sharedTraits: [] }

  // Build vectors (default 0.5 for missing traits)
  const vecA: number[] = []
  const vecB: number[] = []
  const traitNames: string[] = []

  for (const trait of allTraits) {
    vecA.push(traitsA.get(trait) ?? 0.5)
    vecB.push(traitsB.get(trait) ?? 0.5)
    traitNames.push(trait)
  }

  // Cosine similarity
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i]! * vecB[i]!
    normA += vecA[i]! * vecA[i]!
    normB += vecB[i]! * vecB[i]!
  }

  const similarity = normA > 0 && normB > 0
    ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
    : 0

  // Find traits that are very similar (within 0.1 of each other)
  const sharedTraits: string[] = []
  for (let i = 0; i < traitNames.length; i++) {
    if (Math.abs(vecA[i]! - vecB[i]!) < 0.1) {
      sharedTraits.push(traitNames[i]!)
    }
  }

  return { similarity, sharedTraits }
}
