'use client'

import { useEffect, useRef, useState } from 'react'
import { LANGUAGES } from '@/lib/constants'
import type { ReporterPreset } from '@bipi/db'

// Preload livekit-client on module load so it's cached before the user clicks.
// Without this, the dynamic import() during handleConnect introduces an async gap
// that breaks the browser's user-gesture chain → autoplay is silently blocked.
let livekitReady: Promise<typeof import('livekit-client')> | null = null
function preloadLiveKit() {
  if (!livekitReady) livekitReady = import('livekit-client')
  return livekitReady
}

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'idle' | 'connecting' | 'live' | 'done' | 'error'

interface AgentOption {
  id: string
  name: string
  available: boolean
}

interface CallHeroProps {
  presets: ReporterPreset[]
  agents: AgentOption[]
}

// ── Category colors ──────────────────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  'History & Politics': 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  'Statistics & Data Science': 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  'Technology & Innovation': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  'Rhetoric & Persuasion': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  'Environmental Science': 'border-green-500/30 bg-green-500/10 text-green-300',
  'Law & Jurisprudence': 'border-red-500/30 bg-red-500/10 text-red-300',
  'Medicine & Healthcare': 'border-pink-500/30 bg-pink-500/10 text-pink-300',
  'Philosophy & Ethics': 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
}
const defaultCategoryColor = 'border-neutral-600/30 bg-neutral-700/10 text-neutral-400'

// ── Component ────────────────────────────────────────────────────────────────

export function CallHero({ presets, agents }: CallHeroProps) {
  const [step, setStep]               = useState<Step>('idle')
  const [query, setQuery]             = useState('')
  const [language, setLanguage]       = useState('en-US')
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id ?? '')
  const [researchMode, setResearchMode]  = useState(false)
  const [errorMsg, setErrorMsg]       = useState('')
  const roomRef       = useRef<{ disconnect: () => void } | null>(null)
  const callIdRef     = useRef<string | null>(null)
  const wireCallIdRef = useRef<string | null>(null)
  const audioElsRef   = useRef<HTMLAudioElement[]>([])

  // Preload LiveKit on mount so import() resolves instantly on first click
  useEffect(() => { preloadLiveKit() }, [])

  // ── Audio cleanup ───────────────────────────────────────────────────────

  function attachAudio(el: HTMLAudioElement) {
    el.autoplay = true
    el.style.display = 'none'
    document.body.appendChild(el)
    audioElsRef.current.push(el)
  }

  function cleanupAudio() {
    for (const el of audioElsRef.current) {
      el.pause()
      el.srcObject = null
      el.remove()
    }
    audioElsRef.current = []
  }

  // ── Call logic (from MakeCallModal) ──────────────────────────────────────

  async function handleConnect() {
    if (!query.trim() && step === 'idle') return
    setStep('connecting')
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch('/api/reporter/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: query.trim() || 'breaking news today',
          language,
          timezone,
          researchMode,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Failed to connect')
      }
      const { publicRoomUrl, browserToken, retellUrl, reporterToken, callId, wireCallId } = await res.json()
      callIdRef.current = callId
      wireCallIdRef.current = wireCallId

      // Use preloaded module — resolves instantly so user gesture stays valid
      const { Room, RoomEvent, Track } = await preloadLiveKit()

      // Clean up any leftover audio elements from a previous call
      cleanupAudio()

      const room = new Room({ adaptiveStream: false, dynacast: false })
      roomRef.current = room

      // Resume AudioContext to satisfy autoplay policy (belt-and-suspenders).
      // LiveKit creates an AudioContext internally; some browsers suspend it
      // if the user gesture chain was broken by async operations.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = (room as any).audioContext as AudioContext | undefined
        if (ctx?.state === 'suspended') await ctx.resume()
      } catch { /* non-fatal */ }

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach()
          attachAudio(el)
          setStep('live')
        }
      })

      room.on(RoomEvent.Disconnected, () => {
        cleanupAudio()
        setStep('done')
        roomRef.current = null
      })

      if (publicRoomUrl && browserToken) {
        await room.connect(publicRoomUrl, browserToken)

        // Resume AudioContext again after connection (some browsers create it lazily)
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = (room as any).audioContext as AudioContext | undefined
          if (ctx?.state === 'suspended') await ctx.resume()
        } catch { /* non-fatal */ }

        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.audioTrackPublications.values()) {
            if (pub.track && pub.isSubscribed) {
              const el = pub.track.attach()
              attachAudio(el)
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

  function handleLeaveCall() {
    roomRef.current?.disconnect()
    roomRef.current = null
    callIdRef.current = null
    wireCallIdRef.current = null
    cleanupAudio()
    setStep('done')
  }

  function handleReset() {
    setStep('idle')
    setQuery('')
    setErrorMsg('')
  }

  function handlePresetClick(template: string) {
    setQuery(template)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleConnect()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="relative overflow-hidden bg-neutral-950 px-4 py-10 sm:py-24">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(251,191,36,0.08), transparent)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl">

        {/* ── Idle state ── */}
        {step === 'idle' && (
          <>
            {/* Header */}
            <div className="mb-5 sm:mb-8 text-center">
              <div className="mb-3 sm:mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-700/60 bg-neutral-900/70 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-neutral-400 backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                AI News Agent
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
                Make a Call
              </h1>
              <p className="mt-2 sm:mt-3 text-sm leading-relaxed text-neutral-400 sm:text-base">
                Request News Reports on any topic or try one of the suggestions below
              </p>
            </div>

            {/* Input area */}
            <div className="rounded-2xl border border-neutral-700/60 bg-neutral-900/80 p-4 backdrop-blur-sm shadow-2xl shadow-black/30">
              {/* Text input + send */}
              <div className="flex items-end gap-3">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Give me a detailed report on CIA's project Bluebird"
                  rows={2}
                  className="flex-1 resize-none rounded-xl bg-neutral-800/60 border border-neutral-700/40 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition"
                />
                <button
                  onClick={handleConnect}
                  disabled={!query.trim()}
                  className={`shrink-0 flex items-center justify-center size-11 rounded-xl transition ${
                    query.trim()
                      ? 'bg-amber-500 text-neutral-900 hover:bg-amber-400 active:scale-95'
                      : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                  }`}
                  aria-label="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>

              {/* Controls row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Language */}
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="appearance-none rounded-full border border-neutral-700/60 bg-neutral-800/60 pl-3 pr-7 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-neutral-600 transition cursor-pointer"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Agent */}
                <div className="relative">
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="appearance-none rounded-full border border-neutral-700/60 bg-neutral-800/60 pl-3 pr-7 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-neutral-600 transition cursor-pointer"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id} disabled={!a.available}>
                        {a.name}{!a.available ? ' (coming soon)' : ''}
                      </option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                {/* Research Mode */}
                <button
                  onClick={() => setResearchMode(!researchMode)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    researchMode
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      : 'border-neutral-700/60 bg-neutral-800/60 text-neutral-500 hover:text-neutral-300 hover:border-neutral-600'
                  }`}
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Research Mode
                </button>
              </div>
            </div>

            {/* Preset suggestions */}
            {presets.length > 0 && (
              <div className="mt-6 sm:mt-8">
                <p className="mb-3 sm:mb-4 text-center text-xs font-medium uppercase tracking-wider text-neutral-600">
                  Suggested Topics
                </p>

                {/* Mobile: horizontal scroll carousel */}
                <div className="sm:hidden -mx-4 px-4">
                  <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => handlePresetClick(preset.query_template)}
                        className="group snap-start shrink-0 w-[72vw] text-left rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 transition active:scale-[0.98] active:bg-neutral-900"
                      >
                        {preset.category && (
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium mb-1.5 ${categoryColors[preset.category] ?? defaultCategoryColor}`}>
                            {preset.category}
                          </span>
                        )}
                        <p className="text-sm font-medium text-neutral-300 leading-snug">
                          {preset.title}
                        </p>
                        <p className="mt-1 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                          {preset.query_template}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop: 2-column grid */}
                <div className="hidden sm:grid gap-3 sm:grid-cols-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetClick(preset.query_template)}
                      className="group text-left rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition hover:border-neutral-700 hover:bg-neutral-900"
                    >
                      {preset.category && (
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium mb-2 ${categoryColors[preset.category] ?? defaultCategoryColor}`}>
                          {preset.category}
                        </span>
                      )}
                      <p className="text-sm font-medium text-neutral-300 leading-snug group-hover:text-white transition">
                        {preset.title}
                      </p>
                      <p className="mt-1.5 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                        {preset.query_template}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Connecting state ── */}
        {step === 'connecting' && (
          <div className="flex flex-col items-center py-16 gap-5">
            <div className="size-16 rounded-full bg-neutral-900 border border-neutral-700/60 flex items-center justify-center shadow-lg shadow-black/30">
              <LoadingSpinner />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white">Connecting to The Reporter</p>
              <p className="mt-1.5 text-sm text-neutral-500">Searching the news wire...</p>
            </div>
            {query && (
              <div className="mt-2 max-w-md rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
                <p className="text-xs text-neutral-500 mb-1">Your query</p>
                <p className="text-sm text-neutral-300 line-clamp-2">{query}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Live call state ── */}
        {step === 'live' && (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="size-16 rounded-full bg-neutral-900 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <span className="text-2xl">📡</span>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">The Reporter is on air</p>
              <p className="mt-1 text-sm text-neutral-500">Report will be saved to The Wire when complete</p>
            </div>

            {query && (
              <div className="max-w-md rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
                <p className="text-xs text-neutral-500 mb-1">Reporting on</p>
                <p className="text-sm text-neutral-300">{query}</p>
              </div>
            )}

            <LiveWaveform />

            <button
              onClick={handleLeaveCall}
              className="mt-2 flex items-center gap-2 rounded-xl border border-neutral-600/60 bg-neutral-800/60 px-6 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-700/60 transition"
            >
              <PhoneOffIcon />
              Leave Call
            </button>
            <p className="text-xs text-neutral-600 text-center max-w-xs leading-relaxed">
              You can leave anytime — the full report will appear on The Wire once The Reporter finishes.
            </p>
          </div>
        )}

        {/* ── Done state ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center py-16 gap-5">
            <div className="size-16 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center">
              <CheckIcon />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">Report submitted</p>
              <p className="mt-1.5 text-sm text-neutral-400">
                Your report will appear on The Wire shortly after analysis completes.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="rounded-xl bg-neutral-800 border border-neutral-700 px-6 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition"
            >
              Make Another Call
            </button>
          </div>
        )}

        {/* ── Error state ── */}
        {step === 'error' && (
          <div className="flex flex-col items-center py-16 gap-5">
            <div className="size-16 rounded-full bg-red-950/40 border border-red-800/60 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-sm text-red-400">{errorMsg || 'Something went wrong'}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('idle')}
                className="rounded-xl bg-neutral-800 border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-700 transition"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PhoneOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/>
      <path d="M14.5 2.5a10 10 0 0 0-10 10"/>
      <line x1="2" y1="2" x2="22" y2="22"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin text-neutral-400" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

function LiveWaveform() {
  return (
    <div className="flex items-end gap-1 h-10">
      {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.65, 0.45, 0.75, 0.55, 0.85].map((h, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-amber-400 animate-pulse"
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
