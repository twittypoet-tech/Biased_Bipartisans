import { NextResponse } from 'next/server'
import { RoomServiceClient } from 'livekit-server-sdk'
import { createServerClient } from '@/lib/supabase/server'
import { getDebate, getDebateParticipants } from '@bipi/db'

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

  // Create the LiveKit room — this dispatches the job to the deployed agent worker
  const livekitUrl = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!livekitUrl || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit not configured on server' }, { status: 500 })
  }

  const roomName = debate.room_name
  const httpHost = livekitUrl.replace('ws://', 'http://').replace('wss://', 'https://')
  const roomService = new RoomServiceClient(httpHost, apiKey, apiSecret)

  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,   // 5 min grace period after last participant leaves
      maxParticipants: 200,
    })
  } catch (err: unknown) {
    // Room may already exist — that's fine
    const msg = err instanceof Error ? err.message : String(err)
    if (!msg.includes('already exists') && !msg.includes('409')) {
      console.error('Failed to create LiveKit room:', err)
      return NextResponse.json({ error: 'Failed to create debate room' }, { status: 500 })
    }
  }

  // Mark as live — the agent will also set this once it initialises,
  // but setting it here makes the UI respond immediately
  await db.from('debates').update({
    status: 'live',
    started_at: new Date().toISOString(),
  }).eq('id', debateId)

  return NextResponse.json({ ok: true, status: 'live', roomName })
}
