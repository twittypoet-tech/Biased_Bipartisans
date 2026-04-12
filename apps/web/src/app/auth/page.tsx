'use client'

import { Suspense, useState, useRef, useEffect, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { sendOtpAction, verifyOtpAction } from './actions'
import { cn } from '@/lib/utils'

type Step = 'email' | 'code' | 'success'

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  )
}

function AuthPageInner() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError('')

    startTransition(async () => {
      const result = await sendOtpAction(email)
      if (result.ok) {
        setStep('code')
      } else {
        setError(result.error ?? 'Something went wrong.')
      }
    })
  }

  function handleVerifyCode() {
    const token = code.join('')
    if (token.length !== 6) return
    setError('')

    startTransition(async () => {
      const result = await verifyOtpAction(email, token, redirectParam)
      // verifyOtpAction calls redirect() on success and the server throws a
      // redirect — control never returns here on the happy path. If we do
      // get back a result, it's an error.
      if (result && !result.ok) {
        setError(result.error ?? 'Invalid code.')
        setCode(['', '', '', '', '', ''])
        codeRefs.current[0]?.focus()
      } else {
        // redirect() threw successfully. Show the success state briefly in
        // case the browser's redirect is slow.
        setStep('success')
      }
    })
  }

  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }

    if (value && index === 5 && newCode.every((d) => d)) {
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
      setTimeout(() => handleVerifyCode(), 100)
    }
  }

  useEffect(() => {
    if (step === 'code') codeRefs.current[0]?.focus()
  }, [step])

  const loading = isPending

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
                disabled={loading || code.some((d) => !d)}
                className={cn(
                  'w-full rounded-xl py-3 text-sm font-semibold transition',
                  loading || code.some((d) => !d)
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
                  onClick={(e) => handleSendCode(e)}
                  className="text-t-accent-text hover:underline"
                >
                  Resend code
                </button>
              </div>
            </>
          )}

          {/* ── Success step (brief flash while the 303 redirect travels) ── */}
          {step === 'success' && (
            <div className="text-center">
              <div className="size-16 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-t-text mb-2">You&apos;re in</h1>
              <p className="text-sm text-t-text-2">Redirecting...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
