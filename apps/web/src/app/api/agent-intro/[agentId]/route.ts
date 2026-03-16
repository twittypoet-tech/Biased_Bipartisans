import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getAgent, getActiveWorldview } from '@bipi/db'

const RETELL_LIVEKIT_URL = 'wss://retell-ai-4ihahnq7.livekit.cloud'
const RETELL_API_BASE = 'https://api.retellai.com'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params
  const db = createServerClient()

  const agent = await getAgent(db, agentId)
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Return cached intro if available
  if (agent.intro_audio_url) {
    return NextResponse.json({ type: 'audio', url: agent.intro_audio_url })
  }

  if (!agent.retell_agent_id) {
    return NextResponse.json({ error: 'Agent has no Retell configuration' }, { status: 400 })
  }

  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    return NextResponse.json({ error: 'Retell not configured' }, { status: 500 })
  }

  const worldview = await getActiveWorldview(db, agentId)

  const introPrompt = [
    `You are ${agent.name}, a political commentator known for a ${agent.archetype.replace(/_/g, ' ')} perspective.`,
    agent.short_bio ? `Your background: ${agent.short_bio}.` : '',
    worldview?.core_thesis ? `Your core thesis: ${worldview.core_thesis}.` : '',
    `In this call, introduce yourself in 3-4 sentences. Speak naturally in character — who you are, what you stand for, and what makes you distinctive. Be direct and memorable. End the call when finished.`,
  ]
    .filter(Boolean)
    .join(' ')

  const res = await fetch(`${RETELL_API_BASE}/v2/create-web-call`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${retellApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: agent.retell_agent_id,
      override_agent_config: {
        general_prompt: introPrompt,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Retell create-web-call error:', err)
    return NextResponse.json({ error: 'Failed to create Retell call' }, { status: 500 })
  }

  const call = await res.json()

  return NextResponse.json({
    type: 'webrtc',
    accessToken: call.access_token,
    callId: call.call_id,
    retellUrl: RETELL_LIVEKIT_URL,
  })
}
