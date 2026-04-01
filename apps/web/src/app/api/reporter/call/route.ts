import { NextResponse } from 'next/server'

const REPORTER_AGENT_ID = 'agent_0fd7ecb17c2e5717f23ed69511'
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

  let body: { userQuery?: string; language?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const userQuery = (body.userQuery ?? '').trim() || 'breaking news today'
  const language  = SUPPORTED_LANGUAGES.has(body.language ?? '') ? body.language : 'en-US'

  // Format current date as spoken string: "April 1, 2026"
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

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
