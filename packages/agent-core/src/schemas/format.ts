import { z } from 'zod'

export const RoundDefinitionSchema = z.object({
  phase: z.enum(['opening', 'rebuttal', 'pressure', 'audience_evidence', 'closing', 'discussion']),
  durationSeconds: z.number().int().positive(),
  speakingOrder: z.enum(['sequential', 'directed', 'free']),
  allowInterruptions: z.boolean(),
  moderatorActive: z.boolean(),
  description: z.string(),
})

export const DebateFormatSchema = z.object({
  name: z.string().min(1),
  roomFormat: z.enum(['duel', 'triangle', 'panel_clash', 'tribunal', 'crossfire', 'synthesis']),
  minParticipants: z.number().int().min(2),
  maxParticipants: z.number().int().min(2),
  roundSequence: z.array(RoundDefinitionSchema).min(1),
  moderatorBehavior: z.record(z.string(), z.string()),
})

export type RoundDefinition = z.infer<typeof RoundDefinitionSchema>
export type DebateFormat = z.infer<typeof DebateFormatSchema>
