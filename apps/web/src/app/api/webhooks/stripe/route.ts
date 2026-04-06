import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'

// Credit amounts for each price key
const CREDIT_PACKS: Record<string, number> = {
  credits_100: 100,
  credits_500: 500,
  credits_1000: 1000,
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  // Verify webhook signature if secret is configured
  let event: Stripe.Event
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    } catch (err) {
      console.error('Stripe webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  } else {
    // No webhook secret configured — parse raw (dev mode)
    try {
      event = JSON.parse(rawBody) as Stripe.Event
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
  }

  const db = createServerClient()

  try {
    switch (event.type) {
      // ── New checkout completed ──────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const priceKey = session.metadata?.price_key
        if (!userId) break

        if (session.mode === 'subscription') {
          // Pro subscription activated
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription)?.id

          await db.from('user_profiles').update({
            tier: 'pro',
            stripe_subscription_id: subscriptionId ?? null,
            credits: 100,
            credits_updated_at: new Date().toISOString(),
          }).eq('id', userId)

          await db.from('credit_transactions').insert({
            user_id: userId,
            amount: 100,
            reason: 'monthly_pro',
            reference_id: session.id,
          })

          console.log('Stripe webhook: Pro subscription activated for', userId)
        } else if (session.mode === 'payment' && priceKey) {
          // Credit pack purchase
          const creditAmount = CREDIT_PACKS[priceKey]
          if (creditAmount) {
            const { data: profile } = await db
              .from('user_profiles')
              .select('credits')
              .eq('id', userId)
              .single()

            await db.from('user_profiles').update({
              credits: (profile?.credits ?? 0) + creditAmount,
              credits_updated_at: new Date().toISOString(),
            }).eq('id', userId)

            await db.from('credit_transactions').insert({
              user_id: userId,
              amount: creditAmount,
              reason: 'purchase',
              reference_id: session.id,
            })

            console.log('Stripe webhook: Added', creditAmount, 'credits for', userId)
          }
        }
        break
      }

      // ── Recurring invoice paid (monthly pro renewal) ────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        // Only process subscription invoices, skip first (handled by checkout.session.completed)
        if (invoice.billing_reason !== 'subscription_cycle') break

        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : (invoice.customer as Stripe.Customer)?.id

        if (!customerId) break

        const { data: profile } = await db
          .from('user_profiles')
          .select('id, credits')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await db.from('user_profiles').update({
            credits: 100,
            credits_updated_at: new Date().toISOString(),
          }).eq('id', profile.id)

          await db.from('credit_transactions').insert({
            user_id: profile.id,
            amount: 100,
            reason: 'monthly_pro',
            reference_id: invoice.id,
          })

          console.log('Stripe webhook: Monthly pro refill for', profile.id)
        }
        break
      }

      // ── Subscription cancelled ──────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : (subscription.customer as Stripe.Customer)?.id

        if (!customerId) break

        await db.from('user_profiles').update({
          tier: 'free',
          stripe_subscription_id: null,
        }).eq('stripe_customer_id', customerId)

        console.log('Stripe webhook: Subscription cancelled for customer', customerId)
        break
      }

      default:
        // Unhandled event type — ignore
        break
    }
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
