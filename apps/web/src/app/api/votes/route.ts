import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { insertDebateVote } from '@bipi/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { debateId, voteType, targetAgentId, targetTurnId, roundPhase } = body

    if (!debateId || !voteType) {
      return NextResponse.json({ error: 'Missing debateId or voteType' }, { status: 400 })
    }

    const db = createServerClient()

    // Use a simple anonymous voter ID based on IP or random
    const voterId = request.headers.get('x-forwarded-for') ?? `anon-${Date.now()}`

    const vote = await insertDebateVote(db, {
      debate_id: debateId,
      voter_id: voterId,
      vote_type: voteType,
      target_agent_id: targetAgentId ?? null,
      target_turn_id: targetTurnId ?? null,
      round_phase: roundPhase ?? null,
    })

    return NextResponse.json({ id: vote.id })
  } catch (err) {
    console.error('Vote submission error:', err)
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
}
