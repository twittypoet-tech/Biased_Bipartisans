import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

const COMMENTARY_CREDIT_COST = 1

// POST /api/commentary-requests  { reportId, agentId }
export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to request commentary' }, { status: 401 })
  }

  const serviceDb = createServerClient()

  // ── Pro tier check ──────────────────────────────────────────────────────
  const { data: profile } = await serviceDb
    .from('user_profiles')
    .select('tier, credits')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tier !== 'pro') {
    return NextResponse.json({ error: 'Pro subscription required for commentary requests' }, { status: 403 })
  }

  if (profile.credits < COMMENTARY_CREDIT_COST) {
    return NextResponse.json({
      error: `Not enough credits. You need ${COMMENTARY_CREDIT_COST} credit (you have ${profile.credits}).`,
    }, { status: 402 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: { reportId?: string; agentId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { reportId, agentId } = body
  if (!reportId || !agentId) {
    return NextResponse.json({ error: 'Missing reportId or agentId' }, { status: 400 })
  }

  // ── Fetch the report (full content for the agent) ───────────────────────
  const { data: report } = await serviceDb
    .from('reporter_calls')
    .select('id, report_headline, call_summary, body, callouts, sources_json, key_entities, transcript')
    .eq('id', reportId)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // ── Fetch existing commentaries on this report ──────────────────────────
  const { data: existingCommentary } = await serviceDb
    .from('report_commentary')
    .select('agent_id, transcript, is_published')
    .eq('report_call_id', reportId)
    .eq('is_published', true)

  // ── Fetch the agent ─────────────────────────────────────────────────────
  const { data: agent } = await serviceDb
    .from('agents')
    .select('id, name, retell_agent_id')
    .eq('id', agentId)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // ── Deduct credits ──────────────────────────────────────────────────────
  try {
    await serviceDb.rpc('deduct_credits', { p_user_id: user.id, p_amount: COMMENTARY_CREDIT_COST })
  } catch {
    await serviceDb
      .from('user_profiles')
      .update({ credits: (profile.credits ?? 0) - COMMENTARY_CREDIT_COST })
      .eq('id', user.id)
  }

  await serviceDb.from('credit_transactions').insert({
    user_id: user.id,
    amount: -COMMENTARY_CREDIT_COST,
    reason: 'commentary',
    reference_id: reportId,
  })

  // ── Create the commentary request ───────────────────────────────────────
  const { data: commentaryRequest, error: insertError } = await serviceDb
    .from('report_commentary_requests')
    .insert({
      report_call_id: reportId,
      agent_id: agentId,
      requester_session_id: user.id,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError) {
    console.error('Commentary request insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    requestId: commentaryRequest.id,
    agent: { id: agent.id, name: agent.name },
    report: {
      id: report.id,
      headline: report.report_headline,
      summary: report.call_summary,
    },
    existingCommentaryCount: existingCommentary?.length ?? 0,
    creditsRemaining: profile.credits - COMMENTARY_CREDIT_COST,
  }, { status: 201 })
}
