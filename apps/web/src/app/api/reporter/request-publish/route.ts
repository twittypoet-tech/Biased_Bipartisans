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

    // Check user role to determine publish behavior
    const { data: profile } = await db
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Journalists + admins: instant publish. Subscribers: pending approval.
    const targetStatus = (profile?.role === 'journalist' || profile?.role === 'admin') ? 'auto' : 'pending'

    await requestWirePublish(db, callId, user.id, targetStatus as 'pending' | 'auto')
    return NextResponse.json({ ok: true, wireStatus: targetStatus })
  } catch (err) {
    console.error('request-publish error:', err)
    return NextResponse.json({ error: 'Failed to request publish' }, { status: 500 })
  }
}
