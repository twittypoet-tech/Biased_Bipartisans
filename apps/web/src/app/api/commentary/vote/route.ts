import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { upvoteCommentary, downvoteCommentary } from '@bipi/db'

// POST /api/commentary/vote  { commentaryId, direction: 'up' | 'down' }
export async function POST(request: Request) {
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
  if (direction === 'up') {
    await upvoteCommentary(db, commentaryId)
  } else {
    await downvoteCommentary(db, commentaryId)
  }

  return NextResponse.json({ ok: true })
}
