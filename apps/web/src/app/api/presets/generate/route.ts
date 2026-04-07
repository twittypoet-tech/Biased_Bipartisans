import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'
import { generateUserPresets } from '@/lib/generate-presets'

const GENERATION_CREDIT_COST = 1

export async function POST() {
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const db = createServerClient()

  // Get profile with interests + credits
  const { data: profile } = await db
    .from('user_profiles')
    .select('interests, credits')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const interests = (profile.interests as string[]).filter(Boolean)
  if (interests.length === 0) {
    return NextResponse.json({ error: 'Set your interests first via Settings → Personalize with Bipi' }, { status: 400 })
  }

  // Credit check + deduction
  if (profile.credits < GENERATION_CREDIT_COST) {
    return NextResponse.json({
      error: `Not enough credits. You need ${GENERATION_CREDIT_COST} credit (you have ${profile.credits}).`,
    }, { status: 402 })
  }

  const { error: deductError } = await db.rpc('deduct_credits', { p_user_id: user.id, p_amount: GENERATION_CREDIT_COST })
  if (deductError) {
    return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 402 })
  }

  await db.from('credit_transactions').insert({
    user_id: user.id,
    amount: -GENERATION_CREDIT_COST,
    reason: 'agent_call',
    reference_id: 'preset_generation',
  })

  // Generate presets
  try {
    const presets = await generateUserPresets(db, user.id, interests)
    return NextResponse.json({ ok: true, presets })
  } catch (err) {
    console.error('Preset generation error:', err)
    return NextResponse.json({ error: 'Failed to generate presets' }, { status: 500 })
  }
}
