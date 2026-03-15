import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Agent,
  AgentWorldview,
  AgentStyleProfile,
  AgentPhraseBank,
  AgentEpistemicProfile,
  AgentRelationship,
  UUID,
} from '@bipi/shared'

export async function getAgent(db: SupabaseClient, agentId: UUID): Promise<Agent | null> {
  const { data, error } = await db.from('agents').select('*').eq('id', agentId).single()
  if (error) throw error
  return data
}

export async function getAgentBySlug(db: SupabaseClient, slug: string): Promise<Agent | null> {
  const { data, error } = await db.from('agents').select('*').eq('slug', slug).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function listAgents(
  db: SupabaseClient,
  filters?: { status?: string; role?: string },
): Promise<Agent[]> {
  let query = db.from('agents').select('*').order('name')
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.role) query = query.eq('role', filters.role)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getActiveWorldview(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentWorldview | null> {
  const { data, error } = await db
    .from('agent_worldviews')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getActiveStyleProfile(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentStyleProfile | null> {
  const { data, error } = await db
    .from('agent_style_profiles')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getActivePhraseBank(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentPhraseBank | null> {
  const { data, error } = await db
    .from('agent_phrasebanks')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getActiveEpistemicProfile(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentEpistemicProfile | null> {
  const { data, error } = await db
    .from('agent_epistemic_profiles')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getAgentRelationships(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentRelationship[]> {
  const { data, error } = await db
    .from('agent_relationships')
    .select('*')
    .eq('agent_id', agentId)
  if (error) throw error
  return data ?? []
}

export async function getAgentRelationshipsForParticipants(
  db: SupabaseClient,
  agentId: UUID,
  participantIds: UUID[],
): Promise<AgentRelationship[]> {
  const { data, error } = await db
    .from('agent_relationships')
    .select('*')
    .eq('agent_id', agentId)
    .in('target_agent_id', participantIds)
  if (error) throw error
  return data ?? []
}

export interface FullAgentConfig {
  agent: Agent
  worldview: AgentWorldview | null
  style: AgentStyleProfile | null
  phrases: AgentPhraseBank | null
  epistemic: AgentEpistemicProfile | null
  relationships: AgentRelationship[]
}

export async function getFullAgentConfig(
  db: SupabaseClient,
  agentId: UUID,
): Promise<FullAgentConfig | null> {
  const agent = await getAgent(db, agentId)
  if (!agent) return null

  const [worldview, style, phrases, epistemic, relationships] = await Promise.all([
    getActiveWorldview(db, agentId),
    getActiveStyleProfile(db, agentId),
    getActivePhraseBank(db, agentId),
    getActiveEpistemicProfile(db, agentId),
    getAgentRelationships(db, agentId),
  ])

  return { agent, worldview, style, phrases, epistemic, relationships }
}
