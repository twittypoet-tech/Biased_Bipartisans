'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider'

export type CallState = 'idle' | 'connecting' | 'live' | 'ended' | 'error' | 'blocked'

interface AuthorAgent {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  archetype: string
  retell_call_agent_id: string | null
}

interface CallContextValue {
  callState: CallState
  agent: AuthorAgent | null
  errorMsg: string | null
  maxSeconds: number
  timeRemaining: number
  callDuration: number
  isAnonymous: boolean
  reportSlug: string | null
  startCall: (agent: AuthorAgent, reportSlug: string) => Promise<void>
  endCall: () => void
  resetCall: () => void
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be used within CallProvider')
  return ctx
}

interface RetellWebClient {
  on(event: string, handler: (...args: unknown[]) => void): void
  startCall(opts: { accessToken: string }): Promise<void>
  stopCall(): void
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { refreshProfile } = useAuth()
  const [callState, setCallState] = useState<CallState>('idle')
  const [agent, setAgent] = useState<AuthorAgent | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [maxSeconds, setMaxSeconds] = useState(300)
  const [timeRemaining, setTimeRemaining] = useState(300)
  const [callDuration, setCallDuration] = useState(0)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [callId, setCallId] = useState<string | null>(null)
  const [reportSlug, setReportSlug] = useState<string | null>(null)

  const retellClientRef = useRef<RetellWebClient | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      retellClientRef.current?.stopCall()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Countdown timer — starts when call goes live
  useEffect(() => {
    if (callState === 'live') {
      startTimeRef.current = Date.now()
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        const remaining = Math.max(0, maxSeconds - elapsed)
        setTimeRemaining(remaining)
        setCallDuration(elapsed)

        if (remaining <= 0) {
          endCallInternal()
        }
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, maxSeconds])

  const endCallInternal = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
    setCallDuration(elapsed)
    retellClientRef.current?.stopCall()
    setCallState('ended')

    if (callId && reportSlug) {
      fetch(`/api/news/${reportSlug}/end-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, durationSeconds: elapsed }),
      }).then(() => refreshProfile()).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, reportSlug])

  const startCall = useCallback(async (newAgent: AuthorAgent, slug: string) => {
    setAgent(newAgent)
    setReportSlug(slug)
    setCallState('connecting')
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/news/${slug}/call`, { method: 'POST' })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to start call' }))
        if (err.error === 'free_call_used') {
          setCallState('blocked')
          return
        }
        throw new Error(err.error ?? err.message ?? `Failed to start call (${res.status})`)
      }

      const data = await res.json() as {
        callId: string
        retellCallId: string
        accessToken: string
        maxSeconds: number
        isAnonymous: boolean
      }

      setCallId(data.retellCallId)
      setMaxSeconds(data.maxSeconds)
      setTimeRemaining(data.maxSeconds)
      setIsAnonymous(data.isAnonymous)

      const { RetellWebClient } = await import('retell-client-js-sdk')
      const client = new RetellWebClient()
      retellClientRef.current = client

      client.on('call_started', () => setCallState('live'))
      client.on('call_ended', () => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setCallDuration(elapsed)
        setCallState('ended')
        if (data.retellCallId) {
          fetch(`/api/news/${slug}/end-call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callId: data.retellCallId, durationSeconds: elapsed }),
          }).then(() => refreshProfile()).catch(() => {})
        }
      })
      client.on('error', (err: unknown) => {
        console.error('Retell call error:', err)
        setCallState('error')
        setErrorMsg('Call disconnected unexpectedly.')
      })

      await client.startCall({ accessToken: data.accessToken })
    } catch (err) {
      console.error('Call start error:', err)
      setCallState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start call')
    }
  }, [refreshProfile])

  const endCall = useCallback(() => endCallInternal(), [endCallInternal])

  const resetCall = useCallback(() => {
    setCallState('idle')
    setCallDuration(0)
    setErrorMsg(null)
  }, [])

  return (
    <CallContext.Provider
      value={{
        callState,
        agent,
        errorMsg,
        maxSeconds,
        timeRemaining,
        callDuration,
        isAnonymous,
        reportSlug,
        startCall,
        endCall,
        resetCall,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}
