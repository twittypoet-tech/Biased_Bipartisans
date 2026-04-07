import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

const ONBOARDING_AGENT_ID = 'agent_dc30d418ef88204e5452f1eed5'
const RETELL_API_BASE = 'https://api.retellai.com'
const ONBOARDING_CREDIT_COST = 1

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

  const serviceDb = createServerClient()

  // Get user profile for context + credit check
  const { data: profile } = await serviceDb
    .from('user_profiles')
    .select('display_name, interests, credits')
    .eq('id', user.id)
    .single()

  // Credit check
  if (!profile || profile.credits < ONBOARDING_CREDIT_COST) {
    return NextResponse.json({
      error: `Not enough credits. You need ${ONBOARDING_CREDIT_COST} credit (you have ${profile?.credits ?? 0}).`,
    }, { status: 402 })
  }

  // Deduct credit (atomic — fails if insufficient)
  const { error: deductError } = await serviceDb.rpc('deduct_credits', { p_user_id: user.id, p_amount: ONBOARDING_CREDIT_COST })
  if (deductError) {
    return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 402 })
  }

  await serviceDb.from('credit_transactions').insert({
    user_id: user.id,
    amount: -ONBOARDING_CREDIT_COST,
    reason: 'agent_call',
  })

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
