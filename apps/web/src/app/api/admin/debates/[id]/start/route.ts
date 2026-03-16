import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getDebate, getDebateParticipants, getDebateFormat } from '@bipi/db'

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

  const participants = await getDebateParticipants(db, debateId)
  const hasDebaters = participants.some((p) => p.role === 'debater')
  const hasModerator = participants.some((p) => p.role === 'moderator')

  if (!hasDebaters || !hasModerator) {
    return NextResponse.json(
      { error: 'Debate needs at least one debater and a moderator' },
      { status: 400 },
    )
  }

  // Check debate style — freeflow debates are run by DebateConductor in the agents service.
  // We mark the debate as "scheduled" with scheduled_at=now so the scheduler picks it up
  // within its next poll cycle (≤30s). The conductor then creates all Retell calls, starts
  // the relay + transcript poller, and marks the debate "live" itself.
  const format = debate.format_id ? await getDebateFormat(db, debate.format_id) : null
  const isFreeflow = format?.debate_style === 'freeflow'

  if (isFreeflow) {
    const now = new Date().toISOString()
    const { error } = await db
      .from('debates')
      .update({ status: 'scheduled', scheduled_at: now })
      .eq('id', debateId)

    if (error) {
      return NextResponse.json({ error: 'Failed to schedule debate' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      status: 'scheduled',
      message: 'Debate queued — agents will join within 30 seconds',
    })
  }

  // Legacy structured debates: create LiveKit room and mark live immediately
  // (the agent worker connects via livekit-agents job dispatch)
  const livekitUrl = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!livekitUrl || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit not configured on server' }, { status: 500 })
  }

  const { RoomServiceClient } = await import('livekit-server-sdk')
  const httpHost = livekitUrl.replace('ws://', 'http://').replace('wss://', 'https://')
  const roomService = new RoomServiceClient(httpHost, apiKey, apiSecret)

  try {
    await roomService.createRoom({
      name: debate.room_name,
      emptyTimeout: 300,
      maxParticipants: 200,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('already exists') && !msg.includes('409')) {
      return NextResponse.json({ error: 'Failed to create debate room' }, { status: 500 })
    }
  }

  await db.from('debates').update({
    status: 'live',
    started_at: new Date().toISOString(),
  }).eq('id', debateId)

  return NextResponse.json({ ok: true, status: 'live', roomName: debate.room_name })
}
