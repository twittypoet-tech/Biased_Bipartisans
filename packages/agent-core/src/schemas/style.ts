import { z } from 'zod'

const unitInterval = z.number().min(0).max(1)

export const StyleProfileSchema = z.object({
  temperament: z.string().min(1),
  rhetoricalOS: z.array(z.string()).min(1),
  tone: z.string().min(1),
  pace: z.string().min(1),
  humorLevel: unitInterval,
  certaintyLevel: unitInterval,
  interruptionTendency: unitInterval,
  abstractionLevel: unitInterval,
  warmth: unitInterval,
  rhetoricalDevices: z.array(z.string()),
  sentenceStyle: z.string(),
  signatureBehaviors: z.array(z.string()).min(1),
})

export type StyleProfile = z.infer<typeof StyleProfileSchema>
