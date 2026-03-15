import { z } from 'zod'
import { WorldviewConfigSchema } from './worldview'
import { StyleProfileSchema } from './style'
import { PhraseBankSchema } from './phrasebank'
import { EpistemicProfileSchema } from './epistemic'
import { RelationshipProfileSchema } from './relationship'
import { TopicFramingSchema } from './topic'
import { RoundDefinitionSchema } from './format'

export const PersonaPacketSchema = z.object({
  // Public identity
  agentId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  archetype: z.string(),
  role: z.enum(['debater', 'moderator']),
  llmProvider: z.string(),
  llmModel: z.string(),
  voiceId: z.string().nullable(),

  // Core configs
  worldview: WorldviewConfigSchema,
  style: StyleProfileSchema,
  phrases: PhraseBankSchema,
  epistemic: EpistemicProfileSchema,

  // Room-specific context
  relationships: z.array(RelationshipProfileSchema),
  relevantMemories: z.array(
    z.object({
      content: z.string(),
      category: z.string(),
      significance: z.number(),
    }),
  ),

  // Debate context
  topicFraming: TopicFramingSchema,
  roundSequence: z.array(RoundDefinitionSchema),
  debateId: z.string().uuid(),
  roomName: z.string(),

  // Runtime constraints
  runtimeConstraints: z.object({
    maxTurnLengthTokens: z.number().int().positive().default(500),
    mustClassifyClaims: z.boolean().default(true),
    allowInterruptions: z.boolean().default(false),
    speculationRequiresLabel: z.boolean().default(true),
  }),
})

export type PersonaPacket = z.infer<typeof PersonaPacketSchema>
