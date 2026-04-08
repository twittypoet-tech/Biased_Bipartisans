'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, ArrowRight, RotateCcw, Mail } from 'lucide-react'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthorAgent {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  archetype: string
  short_bio: string
}

interface NewsletterPopupProps {
  reportId: string
  reportSlug: string
  authorAgent?: AuthorAgent
}

type Step = 'signup' | 'verify' | 'done'

// ── Session ID ────────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem('bipi_sid')
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem('bipi_sid', sid)
  }
  return sid
}

// ── Analytics helper ──────────────────────────────────────────────────────────

function logEvent(
  eventType: string,
  opts: { reportId?: string; agentId?: string; email?: string },
) {
  fetch('/api/newsletter/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reportId: opts.reportId,
      agentId: opts.agentId,
      eventType,
      sessionId: getSessionId(),
      email: opts.email,
    }),
  }).catch(() => {})
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NewsletterPopup({ reportId, reportSlug, authorAgent }: NewsletterPopupProps) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState<Step>('signup')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const hasTriggered = useRef(false)
  const hasReached70 = useRef(false)
  const impressionLogged = useRef(false)
  const dismissed = useRef(false)

  // ── Scroll trigger: 70% down + scroll back up ──────────────────────────────

  useEffect(() => {
    // Don't show if already subscribed this session
    if (sessionStorage.getItem(`bipi_nl_${reportSlug}`)) return

    let lastScrollY = window.scrollY

    const handleScroll = () => {
      if (hasTriggered.current || dismissed.current) return

      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      const pct = scrollHeight > 0 ? window.scrollY / scrollHeight : 0

      if (pct >= 0.7) {
        hasReached70.current = true
      }

      // Trigger on scroll-up after reaching 70%
      if (hasReached70.current && window.scrollY < lastScrollY - 40) {
        hasTriggered.current = true
        setShow(true)
      }

      lastScrollY = window.scrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [reportSlug])

  // ── Log impression when popup shows ────────────────────────────────────────

  useEffect(() => {
    if (show && !impressionLogged.current) {
      impressionLogged.current = true
      logEvent('impression', { reportId, agentId: authorAgent?.id })
    }
  }, [show, reportId, authorAgent?.id])

  // ── Resend cooldown timer ──────────────────────────────────────────────────

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDismiss = useCallback(() => {
    setShow(false)
    dismissed.current = true
    logEvent('dismissed', { reportId, agentId: authorAgent?.id })
  }, [reportId, authorAgent?.id])

  const handleSubscribe = async () => {
    if (!email || !agreed || !authorAgent) return
    setLoading(true)
    setError('')

    logEvent('signup_clicked', { reportId, agentId: authorAgent.id, email })

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          agentId: authorAgent.id,
          sourceSlug: reportSlug,
          sessionId: getSessionId(),
        }),
      })
      const data = await res.json()

      if (data.status === 'already_verified') {
        setStep('done')
        sessionStorage.setItem(`bipi_nl_${reportSlug}`, '1')
      } else if (data.status === 'token_sent') {
        setStep('verify')
        setResendCooldown(60)
      } else {
        setError(data.error ?? 'Something went wrong')
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!token || token.length !== 6 || !authorAgent) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/newsletter/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          agentId: authorAgent.id,
          token,
          sessionId: getSessionId(),
        }),
      })
      const data = await res.json()

      if (data.status === 'verified' || data.status === 'already_verified') {
        setStep('done')
        sessionStorage.setItem(`bipi_nl_${reportSlug}`, '1')
      } else {
        setError(data.error ?? 'Invalid code')
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || !authorAgent) return
    logEvent('resend_requested', { reportId, agentId: authorAgent.id, email })
    setResendCooldown(60)
    setError('')

    try {
      await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          agentId: authorAgent.id,
          sourceSlug: reportSlug,
          sessionId: getSessionId(),
        }),
      })
    } catch {}
  }

  if (!authorAgent) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleDismiss() }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm" />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl border border-neutral-700/60 bg-neutral-900 shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 z-20 rounded-full p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>

            {/* ── Gold accent bar ── */}
            <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />

            <div className="px-6 pt-6 pb-7">

              {/* ── Logo + Header ── */}
              <div className="text-center mb-5">
                <Image
                  src="/bipi-mark.svg"
                  alt="BiPi"
                  width={36}
                  height={36}
                  className="mx-auto mb-3 invert"
                />
                <h2
                  className="text-[22px] font-bold text-neutral-100 leading-tight mb-1.5"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {step === 'done' ? "You're In" : 'Get the Full Story'}
                </h2>
                <p className="text-[13px] text-neutral-400 tracking-wide">
                  The #1 source for biased news
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Honest about bias, serious about evidence
                </p>
              </div>

              {/* ── Agent card ── */}
              {step !== 'done' && (
                <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-800/40 p-3.5 mb-5">
                  <div className="relative size-10 rounded-full overflow-hidden shrink-0 border border-neutral-700">
                    {authorAgent.avatar_url ? (
                      <Image
                        src={authorAgent.avatar_url}
                        alt={authorAgent.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-300">
                        {authorAgent.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-200">{authorAgent.name}</p>
                    <p className="text-[11px] text-neutral-500 capitalize mb-1">{authorAgent.archetype.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">{authorAgent.short_bio}</p>
                  </div>
                </div>
              )}

              {/* ── Step: Signup ── */}
              {step === 'signup' && (
                <div className="space-y-3.5">
                  <div>
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && agreed) handleSubscribe() }}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 size-4 rounded border-neutral-600 bg-neutral-800 text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-[11px] text-neutral-500 leading-relaxed group-hover:text-neutral-400 transition">
                      By checking this box, you agree to BiPi&apos;s{' '}
                      <a href="/terms" className="underline hover:text-neutral-300">Terms of Use</a>{' '}
                      and acknowledge that BiPi may collect and use your data pursuant to our{' '}
                      <a href="/privacy" className="underline hover:text-neutral-300">Privacy Policy</a>.
                    </span>
                  </label>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <button
                    onClick={handleSubscribe}
                    disabled={!email || !agreed || loading}
                    className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="size-4 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        Sign up for free
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── Step: Verify ── */}
              {step === 'verify' && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2 rounded-lg border border-neutral-700/60 bg-neutral-800/30 px-3 py-2.5">
                    <Mail className="size-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-neutral-400">
                      We sent a 6-digit code to <span className="text-neutral-200 font-medium">{email}</span>
                    </p>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={token}
                    onChange={(e) => { setToken(e.target.value.replace(/\D/g, '')); setError('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleVerify() }}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-4 py-3 text-center text-lg font-mono tracking-[0.3em] text-neutral-100 placeholder:text-neutral-500 placeholder:tracking-normal placeholder:text-sm placeholder:font-sans focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
                  />

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <button
                    onClick={handleVerify}
                    disabled={token.length !== 6 || loading}
                    className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="size-4 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        Verify
                        <Check className="size-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => { setStep('signup'); setToken(''); setError('') }}
                      className="text-neutral-500 hover:text-neutral-300 transition"
                    >
                      Change email
                    </button>
                    <button
                      onClick={handleResend}
                      disabled={resendCooldown > 0}
                      className="flex items-center gap-1 text-neutral-500 hover:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <RotateCcw className="size-3" />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step: Done ── */}
              {step === 'done' && (
                <div className="text-center py-2">
                  <div className="size-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                    <Check className="size-7 text-emerald-400" />
                  </div>
                  <p className="text-sm text-neutral-300 mb-1">
                    You&apos;re subscribed to <span className="font-semibold text-neutral-100">{authorAgent.name}</span>
                  </p>
                  <p className="text-xs text-neutral-500 mb-5">
                    Fresh analysis delivered to your inbox.
                  </p>
                  <button
                    onClick={handleDismiss}
                    className="rounded-lg border border-neutral-700 px-6 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition"
                  >
                    Back to article
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
