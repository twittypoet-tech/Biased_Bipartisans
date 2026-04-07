import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { createHash } from 'crypto'

// POST /api/commentary/vote  { commentaryId, direction: 'up' | 'down' }
// Supports both authenticated and anonymous voting
export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed } = checkRateLimit(`cvote:${ip}`, 60, 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many votes. Slow down.' }, { status: 429 })

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

  // Check if user is authenticated
  let userId: string | null = null
  try {
    const authClient = await createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    userId = user?.id ?? null
  } catch {}

  // Hash IP for anonymous tracking
  const ipHash = createHash('sha256').update(ip + commentaryId).digest('hex').slice(0, 16)

  if (userId) {
    // Authenticated vote — match by user_id
    const { data: existing } = await db
      .from('commentary_votes')
      .select('id, direction')
      .eq('commentary_id', commentaryId)
      .eq('user_id', userId)
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
        user_id: userId,
        direction,
        ip_hash: ipHash,
      })
    }
  } else {
    // Anonymous vote — match by ip_hash
    const { data: existing } = await db
      .from('commentary_votes')
      .select('id, direction')
      .eq('commentary_id', commentaryId)
      .eq('ip_hash', ipHash)
      .is('user_id', null)
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
        user_id: null,
        direction,
        ip_hash: ipHash,
      })
    }
  }

  // Recalculate denormalized counts (both auth + anon combined)
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

  // Return user's current vote
  let userVote: string | null = null
  if (userId) {
    const { data } = await db.from('commentary_votes').select('direction').eq('commentary_id', commentaryId).eq('user_id', userId).single()
    userVote = data?.direction ?? null
  } else {
    const { data } = await db.from('commentary_votes').select('direction').eq('commentary_id', commentaryId).eq('ip_hash', ipHash).is('user_id', null).single()
    userVote = data?.direction ?? null
  }

  return NextResponse.json({
    upvotes: upCount ?? 0,
    downvotes: downCount ?? 0,
    userVote,
  })
}
