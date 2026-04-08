'use client'

import Link from 'next/link'
import { Crown } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

function getNextMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 1 : 8 - day
  const next = new Date(now)
  next.setDate(now.getDate() + diff)
  return next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getNextMonthFirst(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DashboardWelcome() {
  const { profile, isLoading } = useAuth()
  const isPro = profile?.tier === 'pro'

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-6 sm:pt-10">
        <div className="h-8 w-48 bg-t-surface-el rounded-lg animate-pulse mb-4" />
        <div className="h-32 bg-t-surface-el rounded-2xl animate-pulse mb-6" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 sm:pt-10">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-t-text mb-1">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h1>
        <p className="text-sm text-t-text-2">
          Call The Reporter for a live briefing on any topic.
        </p>
      </div>

      {/* Credits card */}
      <div className="rounded-2xl border border-t-edge bg-t-surface p-5 shadow-t mb-6">
        <div className="flex items-center justify-between mb-3">
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
        <p className="text-xs text-t-text-3 mb-4">
          Next top-up: <span className="font-medium text-t-text-2">
            {isPro
              ? `${getNextMonthFirst()} (100 credits)`
              : `${getNextMonday()} (+5 credits)`
            }
          </span>
        </p>
        <Link href="/subscribe" className="inline-flex rounded-xl border border-t-edge-strong bg-t-surface-el px-4 py-2.5 text-sm font-medium text-t-text-2 hover:bg-t-hover transition">
          {isPro ? 'Buy More Credits' : 'Upgrade to Pro'}
        </Link>
      </div>

      {/* Upsell for free users */}
      {!isPro && (
        <div className="rounded-2xl border border-t-accent/30 bg-gradient-to-r from-t-accent-soft to-transparent p-5 sm:p-6 mb-6">
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
