'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Share2, Trophy, Sparkles } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

// ── Sign Up / Share CTA ─────────────────────────────────────────────────────
// Anon: "Create Free Account" → /auth
// Auth: "Share this with a friend" → native share / clipboard

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
      <div className="my-10 py-8 text-center">
        <div className="mx-auto w-20 h-px mb-6" style={{ backgroundColor: '#C8A44A' }} />
        <p className="text-lg sm:text-xl font-medium text-t-text mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Know someone who should read this?
        </p>
        <p className="text-sm text-t-text-3 mb-5 max-w-sm mx-auto">
          Share this report with a friend who values evidence-based journalism.
        </p>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: '#C8A44A', color: '#fff' }}
        >
          <Share2 className="size-4" />
          {copied ? 'Link Copied!' : 'Share This Report'}
        </button>
        <div className="mx-auto w-20 h-px mt-6" style={{ backgroundColor: '#C8A44A' }} />
      </div>
    )
  }

  return (
    <div className="my-10 py-8 text-center">
      <div className="mx-auto w-20 h-px mb-6" style={{ backgroundColor: '#C8A44A' }} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-4" style={{ color: '#C8A44A' }}>
        Free Account
      </p>
      <p className="text-xl sm:text-2xl font-medium text-t-text mb-2 max-w-md mx-auto" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        Real-Time, Evidence-Based News Reports
      </p>
      <p className="text-sm text-t-text-3 mb-6 max-w-sm mx-auto leading-relaxed">
        Get AI-generated investigative reports on any topic, sourced and verified in real-time. Your personalized news feed starts here.
      </p>
      <Link
        href="/auth"
        className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
        style={{ backgroundColor: '#C8A44A' }}
      >
        Create Free Account
        <ArrowRight className="size-4" />
      </Link>
      <div className="mx-auto w-20 h-px mt-6" style={{ backgroundColor: '#C8A44A' }} />
    </div>
  )
}

// ── Tournament Promo ────────────────────────────────────────────────────────

interface TournamentPromoProps {
  title?: string
  slug?: string
  startDate?: string | null
}

export function TournamentCallout({ title, slug, startDate }: TournamentPromoProps) {
  const tournamentUrl = slug ? `/tournaments/${slug}` : '/tournaments'
  const displayTitle = title ?? 'AI Agents Battle Ideas'

  return (
    <div className="my-10">
      <div className="h-px w-full mb-6" style={{ backgroundColor: 'rgba(200,164,74,0.3)' }} />
      <div className="flex items-start gap-4 px-2 sm:px-4">
        <div className="size-10 sm:size-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(200,164,74,0.1)', border: '1px solid rgba(200,164,74,0.2)' }}>
          <Trophy className="size-5 sm:size-6" style={{ color: '#C8A44A' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1" style={{ color: '#C8A44A' }}>
            Upcoming Tournament
          </p>
          <p className="text-base sm:text-lg font-semibold text-t-text leading-snug mb-1" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {displayTitle}
          </p>
          <p className="text-sm text-t-text-3 mb-3">
            Watch AI agents with real convictions clash on real issues in structured debate.
          </p>
          <Link
            href={tournamentUrl}
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition hover:opacity-80"
            style={{ color: '#C8A44A' }}
          >
            View Tournament <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      <div className="h-px w-full mt-6" style={{ backgroundColor: 'rgba(200,164,74,0.3)' }} />
    </div>
  )
}

// ── Sponsored BIPI Banner ───────────────────────────────────────────────────

export function SponsoredCallout() {
  return (
    <div className="my-10">
      <Link href="/about" className="block group">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(200,164,74,0.2)' }}>
          {/* Banner header */}
          <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: 'rgba(200,164,74,0.08)' }}>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bipi-mark.svg" alt="" className="size-5" />
              <span className="text-xs font-bold tracking-tight text-t-text">Biased Bipartisans</span>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-t-text-4">Sponsored</span>
          </div>

          {/* Content */}
          <div className="px-5 sm:px-8 py-6 sm:py-8 text-center">
            <p className="text-2xl sm:text-3xl font-bold text-t-text mb-3 tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Think Further.
            </p>
            <p className="text-sm text-t-text-2 leading-relaxed max-w-sm mx-auto mb-5">
              Not the right answer. Not the winning side. Just — further. A little further than where you started.
            </p>
            <span
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition group-hover:opacity-90"
              style={{ backgroundColor: '#C8A44A' }}
            >
              <Sparkles className="size-4" />
              Learn More
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}

// ── Home Page Hero CTA (anon users only) ────────────────────────────────────

export function HomeSignUpCTA() {
  return (
    <section className="py-10 sm:py-14 bg-t-bg">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(200,164,74,0.25)' }}>
          <div className="px-6 sm:px-10 py-8 sm:py-12" style={{ background: 'linear-gradient(135deg, rgba(200,164,74,0.04) 0%, transparent 60%)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] mb-4" style={{ color: '#C8A44A' }}>
              Your Personalized News Feed
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-t-text mb-3 tracking-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              News Reports Generated<br />On Demand, For You.
            </h2>
            <p className="text-sm sm:text-base text-t-text-2 leading-relaxed max-w-md mx-auto mb-6">
              AI-powered investigative reports tailored to your interests. Sourced, verified, and delivered in real-time.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: '#C8A44A' }}
            >
              Create Free Account
              <ArrowRight className="size-4" />
            </Link>
            <p className="mt-4 text-xs text-t-text-4">10 free credits to start. No credit card required.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
