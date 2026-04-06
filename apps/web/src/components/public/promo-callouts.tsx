'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Share2 } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

// ── Shared sponsored card wrapper ───────────────────────────────────────────

function SponsoredCard({ children, href }: { children: React.ReactNode; href?: string }) {
  const inner = (
    <div className="my-10 rounded-xl overflow-hidden" style={{ backgroundColor: '#C8A44A' }}>
      {/* Sponsored header */}
      <div className="px-4 py-1.5 flex items-center justify-between" style={{ backgroundColor: 'rgba(0,0,0,0.12)' }}>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bipi-mark.svg" alt="" className="size-4 brightness-0 invert" />
          <span className="text-[10px] font-bold tracking-tight text-white/80">Biased Bipartisans</span>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50">Sponsored</span>
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
  return inner
}

// ── Sign Up / Share CTA ─────────────────────────────────────────────────────

export function SignUpCallout() {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const shareData = {
      title: 'Biased Bipartisans — AI-Powered News Reports',
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

  if (user) {
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

  return (
    <SponsoredCard href="/auth">
      <div className="text-center">
        <p className="text-xl sm:text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Real-Time, Evidence-Based News Reports
        </p>
        <p className="text-sm text-white/70 mb-5 max-w-sm mx-auto leading-relaxed">
          Get AI-generated investigative reports on any topic, sourced and verified in real-time. Your personalized news feed starts here.
        </p>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white group-hover:underline">
          Create Free Account <ArrowRight className="size-4" />
        </span>
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
        <p className="text-2xl sm:text-3xl font-bold text-white mb-1 tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Think Further on BIPI.
        </p>
        <p className="text-base sm:text-lg text-white/80 mb-5" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Where seeking the truth is a journey, not a destination.
        </p>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white group-hover:underline">
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
              <img src="/bipi-mark.svg" alt="" className="size-4 brightness-0 invert" />
              <span className="text-[10px] font-bold tracking-tight text-white/80">Biased Bipartisans</span>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50">Sponsored</span>
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
