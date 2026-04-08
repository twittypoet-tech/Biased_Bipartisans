import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// POST /api/newsletter — subscribe to an agent's newsletter
export async function POST(req: NextRequest) {
  try {
    const { email, agentId, sourceSlug, sessionId } = await req.json()

    if (!email || !agentId) {
      return NextResponse.json({ error: 'Email and agentId required' }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const db = createServerClient()

    // Generate 6-digit magic token
    const magicToken = crypto.randomInt(100000, 999999).toString()
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

    // Upsert subscriber (update token if already exists but unverified)
    const { data: existing } = await db
      .from('newsletter_subscribers')
      .select('id, verified')
      .eq('email', email)
      .eq('agent_id', agentId)
      .is('unsubscribed_at', null)
      .maybeSingle()

    if (existing?.verified) {
      return NextResponse.json({ status: 'already_verified' })
    }

    if (existing) {
      // Update existing unverified record with new token
      await db
        .from('newsletter_subscribers')
        .update({ magic_token: magicToken, token_expires: tokenExpires })
        .eq('id', existing.id)
    } else {
      // Insert new subscriber
      await db
        .from('newsletter_subscribers')
        .insert({
          email,
          agent_id: agentId,
          source_slug: sourceSlug ?? null,
          magic_token: magicToken,
          token_expires: tokenExpires,
        })
    }

    // Log analytics
    await db.from('newsletter_popup_analytics').insert({
      agent_id: agentId,
      event_type: 'token_sent',
      session_id: sessionId ?? null,
      email,
    })

    // TODO: Send magic token via Brevo transactional email
    // For now, we store it and the frontend will auto-verify (dev mode)
    console.log(`[Newsletter] Magic token for ${email}: ${magicToken}`)

    return NextResponse.json({ status: 'token_sent' })
  } catch (err) {
    console.error('[Newsletter] Subscribe error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
