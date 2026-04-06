import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const db = createServerClient()
  const { data: profile } = await db
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  const customerId = profile?.stripe_customer_id as string | null
  if (!customerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
  }

  const origin = request.headers.get('origin') ?? 'https://biasedbipartisans.com'

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/subscribe`,
  })

  return NextResponse.json({ url: session.url })
}
