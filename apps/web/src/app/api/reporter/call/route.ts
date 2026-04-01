import { NextResponse } from 'next/server'

const REPORTER_AGENT_ID  = 'agent_0fd7ecb17c2e5717f23ed69511'
const WIRE_HOST_AGENT_ID = 'agent_21b5d4660d86a45abad2492cf7'
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

  const res = await fetch(`${RETELL_API_BASE}/v2/create-web-call`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${retellApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: REPORTER_AGENT_ID,
      retell_llm_dynamic_variables: {
        user_query:   userQuery,
        current_date: currentDate,
      },
      language,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Retell create-web-call error:', err)
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 })
  }

  const call = await res.json()

  return NextResponse.json({
    accessToken: call.access_token,
    callId:      call.call_id,
    retellUrl:   'wss://retell-ai-4ihahnq7.livekit.cloud',
  })
}
