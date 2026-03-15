import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  insertAudienceMessage,
  getAudienceMessages,
  upvoteAudienceMessage,
} from '@bipi/db'

// GET /api/audience-questions?debateId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const debateId = searchParams.get('debateId')
  if (!debateId) return NextResponse.json({ error: 'Missing debateId' }, { status: 400 })

  const db = createServerClient()
  const messages = await getAudienceMessages(db, debateId)
  return NextResponse.json(messages)
}

// POST /api/audience-questions  { debateId, content }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { debateId, content } = body

    if (!debateId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing debateId or content' }, { status: 400 })
    }

    if (content.trim().length < 5 || content.trim().length > 280) {
      return NextResponse.json({ error: 'Question must be 5–280 characters' }, { status: 400 })
    }

    // Stable anonymous session ID from IP + user-agent hash (no auth needed)
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const ua = request.headers.get('user-agent') ?? 'unknown'
    const sessionId = Buffer.from(`${ip}-${ua}`).toString('base64').slice(0, 32)

    const db = createServerClient()
    const message = await insertAudienceMessage(db, {
      debate_id: debateId,
      session_id: sessionId,
      content: content.trim(),
    })

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    console.error('Question submission error:', err)
    return NextResponse.json({ error: 'Failed to submit question' }, { status: 500 })
  }
}

// PATCH /api/audience-questions  { messageId }  — upvote
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { messageId } = body

    if (!messageId) return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })

    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const ua = request.headers.get('user-agent') ?? 'unknown'
    const sessionId = Buffer.from(`${ip}-${ua}`).toString('base64').slice(0, 32)

    const db = createServerClient()
    const result = await upvoteAudienceMessage(db, messageId, sessionId)

    if (result.upvotes === -1) {
      return NextResponse.json({ error: 'Already voted' }, { status: 409 })
    }

    return NextResponse.json({ upvotes: result.upvotes })
  } catch (err) {
    console.error('Upvote error:', err)
    return NextResponse.json({ error: 'Failed to upvote' }, { status: 500 })
  }
}
