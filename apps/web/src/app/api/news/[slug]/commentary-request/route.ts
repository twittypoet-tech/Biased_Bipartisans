import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

const COMMENTARY_CREDIT_COST = 1
const RETELL_API_BASE = 'https://api.retellai.com'
const COMMENTARY_HOST_AGENT_ID = '30000000-0000-0000-0000-000000000003'

// POST /api/news/[slug]/commentary-request  { agentId }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const retellApiKey = process.env.RETELL_API_KEY
  const { slug } = await params

  // ── Auth ────────────────────────────────────────────────────────────────
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to request commentary' }, { status: 401 })
  }

  const serviceDb = createServerClient()

  // ── Admin/journalist role check ────────────────────────────────────────
  const { data: profile } = await serviceDb
    .from('user_profiles')
    .select('role, credits')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  if (profile.credits < COMMENTARY_CREDIT_COST) {
    return NextResponse.json({
      error: `Not enough credits. You need ${COMMENTARY_CREDIT_COST} credit (you have ${profile.credits}).`,
    }, { status: 402 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: { agentId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { agentId } = body
  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
  }

  // ── Fetch the news report ──────────────────────────────────────────────
  const { data: report } = await serviceDb
    .from('news_reports')
    .select('id, headline, summary, body, sources, key_entities')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  // ── Fetch existing commentaries ────────────────────────────────────────
  const { data: existingCommentary } = await serviceDb
    .from('agent_commentary')
    .select('agent_id, transcript, is_published, agents(name)')
    .eq('report_id', report.id)
    .eq('is_published', true)

  // ── Fetch the agent ────────────────────────────────────────────────────
  const { data: agent } = await serviceDb
    .from('agents')
    .select('id, name, retell_commentary_agent_id')
    .eq('id', agentId)
    .single()

  if (!agent?.retell_commentary_agent_id) {
    return NextResponse.json({ error: 'Commentary not available for this agent yet' }, { status: 400 })
  }

  // ── Deduct credits ─────────────────────────────────────────────────────
  const { error: deductError } = await serviceDb.rpc('deduct_credits', { p_user_id: user.id, p_amount: COMMENTARY_CREDIT_COST })
  if (deductError) {
    return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 402 })
  }

  await serviceDb.from('credit_transactions').insert({
    user_id: user.id,
    amount: -COMMENTARY_CREDIT_COST,
    reason: 'commentary',
    reference_id: report.id,
  })

  // ── Format context ─────────────────────────────────────────────────────
  const reportBodyText = report.body ? JSON.stringify(report.body).slice(0, 8000) : ''

  const existingCommentariesText = (existingCommentary ?? [])
    .filter((c: Record<string, unknown>) => c.transcript)
    .map((c: Record<string, unknown>) => {
      const agentData = Array.isArray(c.agents) ? (c.agents as Record<string, unknown>[])[0] : c.agents as Record<string, unknown> | null
      const name = (agentData?.name as string) ?? 'Agent'
      return `${name}:\n${c.transcript}`
    })
    .join('\n\n---\n\n') || 'No other agents have commented yet. You are setting the frame.'

  const dynamicVars = {
    report_headline: report.headline ?? 'Untitled Article',
    report_summary: report.summary ?? '',
    report_body: reportBodyText,
    report_sources: report.sources ? JSON.stringify(report.sources) : '',
    report_entities: report.key_entities ?? '',
    existing_commentaries: existingCommentariesText,
    current_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  }

  // ── Create commentary request record ───────────────────────────────────
  const { data: commentaryRequest, error: insertError } = await serviceDb
    .from('commentary_requests')
    .insert({
      report_id: report.id,
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

  // ── Create Retell calls ────────────────────────────────────────────────
  let commentaryCall: { access_token: string; call_id: string } | null = null
  let hostCall: { access_token: string; call_id: string } | null = null

  if (retellApiKey) {
    try {
      commentaryCall = await createRetellCall(retellApiKey, agent.retell_commentary_agent_id!, dynamicVars)
    } catch (err) {
      console.error('Retell create-web-call failed (Commentary):', err)
    }

    const { data: hostAgent } = await serviceDb
      .from('agents')
      .select('retell_agent_id')
      .eq('id', COMMENTARY_HOST_AGENT_ID)
      .single()

    if (hostAgent?.retell_agent_id) {
      try {
        hostCall = await createRetellCall(retellApiKey, hostAgent.retell_agent_id, {
          report_headline: report.headline ?? 'Untitled Article',
          agent_name: agent.name,
        })
      } catch (err) {
        console.warn('Retell create-web-call failed (Commentary Host):', err)
      }
    }
  }

  // ── Relay: bridge Host + Commentary Agent into public LiveKit room ─────
  let publicRoomUrl: string | null = null
  let browserToken: string | null = null

  if (hostCall && commentaryCall) {
    const agentsUrl = process.env.AGENTS_SERVICE_URL
    const triggerSecret = process.env.AGENTS_TRIGGER_SECRET
    if (agentsUrl) {
      try {
        const relayRes = await fetch(`${agentsUrl}/reporter/relay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(triggerSecret ? { Authorization: `Bearer ${triggerSecret}` } : {}),
          },
          body: JSON.stringify({
            wireAccessToken: hostCall.access_token,
            reporterAccessToken: commentaryCall.access_token,
          }),
        })
        if (relayRes.ok) {
          const relayData = await relayRes.json()
          publicRoomUrl = relayData.publicRoomUrl ?? null
          browserToken = relayData.browserToken ?? null
        }
      } catch (err) {
        console.warn('Commentary relay trigger failed:', err)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    requestId: commentaryRequest.id,
    agent: { id: agent.id, name: agent.name },
    publicRoomUrl,
    browserToken,
    retellUrl: 'wss://retell-ai-4ihahnq7.livekit.cloud',
    commentaryToken: publicRoomUrl ? null : commentaryCall?.access_token ?? null,
    creditsRemaining: profile.credits - COMMENTARY_CREDIT_COST,
  }, { status: 201 })
}

async function createRetellCall(
  apiKey: string,
  agentId: string,
  dynamicVars: Record<string, string>,
): Promise<{ access_token: string; call_id: string }> {
  const res = await fetch(`${RETELL_API_BASE}/v2/create-web-call`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, retell_llm_dynamic_variables: dynamicVars }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
