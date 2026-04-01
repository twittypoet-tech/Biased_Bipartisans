'use client'

import { useRef, useState } from 'react'

const LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'ja-JP', label: '日本語' },
  { code: 'zh-CN', label: '中文' },
  { code: 'ar-SA', label: 'العربية' },
]

type Step = 'form' | 'connecting' | 'live' | 'done' | 'error'

interface MakeCallModalProps {
  onClose: () => void
}

export function MakeCallModal({ onClose }: MakeCallModalProps) {
  const [step, setStep]       = useState<Step>('form')
  const [query, setQuery]     = useState('')
  const [language, setLanguage] = useState('en-US')
  const [errorMsg, setErrorMsg] = useState('')
  const roomRef       = useRef<{ disconnect: () => void } | null>(null)
  const callIdRef     = useRef<string | null>(null)
  const wireCallIdRef = useRef<string | null>(null)

  async function handleConnect() {
    setStep('connecting')
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch('/api/reporter/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: query.trim(), language, timezone }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Failed to connect')
      }
      const { publicRoomUrl, browserToken, retellUrl, reporterToken, callId, wireCallId } = await res.json()
      callIdRef.current = callId
      wireCallIdRef.current = wireCallId

      const { Room, RoomEvent, Track } = await import('livekit-client')
      const room = new Room({ adaptiveStream: false, dynacast: false })
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach()
          el.autoplay = true
          el.style.display = 'none'
          document.body.appendChild(el)
          setStep('live')
        }
      })

      room.on(RoomEvent.Disconnected, () => {
        setStep('done')
        roomRef.current = null
      })

      // If relay is active, connect to public LiveKit room (hears Wire + Reporter).
      // Fallback: connect directly to Reporter's Retell room (no Wire greeting).
      if (publicRoomUrl && browserToken) {
        await room.connect(publicRoomUrl, browserToken)
        // Attach any tracks already published before we subscribed
        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.audioTrackPublications.values()) {
            if (pub.track && pub.isSubscribed) {
              const el = pub.track.attach()
              el.autoplay = true
              el.style.display = 'none'
              document.body.appendChild(el)
              setStep('live')
            }
          }
        }
      } else if (reporterToken) {
        await room.connect(retellUrl, reporterToken)
      }

      // Safety timeout: 10 min max
      setTimeout(() => room.disconnect(), 10 * 60 * 1000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStep('error')
    }
  }

  function handleEndCall() {
    roomRef.current?.disconnect()
    roomRef.current = null
    // End BOTH Retell calls so the relay stops and post-call analysis triggers
    const callIds = [callIdRef.current, wireCallIdRef.current].filter(Boolean)
    for (const id of callIds) {
      fetch('/api/reporter/end-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: id }),
      }).catch(() => {})
    }
    callIdRef.current = null
    wireCallIdRef.current = null
    setStep('done')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={step === 'live' ? undefined : onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-neutral-900 border border-neutral-700/60 shadow-2xl p-6 mx-4 mb-0 sm:mb-0">

        {/* ── Form step ── */}
        {step === 'form' && (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">Call The Reporter</h2>
                <p className="mt-0.5 text-xs text-neutral-400">Ask for a live sourced news report on any topic</p>
              </div>
              <button
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-300 transition p-1 -mr-1 -mt-1"
                aria-label="Close"
              >
                <XIcon />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  What would you like a report on?
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  placeholder="e.g. Iran diplomacy, climate summit, AI regulation…"
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
                  autoFocus
                />
                <p className="mt-1.5 text-[11px] text-neutral-600">
                  Leave blank for today&apos;s top breaking news
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-500 transition"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-white text-neutral-900 px-4 py-2.5 text-sm font-semibold hover:bg-neutral-200 active:scale-[0.98] transition"
              >
                <MicIcon />
                Connect to The Reporter
              </button>
            </div>
          </>
        )}

        {/* ── Connecting step ── */}
        {step === 'connecting' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="size-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center">
              <LoadingSpinner />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Connecting to The Reporter…</p>
              <p className="mt-1 text-xs text-neutral-500">Searching the news wire</p>
            </div>
          </div>
        )}

        {/* ── Live call step ── */}
        {step === 'live' && (
          <div className="flex flex-col items-center py-6 gap-5">
            <div className="size-14 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center">
              <span className="text-xl">📡</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">The Reporter is on air</p>
              <p className="mt-0.5 text-xs text-neutral-500">Report will be saved to The Wire when the call ends</p>
            </div>
            <LiveWaveform />
            <button
              onClick={handleEndCall}
              className="mt-2 flex items-center gap-2 rounded-lg border border-red-700/60 bg-red-950/40 px-5 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/60 transition"
            >
              <PhoneOffIcon />
              End Call
            </button>
          </div>
        )}

        {/* ── Done step ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="size-12 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center">
              <CheckIcon />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Report submitted</p>
              <p className="mt-1 text-xs text-neutral-400">
                Your report will appear on The Wire shortly after analysis completes.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-neutral-800 border border-neutral-700 px-5 py-2 text-sm text-neutral-300 hover:bg-neutral-700 transition"
            >
              Close
            </button>
          </div>
        )}

        {/* ── Error step ── */}
        {step === 'error' && (
          <div className="flex flex-col items-center py-6 gap-4">
            <p className="text-sm text-red-400">{errorMsg || 'Something went wrong'}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('form')}
                className="rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700 transition"
              >
                Try again
              </button>
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}

function PhoneOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/>
      <path d="M14.5 2.5a10 10 0 0 0-10 10"/>
      <line x1="2" y1="2" x2="22" y2="22"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin text-neutral-400" width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

function LiveWaveform() {
  return (
    <div className="flex items-end gap-1 h-8">
      {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.65, 0.45, 0.75].map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-amber-400 animate-pulse"
          style={{
            height: `${h * 100}%`,
            animationDelay: `${i * 70}ms`,
            animationDuration: '900ms',
          }}
        />
      ))}
    </div>
  )
}
