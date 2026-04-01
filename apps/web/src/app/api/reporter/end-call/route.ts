import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
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

  try {
    const res = await fetch(`https://api.retellai.com/v2/end-call/${callId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${retellApiKey}` },
    })
    if (!res.ok) {
      console.warn('Retell end-call failed:', await res.text())
    }
  } catch (err) {
    console.warn('Retell end-call error:', err)
  }

  return NextResponse.json({ ok: true })
}
