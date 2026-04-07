import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// POST /api/commentary/vote  { commentaryId, direction: 'up' | 'down' }
export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed } = checkRateLimit(`cvote:${ip}`, 60, 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many votes. Slow down.' }, { status: 429 })
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to vote' }, { status: 401 })
  }

  let body: { commentaryId?: string; direction?: 'up' | 'down' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { commentaryId, direction } = body
  if (!commentaryId || !direction || (direction !== 'up' && direction !== 'down')) {
    return NextResponse.json({ error: 'Missing commentaryId or direction' }, { status: 400 })
  }

  const db = createServerClient()

  // Check existing vote
  const { data: existing } = await db
    .from('commentary_votes')
    .select('id, direction')
    .eq('commentary_id', commentaryId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if (existing.direction === direction) {
      await db.from('commentary_votes').delete().eq('id', existing.id)
    } else {
      await db.from('commentary_votes').update({ direction }).eq('id', existing.id)
    }
  } else {
    await db.from('commentary_votes').insert({
      commentary_id: commentaryId,
      user_id: user.id,
      direction,
    })
  }

  // Recalculate denormalized counts
  const { count: upCount } = await db
    .from('commentary_votes')
    .select('*', { count: 'exact', head: true })
    .eq('commentary_id', commentaryId)
    .eq('direction', 'up')

  const { count: downCount } = await db
    .from('commentary_votes')
    .select('*', { count: 'exact', head: true })
    .eq('commentary_id', commentaryId)
    .eq('direction', 'down')

  await db.from('report_commentary').update({
    upvotes: upCount ?? 0,
    downvotes: downCount ?? 0,
  }).eq('id', commentaryId)

  const { data: userVote } = await db
    .from('commentary_votes')
    .select('direction')
    .eq('commentary_id', commentaryId)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    upvotes: upCount ?? 0,
    downvotes: downCount ?? 0,
    userVote: userVote?.direction ?? null,
  })
}
