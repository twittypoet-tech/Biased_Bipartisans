import type { SupabaseClient } from '@supabase/supabase-js'
import type { UUID } from '@bipi/shared'

export interface Tournament {
  id: UUID
  title: string
  slug: string
  description: string
  topic_title: string
  topic_framing: Record<string, unknown>
  format_id: UUID
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  bracket_size: number
  current_round: number
  total_rounds: number
  champion_agent_id: UUID | null
  created_at: string
  updated_at: string
}

export interface TournamentRound {
  id: UUID
  tournament_id: UUID
  round_number: number
  label: string
  status: 'pending' | 'scheduled' | 'live' | 'completed' | 'bye'
  started_at: string | null
  completed_at: string | null
}

export interface TournamentMatchup {
  id: UUID
  tournament_id: UUID
  round_id: UUID
  round_number: number
  matchup_number: number
  status: 'pending' | 'scheduled' | 'live' | 'completed' | 'bye'
  agent_a_id: UUID | null
  agent_b_id: UUID | null
  winner_agent_id: UUID | null
  debate_id: UUID | null
  next_matchup_id: UUID | null
  created_at: string
  updated_at: string
  // Joined agent data (populated by getTournamentMatchups)
  agent_a?: Record<string, unknown> | null
  agent_b?: Record<string, unknown> | null
  debate?: Record<string, unknown> | null
}

export interface AgentTrophy {
  id: UUID
  agent_id: UUID
  tournament_id: UUID
  trophy_type: string
  awarded_at: string
  tournaments?: Record<string, unknown> | null
}

// ── Read queries ───────────────────────────────────────────────────────────────

export async function listTournaments(db: SupabaseClient): Promise<Tournament[]> {
  const { data, error } = await db
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTournamentBySlug(
  db: SupabaseClient,
  slug: string,
): Promise<(Tournament & { champion?: Record<string, unknown> | null }) | null> {
  const { data, error } = await db
    .from('tournaments')
    .select('*, champion:agents!champion_agent_id(*)')
    .eq('slug', slug)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getTournamentById(
  db: SupabaseClient,
  id: UUID,
): Promise<Tournament | null> {
  const { data, error } = await db.from('tournaments').select('*').eq('id', id).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getTournamentRounds(
  db: SupabaseClient,
  tournamentId: UUID,
): Promise<TournamentRound[]> {
  const { data, error } = await db
    .from('tournament_rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getTournamentMatchups(
  db: SupabaseClient,
  tournamentId: UUID,
): Promise<TournamentMatchup[]> {
  const { data, error } = await db
    .from('tournament_matchups')
    .select(
      '*, agent_a:agents!agent_a_id(*), agent_b:agents!agent_b_id(*), debate:debates!debate_id(id,slug,status)',
    )
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
    .order('matchup_number', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getTournamentMatchupByDebateId(
  db: SupabaseClient,
  debateId: UUID,
): Promise<TournamentMatchup | null> {
  const { data, error } = await db
    .from('tournament_matchups')
    .select('*')
    .eq('debate_id', debateId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getAgentTrophies(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentTrophy[]> {
  const { data, error } = await db
    .from('agent_trophies')
    .select('*, tournaments(*)')
    .eq('agent_id', agentId)
    .order('awarded_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── Write helpers ──────────────────────────────────────────────────────────────

/**
 * Create a debate for a tournament matchup, then link it back to the matchup.
 * The debate slug is pre-computed by generateTournamentDebateSlug.
 * Optionally inserts debate_participants rows (agent + moderator).
 */
export async function createTournamentDebate(
  db: SupabaseClient,
  matchupId: UUID,
  tournamentId: UUID,
  debateData: {
    title: string
    slug: string
    topic_framing: Record<string, unknown>
    format_id: UUID
    room_name: string
    scheduled_at?: string | null
    participants?: Array<{ agent_id: UUID; role: string; speaking_order: number }>
  },
): Promise<{ debateId: UUID; slug: string }> {
  const { participants, ...insertData } = debateData

  const { data: debate, error: debateErr } = await db
    .from('debates')
    .insert({
      ...insertData,
      status: 'draft',
      tournament_id: tournamentId,
    })
    .select('id, slug')
    .single()
  if (debateErr) throw debateErr

  const debateId = debate.id as UUID

  if (participants && participants.length > 0) {
    const { error: participantErr } = await db
      .from('debate_participants')
      .insert(participants.map((p) => ({ ...p, debate_id: debateId })))
    if (participantErr) throw participantErr
  }

  const { error: matchupErr } = await db
    .from('tournament_matchups')
    .update({ debate_id: debateId, status: 'scheduled' })
    .eq('id', matchupId)
  if (matchupErr) throw matchupErr

  return { debateId, slug: debate.slug as string }
}

/**
 * Record the winner of a matchup and propagate them into the correct slot of
 * the next-round matchup.
 *
 * Uses conditional UPDATE to guard against concurrent advancement races:
 * only writes to the next matchup's slot if it is still NULL.
 */
export async function advanceTournamentWinner(
  db: SupabaseClient,
  matchupId: UUID,
  winnerAgentId: UUID,
): Promise<{ nextMatchupId: UUID | null }> {
  // 1. Mark this matchup as completed with winner
  const { data: matchup, error: matchupErr } = await db
    .from('tournament_matchups')
    .update({ winner_agent_id: winnerAgentId, status: 'completed' })
    .eq('id', matchupId)
    .select('next_matchup_id, matchup_number')
    .single()
  if (matchupErr) throw matchupErr

  const nextMatchupId = matchup.next_matchup_id as UUID | null
  if (!nextMatchupId) return { nextMatchupId: null }

  // 2. Write winner into the correct agent slot (conditional, race-safe)
  // Odd matchup_number → agent_a slot; even → agent_b slot
  const isOdd = (matchup.matchup_number as number) % 2 !== 0
  if (isOdd) {
    await db
      .from('tournament_matchups')
      .update({ agent_a_id: winnerAgentId })
      .eq('id', nextMatchupId)
      .is('agent_a_id', null) // only write if slot is empty
  } else {
    await db
      .from('tournament_matchups')
      .update({ agent_b_id: winnerAgentId })
      .eq('id', nextMatchupId)
      .is('agent_b_id', null)
  }

  return { nextMatchupId }
}

/**
 * Award a trophy to an agent and increment their trophy_count cache.
 */
export async function awardTournamentTrophy(
  db: SupabaseClient,
  agentId: UUID,
  tournamentId: UUID,
  trophyType: 'champion' | 'finalist' | 'semifinalist',
): Promise<void> {
  const { error: trophyErr } = await db.from('agent_trophies').upsert(
    { agent_id: agentId, tournament_id: tournamentId, trophy_type: trophyType },
    { onConflict: 'agent_id,tournament_id' },
  )
  if (trophyErr) throw trophyErr

  // Increment trophy_count only for champion (direct update is race-safe enough at tournament scale)
  if (trophyType === 'champion') {
    const { data: agent } = await db.from('agents').select('trophy_count').eq('id', agentId).single()
    if (agent) {
      await db
        .from('agents')
        .update({ trophy_count: (agent.trophy_count as number) + 1 })
        .eq('id', agentId)
    }
  }
}

/**
 * Checks whether all non-bye matchups in a given round are completed.
 */
export async function isRoundComplete(
  db: SupabaseClient,
  tournamentId: UUID,
  roundNumber: number,
): Promise<boolean> {
  const { data, error } = await db
    .from('tournament_matchups')
    .select('status')
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber)
    .neq('status', 'bye')
  if (error) throw error
  return (data ?? []).every((m: { status: string }) => m.status === 'completed')
}
