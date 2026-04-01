import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    console.error('reporter end-call: RETELL_API_KEY not set')
    return NextResponse.json({ error: 'Retell not configured' }, { status: 500 })
  }

  let body: { callId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { callId } = body
  if (!callId) {
    return NextResponse.json({ error: 'callId required' }, { status: 400 })
  }

  console.log(`reporter end-call: ending call ${callId}`)

  try {
    const res = await fetch(`https://api.retellai.com/v2/end-call/${callId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
    })
    const responseText = await res.text()
    if (!res.ok) {
      console.error(`reporter end-call: Retell API returned ${res.status}: ${responseText}`)
      return NextResponse.json({ ok: false, status: res.status, detail: responseText })
    }
    console.log(`reporter end-call: success for ${callId}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('reporter end-call: fetch error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
