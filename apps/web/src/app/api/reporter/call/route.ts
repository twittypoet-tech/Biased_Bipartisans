import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

const REPORTER_AGENT_ID  = 'agent_0fd7ecb17c2e5717f23ed69511'
const WIRE_HOST_AGENT_ID = 'agent_21b5d4660d86a45abad2492cf7'
const REPORT_CREDIT_COST = 5

async function createRetellCall(apiKey: string, agentId: string, dynamicVars: Record<string, string>, language: string) {
  const res = await fetch(`${RETELL_API_BASE}/v2/create-web-call`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, retell_llm_dynamic_variables: dynamicVars, language }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ access_token: string; call_id: string }>
}
const RETELL_API_BASE   = 'https://api.retellai.com'

const SUPPORTED_LANGUAGES = new Set([
  'en-US', 'es-ES', 'fr-FR', 'de-DE',
  'pt-BR', 'ja-JP', 'zh-CN', 'ar-SA',
])

export async function POST(request: Request) {
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    return NextResponse.json({ error: 'Retell not configured' }, { status: 500 })
  }

  // ── Auth + credit check ─────────────────────────────────────────────────
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to make a call' }, { status: 401 })
  }

  // Check credit balance
  const serviceDb = createServerClient()
  const { data: profile } = await serviceDb
    .from('user_profiles')
    .select('credits')
    .eq('id', user.id)
    .single()

  if (!profile || profile.credits < REPORT_CREDIT_COST) {
    return NextResponse.json({
      error: `Not enough credits. You need ${REPORT_CREDIT_COST} credits to generate a report (you have ${profile?.credits ?? 0}).`,
    }, { status: 402 })
  }

  let body: { userQuery?: string; language?: string; timezone?: string; researchMode?: boolean }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const userQuery = (body.userQuery ?? '').trim() || 'breaking news today'
  const language  = SUPPORTED_LANGUAGES.has(body.language ?? '') ? body.language : 'en-US'
  const researchMode = body.researchMode ?? false

  // Validate timezone from client; fall back to UTC if unrecognised
  let timezone = 'UTC'
  if (body.timezone) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: body.timezone })
      timezone = body.timezone
    } catch {
      // invalid tz string — stay on UTC
    }
  }

  // Format current date + time in the user's local timezone
  const now = new Date()
  const currentDate =
    now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: timezone }) +
    ' at ' +
    now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone, timeZoneName: 'short' })

  const dynamicVars = {
    user_query: userQuery,
    current_date: currentDate,
    response_language: language as string,
    research_mode: researchMode ? 'on' : 'off',
    timezone,
  }

  let reporterCall: { access_token: string; call_id: string }
  let wireCall:     { access_token: string; call_id: string } | null = null

  try {
    reporterCall = await createRetellCall(retellApiKey, REPORTER_AGENT_ID, dynamicVars, language as string)
  } catch (err) {
    console.error('Retell create-web-call error (Reporter):', err)
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 })
  }

  // ── Deduct credits ──────────────────────────────────────────────────────
  try {
    await serviceDb.rpc('deduct_credits', { p_user_id: user.id, p_amount: REPORT_CREDIT_COST })
  } catch {
    // Fallback: manual deduction
    await serviceDb
      .from('user_profiles')
      .update({ credits: (profile.credits ?? 0) - REPORT_CREDIT_COST })
      .eq('id', user.id)
  }

  // Log credit transaction
  await serviceDb.from('credit_transactions').insert({
    user_id: user.id,
    amount: -REPORT_CREDIT_COST,
    reason: 'report',
    reference_id: reporterCall.call_id,
  })

  // Create Wire Host call — fire-and-forget; non-fatal if it fails
  try {
    wireCall = await createRetellCall(retellApiKey, WIRE_HOST_AGENT_ID, dynamicVars, language as string)
  } catch (err) {
    console.warn('Retell create-web-call warning (Wire Host):', err)
  }

  // Trigger the agents service to relay Wire ↔ Reporter audio and create a
  // public LiveKit room the browser can subscribe to (same pattern as debates).
  let publicRoomUrl:  string | null = null
  let browserToken:   string | null = null

  if (wireCall) {
    const agentsUrl     = process.env.AGENTS_SERVICE_URL
    const triggerSecret = process.env.AGENTS_TRIGGER_SECRET
    if (agentsUrl) {
      try {
        const relayRes = await fetch(`${agentsUrl}/reporter/relay`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            ...(triggerSecret ? { Authorization: `Bearer ${triggerSecret}` } : {}),
          },
          body: JSON.stringify({
            wireAccessToken:     wireCall.access_token,
            reporterAccessToken: reporterCall.access_token,
          }),
        })
        if (relayRes.ok) {
          const relayData = await relayRes.json()
          publicRoomUrl = relayData.publicRoomUrl ?? null
          browserToken  = relayData.browserToken  ?? null
        }
      } catch (err) {
        console.warn('Reporter relay trigger failed:', err)
      }
    }
  }

  return NextResponse.json({
    callId:        reporterCall.call_id,
    wireCallId:    wireCall?.call_id ?? null,
    publicRoomUrl: publicRoomUrl ?? null,
    browserToken:  browserToken  ?? null,
    retellUrl:     'wss://retell-ai-4ihahnq7.livekit.cloud',
    reporterToken: publicRoomUrl ? null : reporterCall.access_token,
    creditsRemaining: (profile.credits ?? 0) - REPORT_CREDIT_COST,
  })
}
