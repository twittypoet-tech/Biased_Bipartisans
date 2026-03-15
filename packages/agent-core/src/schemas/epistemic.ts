import { z } from 'zod'

export const ClaimTierSchema = z.enum([
  'verified',
  'plausible_inference',
  'speculative',
  'narrative_rhetoric',
])

export const EpistemicProfileSchema = z.object({
  defaultClaimTierTendency: ClaimTierSchema,
  evidencePreferences: z.array(z.string()),
  epistemicRedLines: z.array(z.string()).min(1),
  speculationTolerance: z.number().min(0).max(1),
  highRiskCautionTopics: z.array(z.string()),
  sourceQualityThreshold: z.string(),
})

export type EpistemicProfile = z.infer<typeof EpistemicProfileSchema>
