import { z } from 'zod'

export const WorldviewConfigSchema = z.object({
  coreThesis: z.string().min(1),
  issueLenses: z.record(z.string(), z.string()),
  values: z.array(z.string()).min(1),
  beliefRules: z.array(z.string()),
  sourceRules: z.array(z.string()),
  concessionRules: z.array(z.string()),
  redLines: z.array(z.string()).min(1),
  archetypeTraits: z.array(z.string()),
  doctrine: z.array(z.string()).min(1),
})

export type WorldviewConfig = z.infer<typeof WorldviewConfigSchema>
