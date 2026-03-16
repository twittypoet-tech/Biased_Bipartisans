import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { saveAgentIntroAudio } from '@bipi/db'

const RETELL_API_BASE = 'https://api.retellai.com'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params
  const { callId } = await request.json()

  if (!callId) {
    return NextResponse.json({ error: 'callId required' }, { status: 400 })
  }

  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    return NextResponse.json({ error: 'Retell not configured' }, { status: 500 })
  }

  // Poll for recording_url — Retell processes recordings within ~10s of call end
  let recordingUrl: string | null = null
  for (let attempt = 0; attempt < 6; attempt++) {
    await new Promise((r) => setTimeout(r, 3000))
    try {
      const res = await fetch(`${RETELL_API_BASE}/v2/get-call/${callId}`, {
        headers: { Authorization: `Bearer ${retellApiKey}` },
      })
      if (res.ok) {
        const call = await res.json()
        if (call.recording_url) {
          recordingUrl = call.recording_url as string
          break
        }
      }
    } catch {
      // Not ready yet
    }
  }

  if (!recordingUrl) {
    return NextResponse.json({ saved: false, reason: 'recording not yet available' })
  }

  const db = createServerClient()
  await saveAgentIntroAudio(db, agentId, recordingUrl)

  return NextResponse.json({ saved: true, url: recordingUrl })
}
