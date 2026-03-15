import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getDebate, getDebateParticipants, updateDebateStatus } from '@bipi/db'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: debateId } = await params
  const db = createServerClient()

  const debate = await getDebate(db, debateId)
  if (!debate) {
    return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
  }

  if (debate.status === 'live') {
    return NextResponse.json({ error: 'Debate is already live' }, { status: 400 })
  }

  if (debate.status === 'ended') {
    return NextResponse.json({ error: 'Debate has already ended' }, { status: 400 })
  }

  // Check participants
  const participants = await getDebateParticipants(db, debateId)
  const hasDebaters = participants.some((p) => p.role === 'debater')
  const hasModerator = participants.some((p) => p.role === 'moderator')

  if (!hasDebaters || !hasModerator) {
    return NextResponse.json(
      { error: 'Debate needs at least one debater and a moderator' },
      { status: 400 },
    )
  }

  // Set to scheduled with scheduled_at = now so the scheduler picks it up
  await updateDebateStatus(db, debateId, 'scheduled', {
    scheduled_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, status: 'scheduled' })
}
