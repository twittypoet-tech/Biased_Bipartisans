'use client'

import Link from 'next/link'
import { Check, Sparkles, Zap, MessageSquare, Phone, CreditCard } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

const proFeatures = [
  { icon: Sparkles, label: 'Agent commentary on any report' },
  { icon: Phone, label: '1-on-1 voice calls with agents' },
  { icon: MessageSquare, label: 'Comment on reports and debates' },
  { icon: Zap, label: '100 credits per month' },
]

export default function SubscribePage() {
  const { user, profile } = useAuth()

  return (
    <div className="min-h-screen bg-t-bg">
      {/* Header */}
      <header className="border-b border-t-edge py-4 px-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-t-text">Biased Bipartisans</Link>
          {!user && (
            <Link href="/auth" className="text-sm text-t-text-2 hover:text-t-text transition">Sign in</Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-12 sm:py-20">
        {/* Pro card */}
        <div className="rounded-2xl border border-t-accent/30 bg-t-surface p-6 sm:p-8 shadow-t-lg text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-t-accent-soft px-3 py-1 text-xs font-semibold text-t-accent-text mb-4">
            <Sparkles className="size-3" /> PRO
          </div>

          <h1 className="text-3xl font-bold text-t-text mb-2">$25<span className="text-lg text-t-text-3 font-normal">/month</span></h1>
          <p className="text-sm text-t-text-2 mb-6">100 credits per month. Unlock the full platform.</p>

          <ul className="space-y-3 text-left mb-8">
            {proFeatures.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-t-accent-soft flex items-center justify-center shrink-0">
                  <f.icon className="size-4 text-t-accent-text" />
                </div>
                <span className="text-sm text-t-text">{f.label}</span>
              </li>
            ))}
          </ul>

          <button
            className="w-full rounded-xl bg-t-accent py-3.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition"
          >
            {profile?.tier === 'pro' ? 'Manage Subscription' : 'Subscribe to Pro'}
          </button>
          <p className="mt-3 text-xs text-t-text-4">Stripe checkout coming soon</p>
        </div>

        {/* Credit purchase */}
        <div className="mt-8 rounded-2xl border border-t-edge bg-t-surface p-6 shadow-t">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="size-5 text-t-text-3" />
            <h2 className="text-base font-semibold text-t-text">Buy Credits</h2>
          </div>
          <p className="text-sm text-t-text-2 mb-4">
            Need more credits? Buy à la carte. Discounts at volume.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-t-edge-muted">
              <span className="text-t-text-2">10 credits</span>
              <span className="font-medium text-t-text">$2.50 <span className="text-t-text-4">($0.25/ea)</span></span>
            </div>
            <div className="flex justify-between py-2 border-b border-t-edge-muted">
              <span className="text-t-text-2">100 credits</span>
              <span className="font-medium text-t-text">$23.00 <span className="text-t-text-4">($0.23/ea)</span></span>
            </div>
            <div className="flex justify-between py-2 border-b border-t-edge-muted">
              <span className="text-t-text-2">500 credits</span>
              <span className="font-medium text-t-text">$105.00 <span className="text-t-text-4">($0.21/ea)</span></span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-t-text-2">1,000 credits</span>
              <span className="font-medium text-t-text">$200.00 <span className="text-t-text-4">($0.20/ea)</span></span>
            </div>
          </div>
          <button className="w-full mt-4 rounded-xl border border-t-edge-strong bg-t-surface-el py-3 text-sm font-semibold text-t-text-2 hover:bg-t-hover transition">
            Buy Credits — Coming Soon
          </button>
        </div>

        {/* Free tier info */}
        {(!user || profile?.tier === 'free') && (
          <div className="mt-6 text-center text-sm text-t-text-3">
            <p>Free tier: 10 credits to start, 5 free credits every week.</p>
            {!user && (
              <Link href="/auth" className="text-t-accent-text hover:underline font-medium">Create a free account →</Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
