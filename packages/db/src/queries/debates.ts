import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Debate,
  DebateFormatDefinition,
  DebateParticipant,
  DebateTurn,
  DebateVote,
  UUID,
} from '@bipi/shared'

export async function getDebate(db: SupabaseClient, debateId: UUID): Promise<Debate | null> {
  const { data, error } = await db.from('debates').select('*').eq('id', debateId).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getDebateBySlug(db: SupabaseClient, slug: string): Promise<Debate | null> {
  const { data, error } = await db.from('debates').select('*').eq('slug', slug).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function listDebates(
  db: SupabaseClient,
  filters?: { status?: string },
): Promise<Debate[]> {
  let query = db.from('debates').select('*').order('scheduled_at', { ascending: false })
  if (filters?.status) query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getDebateFormat(
  db: SupabaseClient,
  formatId: UUID,
): Promise<DebateFormatDefinition | null> {
  const { data, error } = await db
    .from('debate_format_definitions')
    .select('*')
    .eq('id', formatId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function listDebateFormats(
  db: SupabaseClient,
): Promise<DebateFormatDefinition[]> {
  const { data, error } = await db.from('debate_format_definitions').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function getDebateParticipants(
  db: SupabaseClient,
  debateId: UUID,
): Promise<DebateParticipant[]> {
  const { data, error } = await db
    .from('debate_participants')
    .select('*, agents(*)')
    .eq('debate_id', debateId)
    .order('speaking_order')
  if (error) throw error
  return data ?? []
}

export async function getDebateTurns(
  db: SupabaseClient,
  debateId: UUID,
): Promise<DebateTurn[]> {
  const { data, error } = await db
    .from('debate_turns')
    .select('*')
    .eq('debate_id', debateId)
    .order('turn_index')
  if (error) throw error
  return data ?? []
}

export async function insertDebateTurn(
  db: SupabaseClient,
  turn: Omit<DebateTurn, 'id' | 'created_at'>,
): Promise<DebateTurn> {
  const { data, error } = await db.from('debate_turns').insert(turn).select().single()
  if (error) throw error
  return data
}

/**
 * Get the next available turn_index for a debate.
 * Used by the live transcript poller to assign sequential indices.
 */
export async function getNextTurnIndex(db: SupabaseClient, debateId: UUID): Promise<number> {
  const { data } = await db
    .from('debate_turns')
    .select('turn_index')
    .eq('debate_id', debateId)
    .order('turn_index', { ascending: false })
    .limit(1)
    .single()
  return data ? data.turn_index + 1 : 0
}

/**
 * Save a Retell call recording URL for a specific agent in a debate.
 * Merges into the existing recordings JSONB without overwriting other agents.
 */
export async function saveDebateRecording(
  db: SupabaseClient,
  debateId: UUID,
  agentId: UUID,
  recordingUrl: string,
): Promise<void> {
  // Fetch, merge, update (safe for single-process post-debate writes)
  const { data } = await db.from('debates').select('recordings').eq('id', debateId).single()
  const current = (data?.recordings as Record<string, string>) ?? {}
  current[agentId] = recordingUrl
  const { error } = await db.from('debates').update({ recordings: current }).eq('id', debateId)
  if (error) throw error
}

export async function getDebateVotes(
  db: SupabaseClient,
  debateId: UUID,
  filters?: { vote_type?: string; round_phase?: string },
): Promise<DebateVote[]> {
  let query = db.from('debate_votes').select('*').eq('debate_id', debateId)
  if (filters?.vote_type) query = query.eq('vote_type', filters.vote_type)
  if (filters?.round_phase) query = query.eq('round_phase', filters.round_phase)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function insertDebateVote(
  db: SupabaseClient,
  vote: Omit<DebateVote, 'id' | 'created_at'>,
): Promise<DebateVote> {
  const { data, error } = await db.from('debate_votes').insert(vote).select().single()
  if (error) throw error
  return data
}

export async function insertDebateParticipant(
  db: SupabaseClient,
  participant: { debate_id: UUID; agent_id: UUID; role: string; speaking_order: number },
): Promise<DebateParticipant> {
  const { data, error } = await db.from('debate_participants').insert(participant).select().single()
  if (error) throw error
  return data
}

export async function removeDebateParticipant(
  db: SupabaseClient,
  debateId: UUID,
  agentId: UUID,
): Promise<void> {
  const { error } = await db
    .from('debate_participants')
    .delete()
    .eq('debate_id', debateId)
    .eq('agent_id', agentId)
  if (error) throw error
}

export async function updateTurnAudioUrl(
  db: SupabaseClient,
  debateId: UUID,
  turnIndex: number,
  audioUrl: string,
): Promise<void> {
  const { error } = await db
    .from('debate_turns')
    .update({ audio_url: audioUrl })
    .eq('debate_id', debateId)
    .eq('turn_index', turnIndex)
  if (error) throw error
}

export async function getScheduledDebatesDue(db: SupabaseClient): Promise<Debate[]> {
  const { data, error } = await db
    .from('debates')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function updateDebateStatus(
  db: SupabaseClient,
  debateId: UUID,
  status: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const { error } = await db
    .from('debates')
    .update({ status, ...extra })
    .eq('id', debateId)
  if (error) throw error
}
