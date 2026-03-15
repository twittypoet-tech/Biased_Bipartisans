import { z } from 'zod'

export const PhraseBankSchema = z.object({
  openers: z.array(z.string()),
  attacks: z.array(z.string()),
  rebuttals: z.array(z.string()),
  concessions: z.array(z.string()),
  closers: z.array(z.string()),
  audienceCallouts: z.array(z.string()),
  topicSpecificPhrases: z.record(z.string(), z.array(z.string())),
})

export type PhraseBank = z.infer<typeof PhraseBankSchema>
