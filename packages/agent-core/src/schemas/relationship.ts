import { z } from 'zod'

export const RelationshipProfileSchema = z.object({
  targetAgentId: z.string().uuid(),
  targetAgentName: z.string(),
  respectScore: z.number().min(0).max(1),
  distrustScore: z.number().min(0).max(1),
  rivalryScore: z.number().min(0).max(1),
  relationshipType: z.string(),
  attackAngles: z.array(z.string()),
  knownWeakPoints: z.array(z.string()),
  sharedHistorySummary: z.string().nullable(),
})

export type RelationshipProfile = z.infer<typeof RelationshipProfileSchema>
