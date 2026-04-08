import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// POST /api/newsletter/analytics — log popup events (impression, dismissed, etc.)
export async function POST(req: NextRequest) {
  try {
    const { reportId, agentId, eventType, sessionId, email } = await req.json()

    if (!eventType) {
      return NextResponse.json({ error: 'eventType required' }, { status: 400 })
    }

    const validEvents = ['impression', 'email_entered', 'signup_clicked', 'dismissed', 'resend_requested']
    if (!validEvents.includes(eventType)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 })
    }

    const db = createServerClient()

    await db.from('newsletter_popup_analytics').insert({
      report_id: reportId ?? null,
      agent_id: agentId ?? null,
      event_type: eventType,
      session_id: sessionId ?? null,
      email: email ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Newsletter] Analytics error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
