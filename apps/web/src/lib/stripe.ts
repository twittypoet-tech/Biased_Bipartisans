import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
})

// ── Price IDs ────────────────────────────────────────────────────────────────

export const STRIPE_PRICES = {
  pro_monthly: 'price_1TJI9NECA3vMoocVMb6cSyTx',
  credits_100: 'price_1TJI9aECA3vMoocVPRjFnXBD',
  credits_500: 'price_1TJI9bECA3vMoocVVAdBLGJS',
  credits_1000: 'price_1TJI9cECA3vMoocVKGYBa0PT',
} as const

export type StripePriceKey = keyof typeof STRIPE_PRICES
