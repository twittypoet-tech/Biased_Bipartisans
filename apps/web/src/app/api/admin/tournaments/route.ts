import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateDebateSlug, generateRoomName } from '@bipi/agent-core'
import { generateTournamentDebateSlug, createTournamentDebate } from '@bipi/db'
import type { UUID } from '@bipi/shared'

/**
 * POST /api/admin/tournaments
 *
 * Creates a full tournament with bracket, rounds, and matchups.
 * First-round non-bye debates are also created and linked automatically.
 *
 * Body:
 *   title, slug, description, topicTitle, topicFraming, formatId,
 *   bracketSize (4|8|16|32), agentIds (array of agent UUIDs)
 */
export async function POST(request: Request) {
  const db = createServerClient()

  const body = await request.json()
  const { title, slug, description, topicTitle, topicFraming, formatId, bracketSize, agentIds } =
    body as {
      title: string
      slug: string
      description?: string
      topicTitle: string
      topicFraming: Record<string, unknown>
      formatId: UUID
      bracketSize: number
      agentIds: UUID[]
    }

  // Validate bracket size
  if (![4, 8, 16, 32].includes(bracketSize)) {
    return NextResponse.json({ error: 'bracketSize must be 4, 8, 16, or 32' }, { status: 400 })
  }
  if (agentIds.length < 2) {
    return NextResponse.json({ error: 'At least 2 agents required' }, { status: 400 })
  }
  if (agentIds.length > bracketSize) {
    return NextResponse.json({ error: 'More agents than bracket slots' }, { status: 400 })
  }

  const totalRounds = Math.log2(bracketSize)

  // 1. Create tournament
  const { data: tournament, error: tErr } = await db
    .from('tournaments')
    .insert({
      title,
      slug,
      description: description ?? '',
      topic_title: topicTitle,
      topic_framing: topicFraming,
      format_id: formatId,
      bracket_size: bracketSize,
      total_rounds: totalRounds,
      current_round: 0,
      status: 'pending',
    })
    .select('id')
    .single()
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 })

  const tournamentId = tournament.id as UUID

  // 2. Create all round rows (all rounds upfront)
  const roundLabels = buildRoundLabels(bracketSize, totalRounds)
  const roundInserts = roundLabels.map((label, i) => ({
    tournament_id: tournamentId,
    round_number: i + 1,
    label,
    status: 'pending' as const,
  }))
  const { data: rounds, error: rErr } = await db
    .from('tournament_rounds')
    .insert(roundInserts)
    .select('id, round_number')
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 400 })

  const roundIdByNumber = Object.fromEntries(
    (rounds ?? []).map((r: { id: UUID; round_number: number }) => [r.round_number, r.id]),
  ) as Record<number, UUID>

  // 3. Build all matchup rows — insert later rounds first so next_matchup_id IDs exist
  // We'll do a two-pass: first create all placeholder matchups without next_matchup_id wiring,
  // then update round 1..N-1 with the correct next_matchup_id references.

  // Shuffle agents (Fisher-Yates)
  const shuffled = [...agentIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }

  // Pad with nulls (byes) up to bracketSize
  const seeded: (UUID | null)[] = [...shuffled]
  while (seeded.length < bracketSize) seeded.push(null)

  // Build per-round matchup specs
  type MatchupSpec = {
    round_number: number
    matchup_number: number
    agent_a: UUID | null
    agent_b: UUID | null
    is_bye: boolean
  }
  const matchupSpecs: MatchupSpec[] = []

  for (let round = 1; round <= totalRounds; round++) {
    const matchupsInRound = bracketSize / Math.pow(2, round)
    for (let m = 1; m <= matchupsInRound; m++) {
      if (round === 1) {
        const agentA = seeded[(m - 1) * 2] ?? null
        const agentB = seeded[(m - 1) * 2 + 1] ?? null
        matchupSpecs.push({
          round_number: 1,
          matchup_number: m,
          agent_a: agentA,
          agent_b: agentB,
          is_bye: agentA !== null && agentB === null,
        })
      } else {
        matchupSpecs.push({
          round_number: round,
          matchup_number: m,
          agent_a: null,
          agent_b: null,
          is_bye: false,
        })
      }
    }
  }

  // Insert all matchups (without next_matchup_id first)
  const matchupRows = matchupSpecs.map((spec) => ({
    tournament_id: tournamentId,
    round_id: roundIdByNumber[spec.round_number],
    round_number: spec.round_number,
    matchup_number: spec.matchup_number,
    status: spec.is_bye ? ('bye' as const) : ('pending' as const),
    agent_a_id: spec.agent_a,
    agent_b_id: spec.is_bye ? null : spec.agent_b,
    winner_agent_id: spec.is_bye ? spec.agent_a : null,
  }))

  const { data: insertedMatchups, error: mErr } = await db
    .from('tournament_matchups')
    .insert(matchupRows)
    .select('id, round_number, matchup_number')
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 })

  // Build lookup: round + matchup_number → id
  const matchupIdMap = new Map<string, UUID>()
  for (const m of insertedMatchups ?? []) {
    matchupIdMap.set(
      `${m.round_number as number}-${m.matchup_number as number}`,
      m.id as UUID,
    )
  }

  // 4. Wire next_matchup_id for rounds 1..N-1
  const wireUpdates: Promise<void>[] = []
  for (let round = 1; round < totalRounds; round++) {
    const matchupsInRound = bracketSize / Math.pow(2, round)
    for (let m = 1; m <= matchupsInRound; m++) {
      const thisId = matchupIdMap.get(`${round}-${m}`)
      const nextMatchupNum = Math.ceil(m / 2)
      const nextId = matchupIdMap.get(`${round + 1}-${nextMatchupNum}`)
      if (!thisId || !nextId) continue
      wireUpdates.push(
        Promise.resolve(
          db
            .from('tournament_matchups')
            .update({ next_matchup_id: nextId })
            .eq('id', thisId),
        ).then(() => undefined),
      )
    }
  }
  await Promise.all(wireUpdates)

  // 5. Create debates for non-bye round-1 matchups
  const tournamentSlug = slug
  const debateCreations: Promise<unknown>[] = []

  for (const spec of matchupSpecs.filter((s) => s.round_number === 1 && !s.is_bye)) {
    const matchupId = matchupIdMap.get(`1-${spec.matchup_number}`)
    if (!matchupId) continue

    const debateSlug = generateTournamentDebateSlug(tournamentSlug, 1, spec.matchup_number)
    const roomName = generateRoomName(debateSlug)

    debateCreations.push(
      createTournamentDebate(db, matchupId, tournamentId, {
        title: topicTitle,
        slug: debateSlug,
        topic_framing: topicFraming,
        format_id: formatId,
        room_name: roomName,
      }),
    )
  }
  await Promise.all(debateCreations)

  // 6. Update tournament status to active and set current_round = 1
  await db
    .from('tournaments')
    .update({ status: 'active', current_round: 1 })
    .eq('id', tournamentId)

  return NextResponse.json({ id: tournamentId, slug })
}

function buildRoundLabels(bracketSize: number, totalRounds: number): string[] {
  const labels: string[] = []
  for (let round = 1; round <= totalRounds; round++) {
    const remaining = bracketSize / Math.pow(2, round - 1)
    if (round === totalRounds) {
      labels.push('Final')
    } else if (round === totalRounds - 1) {
      labels.push('Semifinals')
    } else if (round === totalRounds - 2) {
      labels.push('Quarterfinals')
    } else {
      labels.push(`Round of ${remaining}`)
    }
  }
  return labels
}
