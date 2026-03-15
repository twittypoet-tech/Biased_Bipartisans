import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { insertDebateParticipant, removeDebateParticipant, getDebateParticipants } from '@bipi/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: debateId } = await params
  const db = createServerClient()
  const body = await request.json()

  const { agentId, role, speakingOrder } = body
  if (!agentId || !role) {
    return NextResponse.json({ error: 'Missing agentId or role' }, { status: 400 })
  }

  // Get current participants to determine speaking order
  const existing = await getDebateParticipants(db, debateId)
  const order = speakingOrder ?? existing.filter((p) => p.role === role).length + 1

  const participant = await insertDebateParticipant(db, {
    debate_id: debateId,
    agent_id: agentId,
    role,
    speaking_order: order,
  })

  return NextResponse.json(participant)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: debateId } = await params
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')

  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
  }

  const db = createServerClient()
  await removeDebateParticipant(db, debateId, agentId)

  return NextResponse.json({ ok: true })
}
