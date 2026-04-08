'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Phone } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'

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

type CallState = 'idle' | 'connecting' | 'live' | 'ended' | 'error'

const CALL_CREDIT_COST = 5

export function CallReporterCta({ agent, reportSlug }: CallReporterCtaProps) {
  const { user, profile } = useAuth()
  const [callState, setCallState] = useState<CallState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const retellClientRef = useRef<RetellWebClient | null>(null)

  useEffect(() => {
    return () => { retellClientRef.current?.stopCall() }
  }, [])

  const startCall = useCallback(async () => {
    setCallState('connecting')
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/news/${reportSlug}/call`, { method: 'POST' })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to start call' }))
        throw new Error(err.error ?? `Failed to start call (${res.status})`)
      }

      const { accessToken } = await res.json() as { callId: string; retellUrl: string; accessToken: string }

      const { RetellWebClient } = await import('retell-client-js-sdk')
      const client = new RetellWebClient()
      retellClientRef.current = client

      client.on('call_started', () => setCallState('live'))
      client.on('call_ended', () => setCallState('ended'))
      client.on('error', (err: unknown) => {
        console.error('Retell call error:', err)
        setCallState('error')
        setErrorMsg('Call disconnected unexpectedly.')
      })

      await client.startCall({ accessToken })
    } catch (err) {
      console.error('Call start error:', err)
      setCallState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start call')
    }
  }, [reportSlug])

  const endCall = useCallback(() => {
    retellClientRef.current?.stopCall()
    setCallState('ended')
  }, [])

  if (!agent.retell_call_agent_id) return null

  const isSignedIn = !!user
  const hasCredits = (profile?.credits ?? 0) >= CALL_CREDIT_COST

  return (
    <div className="my-10 relative overflow-hidden rounded-xl border border-t-accent/30 bg-gradient-to-r from-t-accent-soft to-transparent p-5 sm:p-6">

      {/* ── Idle: Show CTA based on auth state ── */}
      {callState === 'idle' && (
        <div className="relative z-10 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
          {/* Agent avatar */}
          <div className="relative size-14 rounded-full overflow-hidden shrink-0 border-2 border-t-accent/40">
            {agent.avatar_url ? (
              <Image src={agent.avatar_url} alt={agent.name} fill className="object-cover" sizes="56px" />
            ) : (
              <div className="size-14 rounded-full bg-t-surface-el flex items-center justify-center text-xl font-bold text-t-text-2">
                {agent.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <p className="text-base font-semibold text-t-text">Talk to {agent.name} about this story</p>
            <p className="mt-1 text-sm text-t-text-2">
              Have questions? Call {agent.name} for a live, one-on-one conversation.
            </p>
          </div>

          {/* Action button — changes based on auth/credit state */}
          {!isSignedIn ? (
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-t-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition shrink-0"
            >
              Sign in to call
            </Link>
          ) : !hasCredits ? (
            <div className="flex flex-col items-center sm:items-end gap-1.5 shrink-0">
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-2 rounded-xl bg-t-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition"
              >
                Get Credits
              </Link>
              <p className="text-[11px] text-t-text-4">
                {CALL_CREDIT_COST} credits per call ({profile?.credits ?? 0} remaining)
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center sm:items-end gap-1.5 shrink-0">
              <button
                onClick={startCall}
                className="inline-flex items-center gap-2 rounded-xl bg-t-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition"
              >
                <Phone className="size-4" />
                Call Now
              </button>
              <p className="text-[11px] text-t-text-4">
                {CALL_CREDIT_COST} credits ({profile?.credits ?? 0} remaining)
              </p>
            </div>
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

      {/* ── Live call ── */}
      {callState === 'live' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="size-3 rounded-full bg-green-500 animate-pulse" />
              <div className="absolute inset-0 size-3 rounded-full bg-green-400 animate-ping opacity-75" />
            </div>
            <p className="text-sm font-semibold text-green-400">Live with {agent.name}</p>
          </div>

          {/* Waveform */}
          <div className="flex items-end gap-1 h-10">
            {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.65, 0.45, 0.75, 0.55, 0.85].map((h, i) => (
              <div key={i} className="w-1.5 rounded-full bg-amber-400 animate-pulse"
                style={{ height: `${h * 100}%`, animationDelay: `${i * 70}ms`, animationDuration: '900ms' }} />
            ))}
          </div>

          <button onClick={endCall}
            className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98]">
            End Call
          </button>
        </div>
      )}

      {/* ── Call ended ── */}
      {callState === 'ended' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="size-12 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <p className="text-sm font-semibold text-t-text">Call ended</p>
          <button onClick={() => setCallState('idle')} className="text-sm text-t-accent-text hover:underline transition">
            Call again
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {callState === 'error' && (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="size-12 rounded-full bg-red-950/40 border border-red-800/60 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          </div>
          <p className="text-sm text-red-400 text-center">{errorMsg ?? 'Something went wrong.'}</p>
          <button onClick={() => setCallState('idle')} className="text-sm text-t-accent-text hover:underline transition">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// Type stub for dynamic import
interface RetellWebClient {
  on(event: string, handler: (...args: unknown[]) => void): void
  startCall(opts: { accessToken: string }): Promise<void>
  stopCall(): void
}
