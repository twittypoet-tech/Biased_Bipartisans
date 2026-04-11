'use client'

/**
 * AIDisclosurePopup
 *
 * Mobile-first scrollable bottom sheet (centered modal on desktop) that
 * discloses the persona-driven, declared-bias nature of Bipi News articles to
 * first-time logged-out visitors. Fires once per (article, IP).
 *
 * Trigger pipeline:
 *   1. logged-in OR auth still loading  → no-op
 *   2. localStorage flag present        → no-op (fast path, no network)
 *   3. GET /disclosure-status           → if shouldShow:false, write flag and bail
 *   4. attach scroll listener           → fire on scrollY/scrollHeight ≥ 0.25
 *   5. on first show                    → POST /disclosure-status, write flag
 *
 * Logic lives here. Visual treatment lives in ./ai-disclosure-popup/sections.
 */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth-provider'
import {
  ContinueReadingBar,
  TransitionHero,
  DisclosureBody,
  LearnMoreAgentCta,
  VoiceReporterPitch,
  FreeCallCallout,
  MethodologyFooterLink,
  type DisclosureAgent,
} from './ai-disclosure-popup/sections'

interface AIDisclosurePopupProps {
  reportSlug: string
  authorAgent?: DisclosureAgent
}

const SCROLL_THRESHOLD = 0.25

function storageKey(slug: string) {
  return `bipi_ai_disclosure_${slug}`
}

export function AIDisclosurePopup({ reportSlug, authorAgent }: AIDisclosurePopupProps) {
  const { user, isLoading } = useAuth()
  const [show, setShow] = useState(false)
  const [armed, setArmed] = useState(false)

  const hasTriggered = useRef(false)
  const hasMarked = useRef(false)

  // ── Step 1+2+3: gate, fast-path, server check, then arm scroll listener ───

  useEffect(() => {
    // Logged-in users (and not-yet-resolved auth) never see the popup.
    if (isLoading || user) return
    if (!authorAgent) return
    if (typeof window === 'undefined') return

    let cancelled = false

    // Fast-path: localStorage hit means we already showed it on this device.
    try {
      if (localStorage.getItem(storageKey(reportSlug))) return
    } catch {
      // localStorage blocked — fall through to server check.
    }

    // Server-side IP-hash check.
    fetch(`/api/news/${reportSlug}/disclosure-status`, { method: 'GET' })
      .then((res) => res.json())
      .then((data: { shouldShow?: boolean }) => {
        if (cancelled) return
        if (data?.shouldShow === false) {
          // Already seen from this IP. Cache the verdict so future visits skip
          // the network round-trip.
          try {
            localStorage.setItem(storageKey(reportSlug), '1')
          } catch {}
          return
        }
        setArmed(true)
      })
      .catch(() => {
        // Network error: fail open. We would rather show twice than never.
        if (!cancelled) setArmed(true)
      })

    return () => {
      cancelled = true
    }
  }, [reportSlug, user, isLoading, authorAgent])

  // ── Step 4: scroll listener (only attached once armed) ────────────────────

  useEffect(() => {
    if (!armed) return

    const handleScroll = () => {
      if (hasTriggered.current) return
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const pct = scrollHeight > 0 ? window.scrollY / scrollHeight : 0
      if (pct >= SCROLL_THRESHOLD) {
        hasTriggered.current = true
        setShow(true)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    // Run once in case the page is already past the threshold (short articles).
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [armed])

  // ── Step 5: on first show, mark on server + locally ──────────────────────

  useEffect(() => {
    if (!show || hasMarked.current) return
    hasMarked.current = true

    try {
      localStorage.setItem(storageKey(reportSlug), '1')
    } catch {}

    fetch(`/api/news/${reportSlug}/disclosure-status`, { method: 'POST' }).catch(
      () => {
        /* swallow — localStorage flag is the user-facing source of truth */
      },
    )
  }, [show, reportSlug])

  // ── Lock background scroll while open ────────────────────────────────────

  useEffect(() => {
    if (!show) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [show])

  const handleClose = () => setShow(false)

  if (!authorAgent) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-end justify-center md:items-center"
          aria-modal="true"
          role="dialog"
          aria-label="AI disclosure"
        >
          {/* Backdrop — clicking it closes; clicking the panel does not */}
          <div
            className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden
          />

          {/* Panel: bottom-sheet on mobile, centered modal on desktop */}
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border-t border-neutral-700 bg-neutral-900 shadow-2xl md:max-h-[88dvh] md:max-w-[560px] md:rounded-2xl md:border"
          >
            {/* Sticky escape hatch — always visible while scrolling sheet */}
            <div className="sticky top-0 z-10 rounded-t-2xl border-b border-neutral-800 bg-neutral-900/95 px-5 pb-3 pt-4 backdrop-blur">
              <ContinueReadingBar onClose={handleClose} />
            </div>

            {/* Internally scrollable body — clears mobile dock + safe area */}
            <div
              className="
                flex-1 overflow-y-auto overscroll-contain
                px-5 pt-5 sm:px-6
                pb-[calc(env(safe-area-inset-bottom,8px)+96px)]
                md:pb-8
              "
            >
              <TransitionHero agent={authorAgent} />
              <DisclosureBody agent={authorAgent} />
              <LearnMoreAgentCta agent={authorAgent} />
              <VoiceReporterPitch agent={authorAgent} />
              <FreeCallCallout agent={authorAgent} onClose={handleClose} />
              <MethodologyFooterLink />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
