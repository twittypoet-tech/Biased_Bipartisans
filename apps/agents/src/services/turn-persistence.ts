import type { SupabaseClient } from '@supabase/supabase-js'
import { insertDebateTurn } from '@bipi/db'
import type { ClaimTier, RoundPhase, SpeakerType, UUID } from '@bipi/shared'

export interface PersistTurnInput {
  debateId: UUID
  speakerType: SpeakerType
  speakerId: UUID
  roundPhase: RoundPhase
  turnIndex: number
  transcript: string
  claimTier?: ClaimTier | null
  claimTags?: string[]
  evidenceMetadata?: Record<string, unknown> | null
  durationMs?: number | null
  audioUrl?: string | null
}

/**
 * Persist a debate turn to the database.
 */
export async function persistTurn(db: SupabaseClient, input: PersistTurnInput) {
  return insertDebateTurn(db, {
    debate_id: input.debateId,
    speaker_type: input.speakerType,
    speaker_id: input.speakerId,
    round_phase: input.roundPhase,
    turn_index: input.turnIndex,
    transcript: input.transcript,
    claim_tier: input.claimTier ?? null,
    claim_tags: input.claimTags ?? [],
    evidence_metadata: input.evidenceMetadata ?? null,
    duration_ms: input.durationMs ?? null,
    audio_url: input.audioUrl ?? null,
  })
}

/**
 * Extract the dominant claim tier from an agent's transcript.
 *
 * Agents are instructed to label their claims with tier markers.
 * This does simple keyword matching — a more sophisticated version
 * would use LLM-based classification in the evaluation pipeline.
 */
export function extractClaimTier(transcript: string): ClaimTier | null {
  const lower = transcript.toLowerCase()

  // Check for explicit tier labels (agents are prompted to use these)
  const tierPatterns: Array<{ tier: ClaimTier; patterns: string[] }> = [
    {
      tier: 'verified' as ClaimTier,
      patterns: ['[verified]', 'tier: verified', 'verified fact', 'established fact'],
    },
    {
      tier: 'plausible_inference' as ClaimTier,
      patterns: ['[plausible', 'tier: plausible', 'plausible inference', 'reasonable inference'],
    },
    {
      tier: 'speculative' as ClaimTier,
      patterns: ['[speculative]', 'tier: speculative', 'i speculate', 'speculation:'],
    },
    {
      tier: 'narrative_rhetoric' as ClaimTier,
      patterns: ['[narrative', '[rhetoric', 'tier: narrative', 'rhetorically speaking'],
    },
  ]

  for (const { tier, patterns } of tierPatterns) {
    if (patterns.some((p) => lower.includes(p))) {
      return tier
    }
  }

  return null
}

/**
 * Format persisted turns into a summary string for moderator transitions.
 */
export function buildRoundSummary(
  turns: Array<{ speakerName: string; transcript: string }>,
): string {
  if (turns.length === 0) return '(No turns recorded in this round)'

  return turns
    .map((t) => `**${t.speakerName}**: ${t.transcript.slice(0, 200)}${t.transcript.length > 200 ? '...' : ''}`)
    .join('\n\n')
}
