import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createCommentaryRequest } from '@bipi/db'

// POST /api/commentary-requests  { reportId, agentId, sessionId }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { reportId, agentId, sessionId } = body

    if (!reportId || !agentId || !sessionId) {
      return NextResponse.json({ error: 'Missing reportId, agentId, or sessionId' }, { status: 400 })
    }

    const db = createServerClient()
    const result = await createCommentaryRequest(db, { reportId, agentId, sessionId })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('Commentary request error:', err)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}
