'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Step = 'email' | 'code' | 'success'

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  )
}

// Only allow same-origin relative paths. Anything else (absolute URL,
// protocol-relative //evil.com, data: URL) falls back to /my. Closes an
// open-redirect hole where ?redirect=https://evil.com would bounce users
// offsite right after a successful login.
function safeRedirect(raw: string | null): string {
  if (!raw) return '/my'
  if (!raw.startsWith('/')) return '/my'
  if (raw.startsWith('//')) return '/my'
  if (raw.startsWith('/\\')) return '/my'
  return raw
}

// Hard navigation that bypasses Next.js's client router cache. Needed after
// auth because router.push races with @supabase/ssr cookie writes and
// middleware may read an empty session, redirecting back to /auth and
// leaving the UI stuck on "Redirecting...". A full page load guarantees
// the server sees the fresh cookies on a clean request.
function hardNavigate(url: string) {
  if (typeof window === 'undefined') return
  window.location.assign(url)
}

function AuthPageInner() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = safeRedirect(searchParams.get('redirect'))

  const supabase = getSupabaseBrowserClient()

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setStep('code')
    }
  }

  async function handleVerifyCode() {
    const token = code.join('')
    if (token.length !== 6) return
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    setLoading(false)
    if (err) {
      setError(err.message)
      setCode(['', '', '', '', '', ''])
      codeRefs.current[0]?.focus()
      return
    }

    setStep('success')

    // Invalidate the RSC cache so any parallel soft-nav sees the new session.
    try {
      router.refresh()
    } catch {}

    // Hard navigate after a short beat so the user sees the "You're in"
    // confirmation. window.location.assign guarantees the server middleware
    // reads the freshly-set cookies on a clean request, instead of racing
    // them against Next.js's soft nav.
    setTimeout(() => hardNavigate(redirect), 400)
  }

  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)

    // Auto-advance to next input
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newCode.every(d => d)) {
      setTimeout(() => handleVerifyCode(), 100)
    }
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      codeRefs.current[5]?.focus()
      setTimeout(() => {
        const token = pasted
        if (token.length === 6) handleVerifyCode()
      }, 100)
    }
  }

  // Auto-focus first code input
  useEffect(() => {
    if (step === 'code') codeRefs.current[0]?.focus()
  }, [step])

  return (
    <div className="min-h-screen bg-t-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-t-edge py-4 px-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-t-text">
          Bipi News
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* ── Email step ── */}
          {step === 'email' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-t-text mb-2">
                  Sign in to Bipi News
                </h1>
                <p className="text-sm text-t-text-2">
                  Enter your email. We&apos;ll send a 6-digit code. New accounts are created automatically.
                </p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-t-text-2 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                    className="w-full rounded-xl bg-t-surface border border-t-edge-strong px-4 py-3 text-sm text-t-text placeholder:text-t-text-4 focus:outline-none focus:border-t-accent transition"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className={cn(
                    'w-full rounded-xl py-3 text-sm font-semibold transition',
                    loading || !email.trim()
                      ? 'bg-t-surface-el text-t-text-4 cursor-not-allowed'
                      : 'bg-t-accent text-white hover:opacity-90 active:scale-[0.98]',
                  )}
                >
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-t-text-4">
                10 free credits on your first sign-in. No credit card required.
              </p>
            </>
          )}

          {/* ── Code verification step ── */}
          {step === 'code' && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-t-text mb-2">Check your email</h1>
                <p className="text-sm text-t-text-2">
                  We sent a 6-digit code to <span className="font-medium text-t-text">{email}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2 mb-6" onPaste={handleCodePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { codeRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className={cn(
                      'size-12 sm:size-14 rounded-xl border text-center text-xl font-bold transition',
                      'bg-t-surface text-t-text focus:outline-none focus:border-t-accent',
                      digit ? 'border-t-accent' : 'border-t-edge-strong',
                    )}
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-red-400 text-center mb-4">{error}</p>
              )}

              <button
                onClick={handleVerifyCode}
                disabled={loading || code.some(d => !d)}
                className={cn(
                  'w-full rounded-xl py-3 text-sm font-semibold transition',
                  loading || code.some(d => !d)
                    ? 'bg-t-surface-el text-t-text-4 cursor-not-allowed'
                    : 'bg-t-accent text-white hover:opacity-90 active:scale-[0.98]',
                )}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="mt-4 flex justify-center gap-4 text-xs">
                <button
                  onClick={() => { setStep('email'); setCode(['', '', '', '', '', '']); setError('') }}
                  className="text-t-text-3 hover:text-t-text-2 transition"
                >
                  Change email
                </button>
                <button
                  onClick={handleSendCode as any}
                  className="text-t-accent-text hover:underline"
                >
                  Resend code
                </button>
              </div>
            </>
          )}

          {/* ── Success step ── */}
          {step === 'success' && (
            <div className="text-center">
              <div className="size-16 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-t-text mb-2">You&apos;re in</h1>
              <p className="text-sm text-t-text-2">Redirecting...</p>
              {/* Fallback link in case the hard navigate is blocked by a
                  service worker, extension, or slow device. Also kicks off
                  the navigation again if the user lingers. */}
              <a
                href={redirect}
                className="mt-4 inline-block text-xs font-medium text-t-accent-text underline decoration-dotted underline-offset-4 hover:text-t-text transition"
              >
                Tap here if you aren&rsquo;t redirected
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
