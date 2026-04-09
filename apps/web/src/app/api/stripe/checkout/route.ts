import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICES, type StripePriceKey } from '@/lib/stripe'

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: { priceKey?: StripePriceKey }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const priceKey = body.priceKey
  if (!priceKey || !STRIPE_PRICES[priceKey]) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }

  const priceId = STRIPE_PRICES[priceKey]
  const isSubscription = priceKey === 'pro_monthly'

  const db = createServerClient()

  // ── Get or create Stripe customer ──────────────────────────────────────
  const { data: profile } = await db
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id as string | null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await db
      .from('user_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  // ── Create Checkout session ────────────────────────────────────────────
  const origin = request.headers.get('origin') ?? 'https://bipinews.com'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: isSubscription ? 'subscription' : 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/subscribe?success=true`,
    cancel_url: `${origin}/subscribe`,
    metadata: {
      supabase_user_id: user.id,
      price_key: priceKey,
    },
  })

  return NextResponse.json({ url: session.url })
}
