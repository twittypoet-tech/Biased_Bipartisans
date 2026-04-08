import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/newsletter/verify — verify magic token
export async function POST(req: NextRequest) {
  try {
    const { email, agentId, token, sessionId } = await req.json()

    if (!email || !agentId || !token) {
      return NextResponse.json({ error: 'Email, agentId, and token required' }, { status: 400 })
    }

    const db = createServerClient()

    const { data: sub } = await db
      .from('newsletter_subscribers')
      .select('id, magic_token, token_expires, verified')
      .eq('email', email)
      .eq('agent_id', agentId)
      .is('unsubscribed_at', null)
      .maybeSingle()

    if (!sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (sub.verified) {
      return NextResponse.json({ status: 'already_verified' })
    }

    if (sub.magic_token !== token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    if (sub.token_expires && new Date(sub.token_expires) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 })
    }

    // Verify the subscription
    await db
      .from('newsletter_subscribers')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
        magic_token: null,
        token_expires: null,
      })
      .eq('id', sub.id)

    // Log analytics
    await db.from('newsletter_popup_analytics').insert({
      agent_id: agentId,
      event_type: 'verified',
      session_id: sessionId ?? null,
      email,
    })

    return NextResponse.json({ status: 'verified' })
  } catch (err) {
    console.error('[Newsletter] Verify error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
