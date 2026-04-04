import { NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase/server'

const ONBOARDING_AGENT_ID = 'agent_dc30d418ef88204e5452f1eed5'
const RETELL_API_BASE = 'https://api.retellai.com'

export async function POST(request: Request) {
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    return NextResponse.json({ error: 'Retell not configured' }, { status: 500 })
  }

  // Get authenticated user
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get user profile for context
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, interests')
    .eq('id', user.id)
    .single()

  // Build dynamic variables for the agent
  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const dynamicVars = {
    user_name: profile?.display_name ?? 'there',
    user_id: user.id,
    current_date: currentDate,
    existing_interests: (profile?.interests ?? []).length > 0
      ? (profile?.interests as string[]).join(', ')
      : 'none set yet',
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
        agent_id: ONBOARDING_AGENT_ID,
        retell_llm_dynamic_variables: dynamicVars,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Retell create-web-call error (Onboarding):', errText)
      return NextResponse.json({ error: 'Failed to create call' }, { status: 500 })
    }

    const { access_token, call_id } = await res.json() as { access_token: string; call_id: string }

    return NextResponse.json({
      callId: call_id,
      retellUrl: 'wss://retell-ai-4ihahnq7.livekit.cloud',
      accessToken: access_token,
    })
  } catch (err) {
    console.error('Onboarding call error:', err)
    return NextResponse.json({ error: 'Failed to create call' }, { status: 500 })
  }
}
