import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

// POST /api/reporter/vote  { callId, direction: 'up' | 'down' }
// Upserts the user's vote and recalculates denormalized counts
export async function POST(request: Request) {
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to vote' }, { status: 401 })
  }

  let body: { callId?: string; direction?: 'up' | 'down' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { callId, direction } = body
  if (!callId || !direction || (direction !== 'up' && direction !== 'down')) {
    return NextResponse.json({ error: 'Missing callId or direction' }, { status: 400 })
  }

  const db = createServerClient()

  // Check if user already voted on this report
  const { data: existing } = await db
    .from('reporter_call_votes')
    .select('id, direction')
    .eq('reporter_call_id', callId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if (existing.direction === direction) {
      // Same vote — remove it (toggle off)
      await db.from('reporter_call_votes').delete().eq('id', existing.id)
    } else {
      // Different direction — update
      await db.from('reporter_call_votes').update({ direction }).eq('id', existing.id)
    }
  } else {
    // New vote
    await db.from('reporter_call_votes').insert({
      reporter_call_id: callId,
      user_id: user.id,
      direction,
    })
  }

  // Recalculate denormalized counts
  const { count: upCount } = await db
    .from('reporter_call_votes')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_call_id', callId)
    .eq('direction', 'up')

  const { count: downCount } = await db
    .from('reporter_call_votes')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_call_id', callId)
    .eq('direction', 'down')

  await db.from('reporter_calls').update({
    upvotes: upCount ?? 0,
    downvotes: downCount ?? 0,
  }).eq('id', callId)

  // Get user's current vote direction
  const { data: userVote } = await db
    .from('reporter_call_votes')
    .select('direction')
    .eq('reporter_call_id', callId)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    upvotes: upCount ?? 0,
    downvotes: downCount ?? 0,
    userVote: userVote?.direction ?? null,
  })
}
