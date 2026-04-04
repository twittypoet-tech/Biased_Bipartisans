'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Zap, Globe, Clock, Sparkles, Phone, CreditCard, ChevronDown } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { cn } from '@/lib/utils'

const proFeatures = [
  { icon: Sparkles, label: 'AI-Powered News reports tailored to your schedule, interests, and industry' },
  { icon: Zap, label: '20 reports/month with 100 credits included' },
  { icon: Globe, label: 'Multi-lingual reporting in 8+ languages' },
  { icon: Clock, label: 'Unlimited news algorithm refinements' },
  { icon: Phone, label: '1-on-1 voice calls with AI agents' },
]

const creditTiers = [
  {
    credits: 100,
    price: 25,
    perCredit: 0.25,
    value: { reports: 20, callTime: '1.5 hours' },
  },
  {
    credits: 500,
    price: 105,
    perCredit: 0.21,
    value: { reports: 100, callTime: '7.5 hours' },
  },
  {
    credits: 1000,
    price: 200,
    perCredit: 0.20,
    value: { reports: 200, callTime: '15 hours' },
  },
]

export default function SubscribePage() {
  const { user, profile } = useAuth()
  const isPro = profile?.tier === 'pro'
  const [expandedTier, setExpandedTier] = useState<number | null>(null)

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

        {/* ── Pro member status (shown when already Pro) ── */}
        {isPro && (
          <div className="rounded-2xl border border-t-accent/30 bg-t-surface p-5 shadow-t mb-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-t-accent-soft flex items-center justify-center">
                <Sparkles className="size-5 text-t-accent-text" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-t-text">You&apos;re on Pro</p>
                <p className="text-xs text-t-text-3">{profile?.credits ?? 0} credits remaining · 100 credits/month</p>
              </div>
              <button className="rounded-lg border border-t-edge-strong bg-t-surface-el px-3 py-1.5 text-xs font-medium text-t-text-2 hover:bg-t-hover transition">
                Manage
              </button>
            </div>
          </div>
        )}

        {/* ── Pro Card (shown for non-Pro users) ── */}
        {!isPro && (
          <div className="rounded-2xl border-2 border-t-accent/40 bg-t-surface p-6 sm:p-8 shadow-t-lg relative overflow-hidden mb-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-t-accent-soft px-3 py-1 text-xs font-semibold text-t-accent-text mb-4">
                <Sparkles className="size-3" /> PRO
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-t-text mb-1">
                $25<span className="text-lg text-t-text-3 font-normal">/month</span>
              </h1>
              <p className="text-sm text-t-text-2">Research topics with ease. 100 credits included.</p>
            </div>

            <ul className="space-y-3 mb-8">
              {proFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="size-6 rounded-full bg-t-accent-soft flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="size-3.5 text-t-accent-text" />
                  </div>
                  <span className="text-sm text-t-text leading-snug">{f.label}</span>
                </li>
              ))}
            </ul>

            <button className="w-full rounded-xl bg-t-accent py-3.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition">
              Subscribe to Pro
            </button>
            <p className="mt-3 text-center text-xs text-t-text-4">Stripe checkout coming soon</p>
          </div>
        )}

        {/* ── Buy Credits ── */}
        <div className="mt-8 rounded-2xl border border-t-edge bg-t-surface p-6 shadow-t">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="size-5 text-t-text-3" />
            <h2 className="text-base font-semibold text-t-text">Buy Credits</h2>
          </div>
          <p className="text-sm text-t-text-2 mb-5">
            Need more credits? Buy à la carte. Volume discounts available.
          </p>

          <div className="space-y-2">
            {creditTiers.map((tier, i) => (
              <div key={tier.credits} className="rounded-xl border border-t-edge overflow-hidden">
                {/* Row */}
                <button
                  onClick={() => setExpandedTier(expandedTier === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-t-hover transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-t-text">{tier.credits.toLocaleString()}</span>
                    <span className="text-sm text-t-text-3">credits</span>
                    {tier.perCredit < 0.25 && (
                      <span className="rounded-full bg-green-950/40 border border-green-800/30 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                        Save {Math.round((1 - tier.perCredit / 0.25) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-t-text">${tier.price}</p>
                      <p className="text-[11px] text-t-text-4">${tier.perCredit.toFixed(2)}/ea</p>
                    </div>
                    <ChevronDown className={cn(
                      'size-4 text-t-text-4 transition-transform',
                      expandedTier === i && 'rotate-180',
                    )} />
                  </div>
                </button>

                {/* Expanded value breakdown */}
                {expandedTier === i && (
                  <div className="px-4 pb-4 pt-1 border-t border-t-edge-muted">
                    <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-3">What you get</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-t-surface-el p-3 text-center">
                        <p className="text-lg font-bold text-t-text">{tier.value.reports}</p>
                        <p className="text-xs text-t-text-3">News Reports</p>
                      </div>
                      <div className="rounded-lg bg-t-surface-el p-3 text-center">
                        <p className="text-lg font-bold text-t-text">{tier.value.callTime}</p>
                        <p className="text-xs text-t-text-3">Agent Call Time</p>
                      </div>
                    </div>
                    <button className="w-full mt-3 rounded-lg border border-t-edge-strong bg-t-surface-el py-2.5 text-sm font-semibold text-t-text-2 hover:bg-t-hover transition">
                      Buy {tier.credits.toLocaleString()} Credits — Coming Soon
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
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
