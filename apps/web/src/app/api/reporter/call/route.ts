import { NextResponse } from 'next/server'

const REPORTER_AGENT_ID  = 'agent_0fd7ecb17c2e5717f23ed69511'
const WIRE_HOST_AGENT_ID = 'agent_21b5d4660d86a45abad2492cf7'

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

  let body: { userQuery?: string; language?: string; timezone?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const userQuery = (body.userQuery ?? '').trim() || 'breaking news today'
  const language  = SUPPORTED_LANGUAGES.has(body.language ?? '') ? body.language : 'en-US'

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
  // e.g. "April 1, 2026 at 3:42 PM EDT"
  const now = new Date()
  const currentDate =
    now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: timezone }) +
    ' at ' +
    now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone, timeZoneName: 'short' })

  const dynamicVars = { user_query: userQuery, current_date: currentDate }

  let reporterCall: { access_token: string; call_id: string }
  let wireCall:     { access_token: string; call_id: string } | null = null

  try {
    reporterCall = await createRetellCall(retellApiKey, REPORTER_AGENT_ID, dynamicVars, language as string)
  } catch (err) {
    console.error('Retell create-web-call error (Reporter):', err)
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 })
  }

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
    // If relay is active, browser connects to public LiveKit room (hears both agents).
    // Fallback: connect directly to Reporter's Retell room (no Wire audio).
    publicRoomUrl: publicRoomUrl ?? null,
    browserToken:  browserToken  ?? null,
    retellUrl:     'wss://retell-ai-4ihahnq7.livekit.cloud',
    reporterToken: publicRoomUrl ? null : reporterCall.access_token,
  })
}
