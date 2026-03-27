import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getTournamentBySlug } from '@bipi/db'
import type { UUID } from '@bipi/shared'

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * POST /api/admin/tournaments/[slug]/advance
 *
 * Manual override to advance a tournament matchup to the next round.
 * In normal operation this is triggered automatically by the post-debate
 * Inngest pipeline; this endpoint is for testing and administrative use.
 *
 * Body: { matchupId, winnerAgentId }
 */
export async function POST(request: Request, { params }: Props) {
  const { slug } = await params
  const db = createServerClient()

  const tournament = await getTournamentBySlug(db, slug)
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  const { matchupId, winnerAgentId } = (await request.json()) as {
    matchupId: UUID
    winnerAgentId: UUID
  }

  if (!matchupId || !winnerAgentId) {
    return NextResponse.json({ error: 'matchupId and winnerAgentId are required' }, { status: 400 })
  }

  // Verify the matchup belongs to this tournament
  const { data: matchup, error: mErr } = await db
    .from('tournament_matchups')
    .select('id, tournament_id, status')
    .eq('id', matchupId)
    .single()

  if (mErr || !matchup) {
    return NextResponse.json({ error: 'Matchup not found' }, { status: 404 })
  }

  if ((matchup.tournament_id as string) !== tournament.id) {
    return NextResponse.json({ error: 'Matchup does not belong to this tournament' }, { status: 400 })
  }

  if (matchup.status === 'completed') {
    return NextResponse.json({ error: 'Matchup already completed' }, { status: 400 })
  }

  // Emit the Inngest event (or directly call advancement logic in dev)
  // In production this is handled by the Inngest function; here we call it inline
  const { advanceTournamentWinner, isRoundComplete } = await import('@bipi/db')

  const { nextMatchupId } = await advanceTournamentWinner(db, matchupId, winnerAgentId)

  // Check if the round is now complete
  const { data: matchupData } = await db
    .from('tournament_matchups')
    .select('round_number')
    .eq('id', matchupId)
    .single()

  if (matchupData) {
    const roundDone = await isRoundComplete(db, tournament.id, matchupData.round_number as number)
    if (roundDone) {
      // Update round status
      await db
        .from('tournament_rounds')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('tournament_id', tournament.id)
        .eq('round_number', matchupData.round_number)

      // Advance tournament's current_round
      const nextRound = (matchupData.round_number as number) + 1
      if (nextRound <= tournament.total_rounds) {
        await db
          .from('tournaments')
          .update({ current_round: nextRound })
          .eq('id', tournament.id)
      }
    }
  }

  return NextResponse.json({ ok: true, nextMatchupId })
}
