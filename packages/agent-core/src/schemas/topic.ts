import { z } from 'zod'

export const TopicFramingSchema = z.object({
  headline: z.string().min(1),
  conflictDescription: z.string().min(1),
  forcedTradeoff: z.string().min(1),
  moralTension: z.string().nullable(),
  strategicTension: z.string().nullable(),
  identityTension: z.string().nullable(),
  decisionSurface: z.string().min(1),
})

export type TopicFraming = z.infer<typeof TopicFramingSchema>
