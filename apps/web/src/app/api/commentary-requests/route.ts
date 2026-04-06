import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

const COMMENTARY_CREDIT_COST = 1
const RETELL_API_BASE = 'https://api.retellai.com'
const COMMENTARY_HOST_AGENT_ID = '30000000-0000-0000-0000-000000000003'

// POST /api/commentary-requests  { reportId, agentId }
export async function POST(request: Request) {
  const retellApiKey = process.env.RETELL_API_KEY

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

  // ── Fetch existing commentaries on this report (with agent names) ──────
  const { data: existingCommentary } = await serviceDb
    .from('report_commentary')
    .select('agent_id, transcript, is_published, agents(name)')
    .eq('report_call_id', reportId)
    .eq('is_published', true)

  // ── Fetch the agent ─────────────────────────────────────────────────────
  const { data: agent } = await serviceDb
    .from('agents')
    .select('id, name, retell_agent_id, retell_commentary_agent_id')
    .eq('id', agentId)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (!agent.retell_commentary_agent_id) {
    return NextResponse.json({ error: 'Commentary not available for this agent yet' }, { status: 400 })
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

  // ── Format existing commentaries for the agent ──────────────────────────
  const existingCommentariesText = formatExistingCommentaries(existingCommentary)

  // ── Build report body text (truncate to avoid exceeding dynamic var limits)
  const reportBodyText = report.body
    ? JSON.stringify(report.body).slice(0, 8000)
    : report.transcript?.slice(0, 8000) ?? ''

  // ── Build dynamic variables for Retell ──────────────────────────────────
  const dynamicVars = {
    report_headline: report.report_headline ?? 'Untitled Report',
    report_summary: report.call_summary ?? '',
    report_body: reportBodyText,
    report_sources: report.sources_json ? JSON.stringify(report.sources_json) : '',
    report_entities: report.key_entities ?? '',
    existing_commentaries: existingCommentariesText,
    current_date: new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }),
  }

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

  // ── Fetch Commentary Host's Retell agent ID ─────────────────────────────
  const { data: hostAgent } = await serviceDb
    .from('agents')
    .select('retell_agent_id')
    .eq('id', COMMENTARY_HOST_AGENT_ID)
    .single()

  // ── Create Retell web calls (commentator + host) ───────────────────────
  let commentaryCall: { access_token: string; call_id: string } | null = null
  let hostCall: { access_token: string; call_id: string } | null = null

  if (retellApiKey) {
    // Commentary agent call
    try {
      const res = await fetch(`${RETELL_API_BASE}/v2/create-web-call`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${retellApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent.retell_commentary_agent_id,
          retell_llm_dynamic_variables: dynamicVars,
        }),
      })

      if (!res.ok) {
        console.error('Retell create-web-call error (Commentary):', await res.text())
      } else {
        commentaryCall = await res.json()
      }
    } catch (err) {
      console.error('Retell create-web-call failed (Commentary):', err)
    }

    // Commentary Host call — introduces the agent, then goes silent
    if (hostAgent?.retell_agent_id) {
      try {
        const hostRes = await fetch(`${RETELL_API_BASE}/v2/create-web-call`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${retellApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: hostAgent.retell_agent_id,
            retell_llm_dynamic_variables: {
              report_headline: report.report_headline ?? 'Untitled Report',
              agent_name: agent.name,
            },
          }),
        })

        if (!hostRes.ok) {
          console.warn('Retell create-web-call warning (Commentary Host):', await hostRes.text())
        } else {
          hostCall = await hostRes.json()
        }
      } catch (err) {
        console.warn('Retell create-web-call failed (Commentary Host):', err)
      }
    }
  }

  // ── Update commentary request with Retell call ID ───────────────────────
  if (commentaryCall) {
    await serviceDb
      .from('report_commentary_requests')
      .update({ retell_call_id: commentaryCall.call_id, status: 'in_progress' })
      .eq('id', commentaryRequest.id)
  }

  return NextResponse.json({
    ok: true,
    requestId: commentaryRequest.id,
    agent: { id: agent.id, name: agent.name },
    callId: commentaryCall?.call_id ?? null,
    hostCallId: hostCall?.call_id ?? null,
    accessToken: commentaryCall?.access_token ?? null,
    hostAccessToken: hostCall?.access_token ?? null,
    report: {
      id: report.id,
      headline: report.report_headline,
      summary: report.call_summary,
    },
    existingCommentaryCount: existingCommentary?.length ?? 0,
    creditsRemaining: profile.credits - COMMENTARY_CREDIT_COST,
  }, { status: 201 })
}

// ── Format existing commentaries for dynamic variable ─────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatExistingCommentaries(commentaries: any[] | null): string {
  if (!commentaries?.length) {
    return 'No other agents have commented on this report yet. You are setting the frame.'
  }

  return commentaries
    .filter((c) => c.transcript)
    .map((c) => {
      // Supabase join returns agents as object (single) or array
      const agentData = Array.isArray(c.agents) ? c.agents[0] : c.agents
      const name = agentData?.name ?? 'Unknown Agent'
      return `${name}:\n${c.transcript}`
    })
    .join('\n\n---\n\n')
}
