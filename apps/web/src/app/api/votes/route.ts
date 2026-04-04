import { NextResponse } from 'next/server'
import { createServerClient, createAuthServerClient } from '@/lib/supabase/server'
import { insertDebateVote } from '@bipi/db'

export async function POST(request: Request) {
  try {
    // Require authentication for voting
    const authClient = await createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Sign in to vote' }, { status: 401 })
    }

    const body = await request.json()
    const { debateId, voteType, targetAgentId, targetTurnId, roundPhase } = body

    if (!debateId || !voteType) {
      return NextResponse.json({ error: 'Missing debateId or voteType' }, { status: 400 })
    }

    const db = createServerClient()

    const vote = await insertDebateVote(db, {
      debate_id: debateId,
      voter_id: user.id,
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
