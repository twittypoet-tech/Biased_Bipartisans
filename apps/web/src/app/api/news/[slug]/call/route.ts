import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

const RETELL_API_BASE = 'https://api.retellai.com'
const ANON_MAX_SECONDS = 300 // 5 minutes free
const CREDITS_PER_MINUTE = 1

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    return NextResponse.json({ error: 'Retell not configured' }, { status: 500 })
  }

  const { slug } = await params
  const serviceDb = createServerClient()

  // ── Try to get authenticated user (optional) ──────────────────────────
  let userId: string | null = null
  let userCredits = 0
  try {
    const supabase = await createAuthServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      const { data: profile } = await serviceDb
        .from('user_profiles')
        .select('credits')
        .eq('id', user.id)
        .single()
      userCredits = profile?.credits ?? 0
    }
  } catch {
    // Not authenticated — continue as anonymous
  }

  // ── Determine call limits ─────────────────────────────────────────────
  let isAnonymous = !userId
  let maxSeconds: number

  if (isAnonymous) {
    // Check if this IP already used their free call
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
    const ipHash = createHash('sha256').update(ip + 'anon-call').digest('hex').slice(0, 16)

    const { data: existing } = await serviceDb
      .from('anonymous_calls')
      .select('id')
      .eq('ip_hash', ipHash)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        error: 'free_call_used',
        message: 'You\'ve already used your free call. Sign up for 10 free credits.',
      }, { status: 403 })
    }

    maxSeconds = ANON_MAX_SECONDS

    // Reserve the free call slot
    await serviceDb.from('anonymous_calls').insert({
      ip_hash: ipHash,
      report_slug: slug,
    })
  } else {
    // Authenticated: check credits
    if (userCredits < 1) {
      return NextResponse.json({
        error: 'Not enough credits. You need at least 1 credit to start a call.',
      }, { status: 402 })
    }
    // Max call time = credits × 60 seconds (1 credit per minute)
    maxSeconds = userCredits * 60
  }

  // ── Fetch the report and agent ────────────────────────────────────────
  const { data: report, error: reportErr } = await serviceDb
    .from('news_reports')
    .select('id, headline, summary, body, sources, key_entities, agent_id')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (reportErr || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (!report.agent_id) {
    return NextResponse.json({ error: 'This report has no assigned agent' }, { status: 400 })
  }

  const { data: agent, error: agentErr } = await serviceDb
    .from('agents')
    .select('id, name, retell_call_agent_id')
    .eq('id', report.agent_id)
    .single()

  if (agentErr || !agent?.retell_call_agent_id) {
    return NextResponse.json({ error: 'Agent not available for calls' }, { status: 400 })
  }

  // ── Build dynamic vars ────────────────────────────────────────────────
  const reportBodyText = report.body
    ? JSON.stringify(report.body).slice(0, 8000)
    : ''

  const { data: existingCommentary } = await serviceDb
    .from('agent_commentary')
    .select('transcript, agents(name)')
    .eq('report_id', report.id)
    .eq('is_published', true)
    .order('created_at', { ascending: true })

  const existingCommentariesText = (existingCommentary ?? [])
    .filter((c: Record<string, unknown>) => c.transcript)
    .map((c: Record<string, unknown>) => {
      const agentData = c.agents as Record<string, unknown> | null
      const name = (agentData?.name as string) ?? 'Agent'
      return `${name}: ${c.transcript}`
    })
    .join('\n\n') || 'None yet.'

  const dynamicVars = {
    report_headline: report.headline ?? 'Untitled Report',
    report_summary: report.summary ?? '',
    report_body: reportBodyText,
    report_sources: report.sources ? JSON.stringify(report.sources) : '',
    report_entities: report.key_entities ?? '',
    existing_commentaries: existingCommentariesText,
    current_date: new Date().toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }),
  }

  // ── Create Retell web call ────────────────────────────────────────────
  try {
    const res = await fetch(`${RETELL_API_BASE}/v2/create-web-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agent.retell_call_agent_id,
        retell_llm_dynamic_variables: dynamicVars,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Retell create-web-call error (News Article):', errText)
      return NextResponse.json({ error: 'Failed to create call' }, { status: 500 })
    }

    const { access_token, call_id } = await res.json() as { access_token: string; call_id: string }

    return NextResponse.json({
      callId: call_id,
      retellCallId: call_id,
      retellUrl: 'wss://retell-ai-4ihahnq7.livekit.cloud',
      accessToken: access_token,
      maxSeconds,
      isAnonymous,
      creditsAvailable: isAnonymous ? 0 : userCredits,
    })
  } catch (err) {
    console.error('News article call error:', err)
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 })
  }
}
