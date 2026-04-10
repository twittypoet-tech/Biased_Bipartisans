'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Phone, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useCall } from './call-context'
import { cn } from '@/lib/utils'

interface AuthorAgent {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  archetype: string
  short_bio?: string
  retell_call_agent_id: string | null
}

interface CallReporterCtaProps {
  agent: AuthorAgent
  reportSlug: string
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function timerColor(seconds: number): string {
  if (seconds > 60) return 'text-green-400'
  if (seconds > 30) return 'text-amber-400'
  return 'text-red-400'
}

export function CallReporterCta({ agent, reportSlug }: CallReporterCtaProps) {
  const { user, profile } = useAuth()
  const call = useCall()

  const isSignedIn = !!user
  const userCredits = profile?.credits ?? 0

  // Only show this component's call states if THIS agent is the active call
  const isActiveCall = call.agent?.id === agent.id && call.reportSlug === reportSlug
  const callState = isActiveCall ? call.callState : 'idle'

  if (!agent.retell_call_agent_id) return null

  // ── Agent avatar helper ───────────────────────────────────────────────
  const avatarEl = (size: number) => (
    <div className="relative rounded-full overflow-hidden shrink-0 border-2 border-t-accent/40" style={{ width: size, height: size }}>
      {agent.avatar_url ? (
        <Image src={agent.avatar_url} alt={agent.name} fill className="object-cover" sizes={`${size}px`} />
      ) : (
        <div className="w-full h-full rounded-full bg-t-surface-el flex items-center justify-center text-xl font-bold text-t-text-2">
          {agent.name.charAt(0)}
        </div>
      )}
    </div>
  )

  return (
    <div className="my-10 relative overflow-hidden rounded-xl border border-t-accent/30 bg-gradient-to-r from-t-accent-soft to-transparent p-5 sm:p-6">

      {/* ── Idle ── */}
      {callState === 'idle' && (
        <div className="relative z-10 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
          {avatarEl(56)}

          <div className="flex-1 text-center sm:text-left">
            <p className="text-base font-semibold text-t-text">Talk to {agent.name} about this story</p>
            <p className="mt-1 text-sm text-t-text-2">
              {isSignedIn
                ? `1 credit per minute. You have ${userCredits} credit${userCredits !== 1 ? 's' : ''}.`
                : 'Your first call is free — 5 minutes, no sign-up required.'}
            </p>
          </div>

          {isSignedIn && userCredits < 1 ? (
            <Link href="/subscribe"
              className="inline-flex items-center gap-2 rounded-xl bg-t-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition shrink-0">
              Get Credits
            </Link>
          ) : (
            <button onClick={() => call.startCall(agent, reportSlug)}
              className="inline-flex items-center gap-2 rounded-xl bg-t-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition shrink-0">
              <Phone className="size-4" />
              {isSignedIn ? 'Call Now' : 'Call Now — 5 min free'}
            </button>
          )}
        </div>
      )}

      {/* ── Connecting ── */}
      {callState === 'connecting' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <svg className="animate-spin text-t-accent-text" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-semibold text-t-text">Connecting to {agent.name}...</p>
        </div>
      )}

      {/* ── Live call with timer ── */}
      {callState === 'live' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className={cn(
            'text-4xl font-bold tabular-nums tracking-tight transition-colors',
            timerColor(call.timeRemaining),
            call.timeRemaining <= 30 && 'animate-pulse',
          )}>
            {formatTimer(call.timeRemaining)}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="size-3 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 size-3 rounded-full bg-green-400 animate-ping opacity-75" />
            </div>
            <p className="text-sm font-semibold text-green-400">Live with {agent.name}</p>
          </div>

          {/* Waveform */}
          <div className="flex items-end gap-1 h-8">
            {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.65, 0.45, 0.75, 0.55, 0.85].map((h, i) => (
              <div key={i} className="w-1.5 rounded-full bg-amber-400 animate-pulse"
                style={{ height: `${h * 100}%`, animationDelay: `${i * 70}ms`, animationDuration: '900ms' }} />
            ))}
          </div>

          {call.timeRemaining <= 30 && (
            <p className="text-xs text-red-400 font-medium">
              {call.isAnonymous ? 'Free call ending soon' : 'Low credits — call ending soon'}
            </p>
          )}

          <button onClick={call.endCall}
            className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]">
            End Call
          </button>
        </div>
      )}

      {/* ── Call ended ── */}
      {callState === 'ended' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="size-12 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12" /></svg>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-t-text">Call ended</p>
            <p className="text-xs text-t-text-3 mt-1">
              {call.callDuration > 0 ? `${Math.floor(call.callDuration / 60)}m ${call.callDuration % 60}s` : ''}
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={call.resetCall}
              className="rounded-xl border border-t-edge bg-t-surface px-5 py-2.5 text-sm font-semibold text-t-text hover:bg-t-hover transition">
              Call Again
            </button>
            <button
              className="rounded-xl bg-t-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition opacity-50 cursor-not-allowed"
              title="Transcript will be available shortly"
            >
              View Transcript
            </button>
          </div>

          {call.isAnonymous && (
            <div className="mt-4 w-full rounded-xl border border-t-accent/30 bg-t-surface p-5 text-center">
              <p className="text-base font-semibold text-t-text mb-2">
                Get 10 free credits when you sign up
              </p>
              <p className="text-sm text-t-text-2 mb-4">
                That&apos;s 10 more minutes of conversation with any agent. Plus, unlock full call transcripts.
              </p>
              <Link href={`/auth?redirect=/news/${reportSlug}`}
                className="inline-flex rounded-xl bg-t-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition">
                Sign Up Free
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Blocked ── */}
      {callState === 'blocked' && (
        <div className="flex flex-col items-center gap-4 py-6">
          {avatarEl(48)}
          <div className="text-center">
            <p className="text-base font-semibold text-t-text mb-1">You&apos;ve used your free call</p>
            <p className="text-sm text-t-text-2">
              Sign up to unlock unlimited calls with all agents.
            </p>
          </div>
          <Link href={`/auth?redirect=/news/${reportSlug}`}
            className="inline-flex rounded-xl bg-t-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition">
            Sign Up — Get 10 Free Credits
          </Link>
        </div>
      )}

      {/* ── Error ── */}
      {callState === 'error' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="size-12 rounded-full bg-red-950/40 border border-red-800/60 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <p className="text-sm text-red-400 text-center">{call.errorMsg ?? 'Something went wrong.'}</p>
          <button onClick={call.resetCall} className="text-sm text-t-accent-text hover:underline transition">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ── Mini variant: compact callout for engagement bar ────────────────────
export function CallReporterMiniCta({ agent, reportSlug }: CallReporterCtaProps) {
  const { user, profile } = useAuth()
  const call = useCall()
  const [showBlockedModal, setShowBlockedModal] = useState(false)

  if (!agent.retell_call_agent_id) return null

  const isActiveCall = call.agent?.id === agent.id && call.reportSlug === reportSlug
  const isConnecting = isActiveCall && call.callState === 'connecting'
  const isLive = isActiveCall && call.callState === 'live'
  const isBlocked = isActiveCall && call.callState === 'blocked'

  // ── Connecting state ──
  if (isConnecting) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold"
        style={{ backgroundColor: '#C8A44A', color: '#000' }}
      >
        <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Connecting you with {agent.name}
      </div>
    )
  }

  // ── Live state ──
  if (isLive) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold"
        style={{ backgroundColor: '#C8A44A', color: '#000' }}
      >
        <div className="relative">
          <div className="size-2.5 rounded-full bg-red-600 animate-pulse" />
          <div className="absolute inset-0 size-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
        </div>
        You&apos;re live with {agent.name}
      </div>
    )
  }

  const isSignedIn = !!user
  const userCredits = profile?.credits ?? 0
  const cantAfford = isSignedIn && userCredits < 1

  function handleClick() {
    if (cantAfford) {
      setShowBlockedModal(true)
      return
    }
    call.startCall(agent, reportSlug)
  }

  // Auto-open modal when call comes back blocked from server
  if (isBlocked && !showBlockedModal) {
    setShowBlockedModal(true)
    call.resetCall()
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition hover:opacity-90 active:scale-95"
        style={{ backgroundColor: '#C8A44A', color: '#000' }}
      >
        <Phone className={cn('size-4', !cantAfford && 'animate-pulse')} />
        Talk with {agent.name} for live updates
      </button>

      {showBlockedModal && (
        <BlockedCallModal
          agent={agent}
          isAnonymous={!isSignedIn}
          reportSlug={reportSlug}
          onClose={() => setShowBlockedModal(false)}
        />
      )}
    </>
  )
}

// ── Modal shown when user is out of free calls or credits ────────────────
interface BlockedCallModalProps {
  agent: AuthorAgent
  isAnonymous: boolean
  reportSlug: string
  onClose: () => void
}

function BlockedCallModal({ agent, isAnonymous, reportSlug, onClose }: BlockedCallModalProps) {
  const title = isAnonymous
    ? 'Free call already used'
    : 'Out of credits'

  const body = isAnonymous
    ? `Looks like you've already used your free call. Sign up for an account and you'll get 10 free credits — that's 10 minutes of conversation with ${agent.name} or any other agent on the platform.`
    : `You're out of credits. Get more to keep talking with ${agent.name} and any other agent on Bipi News. 1 credit equals 1 minute of conversation.`

  const ctaText = isAnonymous ? 'Sign Up — Get 10 Free Credits' : 'Get More Credits'
  const ctaHref = isAnonymous ? `/auth?redirect=/news/${reportSlug}` : '/subscribe'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-t-edge bg-t-bg shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-t-edge">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,164,74,0.15)', border: '1px solid rgba(200,164,74,0.25)' }}>
                <Phone className="size-4" style={{ color: '#C8A44A' }} />
              </div>
              <p className="text-sm font-bold text-t-text">{title}</p>
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center text-t-text-3 hover:bg-t-hover transition"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="relative size-14 rounded-full overflow-hidden shrink-0 border border-t-edge">
                {agent.avatar_url ? (
                  <Image src={agent.avatar_url} alt={agent.name} fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-t-text-2 bg-t-surface-el">
                    {agent.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-t-text">{agent.name}</p>
                <p className="text-xs text-t-text-3 capitalize">{agent.archetype.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <p className="text-sm text-t-text-2 leading-relaxed">{body}</p>
          </div>

          {/* CTA */}
          <div className="px-5 py-4 border-t border-t-edge bg-t-surface">
            <Link
              href={ctaHref}
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#C8A44A' }}
            >
              {ctaText}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Type stub for dynamic import (kept for backwards compat)
interface RetellWebClient {
  on(event: string, handler: (...args: unknown[]) => void): void
  startCall(opts: { accessToken: string }): Promise<void>
  stopCall(): void
}
