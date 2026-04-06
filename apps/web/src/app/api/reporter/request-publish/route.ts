import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'
import { requestWirePublish } from '@bipi/db'

export async function POST(request: Request) {
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: { callId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const callId = body.callId?.trim()
  if (!callId) {
    return NextResponse.json({ error: 'callId is required' }, { status: 400 })
  }

  try {
    const db = createServerClient()
    await requestWirePublish(db, callId, user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('request-publish error:', err)
    return NextResponse.json({ error: 'Failed to request publish' }, { status: 500 })
  }
}
