'use client'

import Link from 'next/link'
import { Phone, Sparkles, FileText, ArrowRight, Crown } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

export default function DashboardHome() {
  const { profile } = useAuth()
  const isPro = profile?.tier === 'pro'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-t-text mb-1">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="text-sm text-t-text-2">
          {isPro
            ? 'Your daily report is waiting. Call The Reporter for live updates.'
            : 'You have a free account. Generate reports, explore debates, and upgrade for more.'}
        </p>
      </div>

      {/* Credits card */}
      <div className="rounded-2xl border border-t-edge bg-t-surface p-5 shadow-t mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-t-text-3">Available Credits</p>
            <p className="text-3xl font-bold text-t-text">{profile?.credits ?? 0}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
            isPro ? 'bg-t-accent-soft text-t-accent-text' : 'bg-t-surface-el text-t-text-3'
          }`}>
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>
        <div className="flex gap-2">
          <Link href="/subscribe" className="flex-1 rounded-xl border border-t-edge-strong bg-t-surface-el py-2.5 text-sm font-medium text-t-text-2 text-center hover:bg-t-hover transition">
            {isPro ? 'Buy More' : 'Upgrade to Pro'}
          </Link>
          <Link href="/" className="flex-1 rounded-xl bg-t-accent py-2.5 text-sm font-semibold text-white text-center hover:opacity-90 transition">
            <Phone className="inline size-4 mr-1.5 -mt-0.5" />
            Call The Reporter
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Link href="/my/reports" className="group rounded-xl border border-t-edge bg-t-surface p-4 shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg">
          <FileText className="size-5 text-t-text-3 mb-3" />
          <p className="text-sm font-semibold text-t-text mb-1">My Reports</p>
          <p className="text-xs text-t-text-3">View all reports you&apos;ve generated.</p>
          <ArrowRight className="size-4 text-t-text-4 mt-3 group-hover:text-t-accent-text transition" />
        </Link>

        <Link href="/my/settings" className="group rounded-xl border border-t-edge bg-t-surface p-4 shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg">
          <Sparkles className="size-5 text-t-text-3 mb-3" />
          <p className="text-sm font-semibold text-t-text mb-1">Personalize</p>
          <p className="text-xs text-t-text-3">Set your interests for tailored reports.</p>
          <ArrowRight className="size-4 text-t-text-4 mt-3 group-hover:text-t-accent-text transition" />
        </Link>
      </div>

      {/* Upsell for free users */}
      {!isPro && (
        <div className="rounded-2xl border border-t-accent/30 bg-gradient-to-r from-t-accent-soft to-transparent p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-t-accent/20 flex items-center justify-center shrink-0">
              <Crown className="size-5 text-t-accent-text" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-t-text mb-1">Upgrade to Pro</h3>
              <p className="text-sm text-t-text-2 mb-3">
                Get 100 credits/month, agent commentary, 1-on-1 calls, and commenting access.
              </p>
              <Link href="/subscribe" className="inline-flex items-center gap-2 rounded-lg bg-t-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
                <Crown className="size-4" /> Subscribe — $25/mo
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
