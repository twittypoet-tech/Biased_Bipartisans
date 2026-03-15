import type { SupabaseClient } from '@supabase/supabase-js'
import type { UUID, AgentMemory } from '@bipi/shared'
import {
  getFullAgentConfig,
  getAgentRelationshipsForParticipants,
  getCanonMemories,
} from '@bipi/db'
import { PersonaPacketSchema, type PersonaPacket } from '../schemas/persona-packet'
import type { TopicFraming } from '../schemas/topic'
import type { RoundDefinition } from '../schemas/format'
import {
  mapWorldviewToConfig,
  mapStyleToConfig,
  mapPhrasesToConfig,
  mapEpistemicToConfig,
  mapRelationshipToProfile,
} from './mappers'

export interface CompilePersonaPacketInput {
  agentId: UUID
  debateId: UUID
  roomName: string
  topicFraming: TopicFraming
  roundSequence: RoundDefinition[]
  participantAgentIds: UUID[]
  participantNames: Record<UUID, string>
  runtimeConstraints?: Partial<PersonaPacket['runtimeConstraints']>
}

/**
 * Compiles a full PersonaPacket for an agent entering a debate.
 *
 * This is the central function that assembles all config layers from the database
 * into a single runtime-ready packet. The agent worker consumes this to build
 * its system prompt and configure its behavior.
 *
 * Flow:
 *   1. Load agent + all active configs from DB
 *   2. Load relationships for current room participants only
 *   3. Load canon memories (approved, durable summaries)
 *   4. Map DB records to validated config types
 *   5. Validate the assembled packet against the Zod schema
 *   6. Return the validated PersonaPacket
 */
export async function compilePersonaPacket(
  db: SupabaseClient,
  input: CompilePersonaPacketInput,
): Promise<PersonaPacket> {
  const {
    agentId,
    debateId,
    roomName,
    topicFraming,
    roundSequence,
    participantAgentIds,
    participantNames,
    runtimeConstraints,
  } = input

  // 1. Load full agent config (agent + active worldview/style/phrases/epistemic/relationships)
  const fullConfig = await getFullAgentConfig(db, agentId)
  if (!fullConfig) {
    throw new Error(`Agent not found: ${agentId}`)
  }

  const { agent, worldview, style, phrases, epistemic } = fullConfig

  if (!worldview) throw new Error(`No active worldview for agent ${agent.name}`)
  if (!style) throw new Error(`No active style profile for agent ${agent.name}`)
  if (!phrases) throw new Error(`No active phrase bank for agent ${agent.name}`)
  if (!epistemic) throw new Error(`No active epistemic profile for agent ${agent.name}`)

  // 2. Load relationships only for agents in the current room
  const otherParticipants = participantAgentIds.filter((id) => id !== agentId)
  const roomRelationships = await getAgentRelationshipsForParticipants(
    db,
    agentId,
    otherParticipants,
  )

  // 3. Load canon memories (the approved, durable identity memories)
  const canonMemories = await getCanonMemories(db, agentId)

  // Select the most significant memories, capped at 20 for context window efficiency
  const relevantMemories = selectRelevantMemories(canonMemories, 20)

  // 4. Map database records to validated config types
  const packet: PersonaPacket = {
    agentId: agent.id,
    name: agent.name,
    slug: agent.slug,
    archetype: agent.archetype,
    role: agent.role as 'debater' | 'moderator',
    llmProvider: agent.llm_provider,
    llmModel: agent.llm_model,
    voiceId: agent.voice_id,

    worldview: mapWorldviewToConfig(worldview),
    style: mapStyleToConfig(style),
    phrases: mapPhrasesToConfig(phrases),
    epistemic: mapEpistemicToConfig(epistemic),

    relationships: roomRelationships.map((r) =>
      mapRelationshipToProfile(r, participantNames[r.target_agent_id] ?? 'Unknown'),
    ),

    relevantMemories: relevantMemories.map((m) => ({
      content: m.content,
      category: m.category,
      significance: m.significance,
    })),

    topicFraming,
    roundSequence,
    debateId,
    roomName,

    runtimeConstraints: {
      maxTurnLengthTokens: runtimeConstraints?.maxTurnLengthTokens ?? 500,
      mustClassifyClaims: runtimeConstraints?.mustClassifyClaims ?? true,
      allowInterruptions: runtimeConstraints?.allowInterruptions ?? false,
      speculationRequiresLabel: runtimeConstraints?.speculationRequiresLabel ?? true,
    },
  }

  // 5. Validate the assembled packet
  const validated = PersonaPacketSchema.parse(packet)

  return validated
}

/**
 * Select the most relevant memories for a debate context.
 * Prioritizes by significance score, caps at maxCount.
 */
function selectRelevantMemories(memories: AgentMemory[], maxCount: number): AgentMemory[] {
  return memories
    .sort((a, b) => b.significance - a.significance)
    .slice(0, maxCount)
}
