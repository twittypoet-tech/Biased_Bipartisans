import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

const RETELL_API_BASE = 'https://api.retellai.com'
const CALL_CREDIT_COST = 5

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    return NextResponse.json({ error: 'Retell not configured' }, { status: 500 })
  }

  const { slug } = await params

  // Get authenticated user
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const serviceDb = createServerClient()

  // Fetch the report and its authoring agent
  const { data: report, error: reportErr } = await serviceDb
    .from('news_reports')
    .select('id, headline, summary, body, agent_id')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (reportErr || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (!report.agent_id) {
    return NextResponse.json({ error: 'This report has no assigned agent' }, { status: 400 })
  }

  // Fetch the agent's retell_call_agent_id
  const { data: agent, error: agentErr } = await serviceDb
    .from('agents')
    .select('id, name, retell_call_agent_id')
    .eq('id', report.agent_id)
    .single()

  if (agentErr || !agent?.retell_call_agent_id) {
    return NextResponse.json({ error: 'Agent not available for calls' }, { status: 400 })
  }

  // Credit check + deduction
  const { data: profile } = await serviceDb
    .from('user_profiles')
    .select('credits, display_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.credits < CALL_CREDIT_COST) {
    return NextResponse.json({
      error: `Not enough credits. You need ${CALL_CREDIT_COST} credits (you have ${profile?.credits ?? 0}).`,
    }, { status: 402 })
  }

  const { error: deductError } = await serviceDb.rpc('deduct_credits', {
    p_user_id: user.id,
    p_amount: CALL_CREDIT_COST,
  })
  if (deductError) {
    return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 402 })
  }

  await serviceDb.from('credit_transactions').insert({
    user_id: user.id,
    amount: -CALL_CREDIT_COST,
    reason: 'agent_call',
    reference_id: report.id,
  })

  // Build article context for the agent (truncate body to ~2000 chars)
  const bodyBlocks = report.body as { type: string; content?: string }[]
  const bodyText = bodyBlocks
    .filter((b) => b.content)
    .map((b) => b.content)
    .join('\n\n')
    .slice(0, 2000)

  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const dynamicVars = {
    user_name: profile.display_name ?? 'there',
    user_id: user.id,
    current_date: currentDate,
    article_headline: report.headline,
    article_summary: report.summary ?? '',
    article_body: bodyText,
    agent_name: agent.name,
  }

  // Create Retell web call — direct 1-on-1, no relay needed
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
      retellUrl: 'wss://retell-ai-4ihahnq7.livekit.cloud',
      accessToken: access_token,
    })
  } catch (err) {
    console.error('News article call error:', err)
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 })
  }
}
