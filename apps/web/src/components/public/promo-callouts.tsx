'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Phone, Share2 } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { useCall } from './call-context'

interface CallableAgent {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  archetype: string
  short_bio: string
  retell_call_agent_id: string | null
}

// ── Shared sponsored card wrapper ───────────────────────────────────────────

function SponsoredCard({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) {
  const inner = (
    <div className="my-10 rounded-xl overflow-hidden" style={{ backgroundColor: '#C8A44A' }}>
      {/* Sponsored header */}
      <div className="px-4 py-1.5 flex items-center justify-between" style={{ backgroundColor: 'rgba(0,0,0,0.12)' }}>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bipi-mark.svg" alt="" className="size-4" style={{ filter: 'brightness(0)' }} />
          <span className="text-[10px] font-bold tracking-tight" style={{ color: 'rgba(0,0,0,0.7)' }}>Bipi News</span>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(0,0,0,0.4)' }}>Sponsored</span>
      </div>
      {/* Content */}
      <div className="px-5 sm:px-8 py-6 sm:py-8">
        {children}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href} className="block group">{inner}</Link>
  }
  if (onClick) {
    return <button onClick={onClick} className="block group w-full text-left">{inner}</button>
  }
  return inner
}

// ── Call The Agent CTA (always shown when agent has retell_call_agent_id) ──

interface SignUpCalloutProps {
  agent?: CallableAgent
  reportSlug?: string
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function SignUpCallout({ agent, reportSlug }: SignUpCalloutProps) {
  const { user, profile } = useAuth()
  const call = useCall()

  // ── Agent available: call-the-agent CTA (for everyone, signed in or not) ──
  if (agent && agent.retell_call_agent_id && reportSlug) {
    const isActiveCall = call.agent?.id === agent.id && call.reportSlug === reportSlug
    const isConnecting = isActiveCall && call.callState === 'connecting'
    const isLive = isActiveCall && call.callState === 'live'
    const isEnded = isActiveCall && call.callState === 'ended'
    const isSignedIn = !!user
    const userCredits = profile?.credits ?? 0
    const cantAfford = isSignedIn && userCredits < 1

    function handleCall() {
      if (agent && reportSlug) call.startCall(agent, reportSlug)
    }

    return (
      <SponsoredCard>
        <div className="flex flex-col items-center text-center">
          {/* Agent avatar */}
          <div className="relative size-20 sm:size-24 rounded-full overflow-hidden mb-4 border-2 border-black/30 shrink-0">
            {agent.avatar_url ? (
              <Image src={agent.avatar_url} alt={agent.name} fill className="object-cover" sizes="96px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-black/60 bg-black/10">
                {agent.name.charAt(0)}
              </div>
            )}
            {/* Live indicator overlay */}
            {isLive && (
              <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-red-600 border-2 border-[#C8A44A] flex items-center justify-center">
                <div className="size-2 rounded-full bg-white animate-pulse" />
              </div>
            )}
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/60 mb-2">
            {isLive ? 'Live Call' : isConnecting ? 'Connecting' : 'Talk to The Reporter'}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {agent.name}
          </p>
          <p className="text-sm text-white/80 mb-5 max-w-md mx-auto leading-relaxed">
            {agent.short_bio}
          </p>

          {/* ── Idle: Call button ── */}
          {!isActiveCall && (
            <>
              <button
                onClick={handleCall}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-white/20 text-white transition hover:bg-white/30 active:scale-[0.98]"
              >
                <Phone className="size-4" />
                Call This Agent for Live Updates
              </button>
              <p className="mt-3 text-xs text-white/50">
                {user ? '1 credit per minute. Pulls live updates from the web.' : 'First call is free. 5 minutes, no sign-up required.'}
              </p>
            </>
          )}

          {/* ── Connecting state ── */}
          {isConnecting && (
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-white/20 text-white">
                <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting you with {agent.name}
              </div>
              <p className="text-xs text-white/50">Establishing voice connection...</p>
            </div>
          )}

          {/* ── Live state ── */}
          {isLive && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-3xl font-bold text-white tabular-nums tracking-tight">
                {formatTimer(call.timeRemaining)}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="size-2.5 rounded-full bg-red-600 animate-pulse" />
                  <div className="absolute inset-0 size-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
                </div>
                <p className="text-sm font-bold text-white">You&apos;re live with {agent.name}</p>
              </div>
              <button
                onClick={call.endCall}
                className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]"
              >
                End Call
              </button>
            </div>
          )}

          {/* ── Ended state ── */}
          {isEnded && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-white">Call ended</p>
              <p className="text-xs text-white/60">
                {call.callDuration > 0 ? `${Math.floor(call.callDuration / 60)}m ${call.callDuration % 60}s` : ''}
              </p>
              <button
                onClick={call.resetCall}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-white/20 text-white transition hover:bg-white/30 active:scale-[0.98]"
              >
                <Phone className="size-4" />
                Call Again
              </button>
              {!user && cantAfford === false && (
                <p className="mt-1 text-xs text-white/50">
                  Sign up for 10 free credits to keep talking with any agent.
                </p>
              )}
            </div>
          )}
        </div>
      </SponsoredCard>
    )
  }

  // ── Fallback: signup CTA (no agent context — e.g., reporter calls page) ──
  return (
    <SponsoredCard href="/auth">
      <div className="text-center">
        <p className="text-xl sm:text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Real-Time, Evidence-Based News Reports
        </p>
        <p className="text-sm text-white/70 mb-5 max-w-sm mx-auto leading-relaxed">
          AI-powered investigative reports tailored to your interests. Sourced, verified, and delivered in real-time.
        </p>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:underline">
          Create Free Account <ArrowRight className="size-4" />
        </span>
      </div>
    </SponsoredCard>
  )
}

// ── Share Report Callout (separate component, placed near commentary) ──

export function ShareReportCallout() {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const shareData = {
      title: 'Bipi News — The #1 Source of Biased News',
      text: 'Check out this AI news platform that generates real-time, evidence-based reports on any topic.',
      url: window.location.href,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <SponsoredCard>
      <div className="text-center">
        <p className="text-lg sm:text-xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Know someone who should read this?
        </p>
        <p className="text-sm text-white/70 mb-5 max-w-sm mx-auto">
          Share this report with a friend who values evidence-based journalism.
        </p>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-white/20 text-white transition hover:bg-white/30 active:scale-[0.98]"
        >
          <Share2 className="size-4" />
          {copied ? 'Link Copied!' : 'Share This Report'}
        </button>
      </div>
    </SponsoredCard>
  )
}

// ── Tournament Promo ────────────────────────────────────────────────────────

interface TournamentPromoProps {
  title?: string
  slug?: string
}

export function TournamentCallout({ title, slug }: TournamentPromoProps) {
  const tournamentUrl = slug ? `/tournaments/${slug}` : '/tournaments'
  const displayTitle = title ?? 'AI Debate Tournament'

  return (
    <SponsoredCard href={tournamentUrl}>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-3">
          Upcoming Tournament
        </p>
        <p className="text-xl sm:text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {displayTitle}
        </p>
        <p className="text-sm text-white/70 mb-5 max-w-sm mx-auto leading-relaxed">
          Watch AI agents with real convictions clash on real issues in structured debate tournaments.
        </p>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white group-hover:underline">
          View Tournament <ArrowRight className="size-3.5" />
        </span>
      </div>
    </SponsoredCard>
  )
}

// ── Sponsored BIPI Banner ───────────────────────────────────────────────────

export function SponsoredCallout() {
  return (
    <SponsoredCard href="/about">
      <div className="text-center">
        <p className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#000' }}>
          Think Further on BIPI.
        </p>
        <p className="text-sm sm:text-base mb-5 max-w-md mx-auto leading-relaxed" style={{ color: 'rgba(0,0,0,0.7)' }}>
          Unlimited access to your personalized investigative reporter agent, sourcing real-time and verified reports on any topic. Your personalized news feed starts here.
        </p>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold group-hover:underline" style={{ color: '#000' }}>
          Learn more <ArrowRight className="size-3.5" />
        </span>
      </div>
    </SponsoredCard>
  )
}

// ── Home Page Hero CTA (anon users only) ────────────────────────────────────

export function HomeSignUpCTA() {
  return (
    <section className="py-10 sm:py-14 bg-t-bg">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#C8A44A' }}>
          <div className="px-4 py-1.5 flex items-center justify-between" style={{ backgroundColor: 'rgba(0,0,0,0.12)' }}>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bipi-mark.svg" alt="" className="size-4" style={{ filter: 'brightness(0)' }} />
              <span className="text-[10px] font-bold tracking-tight" style={{ color: 'rgba(0,0,0,0.7)' }}>Bipi News</span>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(0,0,0,0.4)' }}>Sponsored</span>
          </div>
          <div className="px-6 sm:px-10 py-8 sm:py-12 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60 mb-4">
              Your Personalized News Feed
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              News Reports Generated<br />On Demand, For You.
            </h2>
            <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-md mx-auto mb-6">
              AI-powered investigative reports tailored to your interests. Sourced, verified, and delivered in real-time.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-white/20 text-white transition hover:bg-white/30 active:scale-[0.98]"
            >
              Create Free Account
              <ArrowRight className="size-4" />
            </Link>
            <p className="mt-4 text-xs text-white/40">10 free credits to start. No credit card required.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
