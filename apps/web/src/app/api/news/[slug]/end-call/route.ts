import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

const RETELL_API_BASE = 'https://api.retellai.com'
const CREDITS_PER_MINUTE = 1

// POST /api/news/[slug]/end-call  { callId, durationSeconds }
export async function POST(request: Request) {
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    return NextResponse.json({ error: 'Retell not configured' }, { status: 500 })
  }

  let body: { callId?: string; durationSeconds?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { callId, durationSeconds } = body
  if (!callId) {
    return NextResponse.json({ error: 'Missing callId' }, { status: 400 })
  }

  // ── Force-end the Retell call ─────────────────────────────────────────
  try {
    await fetch(`${RETELL_API_BASE}/v2/end-call/${callId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${retellApiKey}` },
    })
  } catch (err) {
    // Call may have already ended — continue with credit deduction
    console.warn('Retell end-call warning:', err)
  }

  // ── Deduct credits for authenticated users ────────────────────────────
  const serviceDb = createServerClient()

  let userId: string | null = null
  try {
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch {}

  if (userId && durationSeconds && durationSeconds > 0) {
    // Round up to nearest minute
    const creditsToDeduct = Math.ceil(durationSeconds / 60) * CREDITS_PER_MINUTE

    const { error: deductError } = await serviceDb.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: creditsToDeduct,
    })

    if (!deductError) {
      await serviceDb.from('credit_transactions').insert({
        user_id: userId,
        amount: -creditsToDeduct,
        reason: 'agent_call',
      })
    }

    // Get updated balance
    const { data: profile } = await serviceDb
      .from('user_profiles')
      .select('credits')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      ok: true,
      creditsDeducted: creditsToDeduct,
      creditsRemaining: profile?.credits ?? 0,
    })
  }

  // Anonymous user or no duration — just confirm the call ended
  if (durationSeconds) {
    // Update anonymous_calls with actual duration
    await serviceDb
      .from('anonymous_calls')
      .update({ duration_seconds: durationSeconds, retell_call_id: callId })
      .eq('retell_call_id', callId)
      .is('duration_seconds', null)

    // Also try matching by the call_id we stored (it might be in retell_call_id already)
    // Fallback: update the most recent anonymous call without a duration
  }

  return NextResponse.json({ ok: true })
}
