'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, X, Search, Phone, Globe, Zap, LogIn, Coins } from 'lucide-react'
import { LANGUAGES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/auth-provider'
import { TopUpModal } from '@/components/top-up-modal'
import type { ReporterPreset } from '@bipi/db'

// ── LiveKit preload ──────────────────────────────────────────────────────────

let livekitReady: Promise<typeof import('livekit-client')> | null = null
function preloadLiveKit() {
  if (!livekitReady) livekitReady = import('livekit-client')
  return livekitReady
}

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 'idle' | 'connecting' | 'live' | 'done' | 'error'
type Sheet = null | 'options' | 'language'

interface AgentOption {
  id: string
  name: string
  avatarUrl: string | null
  available: boolean
  shortBio?: string
}

interface UserPresetOption {
  id: string
  title: string
  query_template: string
  interest: string | null
  sort_order: number
}

interface CallHeroProps {
  presets: ReporterPreset[]
  agents: AgentOption[]
  userPresets?: UserPresetOption[]
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
const defaultCategoryColor = 'border-t-badge-border bg-t-badge text-t-text-2'

const INTEREST_COLORS = [
  'border-rose-500/30 bg-rose-500/10 text-rose-300',
  'border-sky-500/30 bg-sky-500/10 text-sky-300',
  'border-violet-500/30 bg-violet-500/10 text-violet-300',
  'border-teal-500/30 bg-teal-500/10 text-teal-300',
  'border-orange-500/30 bg-orange-500/10 text-orange-300',
  'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
  'border-lime-500/30 bg-lime-500/10 text-lime-300',
]
function interestColor(interest: string): string {
  let hash = 0
  for (let i = 0; i < interest.length; i++) hash = ((hash << 5) - hash + interest.charCodeAt(i)) | 0
  return INTEREST_COLORS[Math.abs(hash) % INTEREST_COLORS.length]!
}

// ── Main component ───────────────────────────────────────────────────────────

export function CallHero({ presets, agents, userPresets = [] }: CallHeroProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [step, setStep] = useState<Step>('idle')
  const [query, setQuery] = useState('')
  const [presetTab, setPresetTab] = useState<'suggested' | 'recommended'>('suggested')
  const [language, setLanguage] = useState('en-US')
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id ?? '')
  const [researchMode, setResearchMode] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeSheet, setActiveSheet] = useState<Sheet>(null)
  const [showTopUp, setShowTopUp] = useState(false)
  const [langSearch, setLangSearch] = useState('')
  // Desktop: single state for which dropdown is open (null = none)
  const [desktopDropdown, setDesktopDropdown] = useState<'options' | 'language' | null>(null)
  const roomRef = useRef<{ disconnect: () => void } | null>(null)
  const callIdRef = useRef<string | null>(null)
  const wireCallIdRef = useRef<string | null>(null)
  const audioElsRef = useRef<HTMLAudioElement[]>([])
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => { preloadLiveKit() }, [])

  // Auto-populate query from URL parameter (e.g. from dashboard preset click)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('query')
    if (q) {
      setQuery(q)
      // Clean up URL without reload
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Close desktop dropdown on outside click
  useEffect(() => {
    if (!desktopDropdown) return
    function handleClick(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setDesktopDropdown(null)
        setLangSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [desktopDropdown])

  function toggleDesktopDropdown(which: 'options' | 'language') {
    setDesktopDropdown(prev => prev === which ? null : which)
    setLangSearch('')
  }

  const [audioBlocked, setAudioBlocked] = useState(false)

  // ── Audio helpers ─────────────────────────────────────────────────────────

  function attachAudio(el: HTMLAudioElement) {
    el.autoplay = true
    el.style.display = 'none'
    document.body.appendChild(el)
    audioElsRef.current.push(el)
    // Try to play immediately, then retry after a delay if it fails
    el.play()
      .then(() => setAudioBlocked(false))
      .catch(() => {
        // Retry after 500ms — track stream may not be ready yet
        setTimeout(() => {
          el.play()
            .then(() => setAudioBlocked(false))
            .catch(() => setAudioBlocked(true))
        }, 500)
      })
  }

  function cleanupAudio() {
    for (const el of audioElsRef.current) { el.pause(); el.srcObject = null; el.remove() }
    audioElsRef.current = []
    setAudioBlocked(false)
  }

  // Force-play all attached audio elements — used by the "Tap to unmute"
  // fallback button which runs in a fresh user gesture context.
  function forceUnmute() {
    for (const el of audioElsRef.current) {
      el.play().catch(() => {})
    }
    // Also resume any suspended AudioContext on the room
    try {
      const room = roomRef.current as any
      room?.startAudio?.()
    } catch {}
    setAudioBlocked(false)
  }

  // Singleton AudioContext — reuse across calls to avoid hitting browser limits.
  // Must be called SYNCHRONOUSLY in a click handler, BEFORE any await.
  function unlockAudio() {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      // Reuse existing context if we have one
      if (!(window as any).__bipiAudioCtx) {
        (window as any).__bipiAudioCtx = new AC()
      }
      const ctx = (window as any).__bipiAudioCtx as AudioContext
      if (ctx.state === 'suspended') ctx.resume()
      // Play a silent buffer to fully satisfy the autoplay policy
      const buf = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0)
    } catch { /* non-fatal */ }
  }

  // ── Call logic ────────────────────────────────────────────────────────────

  async function handleConnect() {
    if (!query.trim() && step === 'idle') return

    // CRITICAL: unlock audio SYNCHRONOUSLY on click, before any await.
    // This is the only reliable way to satisfy browser autoplay policy
    // when the actual audio playback happens seconds later (after network
    // requests to create the Retell call and connect to LiveKit).
    unlockAudio()

    setStep('connecting')
    setActiveSheet(null)
    setDesktopDropdown(null)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch('/api/reporter/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuery: query.trim() || 'breaking news today', language, timezone, researchMode }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        if (res.status === 402) {
          // Insufficient credits — show top-up modal
          setStep('idle')
          setShowTopUp(true)
          return
        }
        throw new Error(e.error ?? 'Failed to connect')
      }
      const { publicRoomUrl, browserToken, retellUrl, reporterToken, callId, wireCallId } = await res.json()
      callIdRef.current = callId; wireCallIdRef.current = wireCallId

      const { Room, RoomEvent, Track } = await preloadLiveKit()
      cleanupAudio()
      const room = new Room({ adaptiveStream: false, dynacast: false })
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          attachAudio(track.attach())
          setStep('live')
        }
      })
      room.on(RoomEvent.Disconnected, () => { cleanupAudio(); setStep('done'); roomRef.current = null; refreshProfile() })

      if (publicRoomUrl && browserToken) {
        await room.connect(publicRoomUrl, browserToken)
      } else if (reporterToken) {
        await room.connect(retellUrl, reporterToken)
      }

      // Resume LiveKit's internal audio after connection
      try { await room.startAudio() } catch {
        try { await (room as any).startAudio?.() } catch {}
      }

      // Attach any tracks already published before we subscribed
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) {
          if (pub.track && pub.isSubscribed) {
            attachAudio(pub.track.attach())
            setStep('live')
          }
        }
      }

      // Periodic retry: if audio elements exist but aren't playing, retry play()
      const retryInterval = setInterval(() => {
        for (const el of audioElsRef.current) {
          if (el.paused && el.srcObject) el.play().catch(() => {})
        }
      }, 2000)

      // Safety timeout: 10 min max
      setTimeout(() => { clearInterval(retryInterval); room.disconnect() }, 10 * 60 * 1000)
    } catch (err) { setErrorMsg(err instanceof Error ? err.message : 'Something went wrong'); setStep('error') }
  }

  function handleLeaveCall() { roomRef.current?.disconnect(); roomRef.current = null; callIdRef.current = null; wireCallIdRef.current = null; cleanupAudio(); setStep('done'); refreshProfile() }
  function handleReset() { setStep('idle'); setQuery(''); setErrorMsg('') }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConnect() } }

  const selectedLang = LANGUAGES.find(l => l.code === language)
  const selectedAgentObj = agents.find(a => a.id === selectedAgent)
  const filteredLangs = langSearch ? LANGUAGES.filter(l => l.label.toLowerCase().includes(langSearch.toLowerCase()) || l.code.toLowerCase().includes(langSearch.toLowerCase())) : LANGUAGES

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="relative overflow-hidden bg-t-bg px-4 py-10 sm:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(251,191,36,0.08), transparent)' }} />

      <div className="relative z-10 mx-auto max-w-2xl">

        {step === 'idle' && (
          <>
            {/* Header */}
            <div className="mb-5 sm:mb-8 text-center">
              <div className="mb-3 sm:mb-4 inline-flex items-center gap-2 rounded-full border border-t-badge-border bg-t-badge px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-t-text-2 backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                AI News Agent
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-t-text sm:text-4xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>Call The Reporter</h1>
              <p className="mt-2 sm:mt-3 text-sm leading-relaxed text-t-text-2 sm:text-base">
                Generate Real-time, Evidence Based News Reports on any topic or try one of the suggestions below
              </p>
            </div>

            {/* ── Composer card ── */}
            <div className="rounded-2xl border border-t-edge bg-t-surface p-3 sm:p-4 shadow-t-lg">
              {/* Input row */}
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Give me a detailed report on CIA's project Bluebird"
                rows={3}
                className="w-full resize-none rounded-xl bg-transparent px-1 py-2 text-base sm:text-sm text-t-text placeholder:text-t-text-4 focus:outline-none"
              />

              {/* Toolbar row: [+] [lang pill] ... [send] */}
              <div ref={toolbarRef} className="relative flex items-center gap-2 pt-1 border-t border-t-edge-muted mt-1">
                {/* Plus button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (window.innerWidth < 640) { setActiveSheet('options') }
                      else { toggleDesktopDropdown('options') }
                    }}
                    className={cn(
                      'size-8 rounded-full border flex items-center justify-center transition active:scale-95',
                      desktopDropdown === 'options'
                        ? 'border-t-accent bg-t-accent-soft text-t-accent-text'
                        : 'border-t-edge-strong bg-t-surface-el text-t-text-3 hover:text-t-text-2 hover:bg-t-hover',
                    )}
                    aria-label="Options"
                  >
                    <Plus className="size-4" />
                  </button>

                  {/* Desktop options dropdown — anchored to plus button, opens upward */}
                  <AnimatePresence>
                    {desktopDropdown === 'options' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="hidden sm:block absolute left-0 top-full mt-2 w-64 rounded-xl border border-t-edge bg-t-surface shadow-t-lg overflow-hidden z-50"
                      >
                        <div className="p-3">
                          {agents[0] && (
                            <div className="flex items-start gap-3 px-2 py-2">
                              <AgentAvatar agent={agents[0]} size={36} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-t-text">{agents[0].name}</p>
                                <p className="text-xs text-t-text-3 leading-relaxed mt-1">{agents[0].shortBio}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-t-edge-muted p-3">
                          <button
                            onClick={() => { setResearchMode(!researchMode); setDesktopDropdown(null) }}
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-t-text hover:bg-t-hover transition"
                          >
                            <Zap className={cn('size-4', researchMode ? 'text-t-accent-text' : 'text-t-text-3')} />
                            <div className="flex-1 text-left">
                              <p className="font-medium">Deep Research</p>
                              <p className="text-xs text-t-text-3">In-depth analysis & reporting</p>
                            </div>
                            {researchMode && <CheckMark />}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Language pill */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (window.innerWidth < 640) { setActiveSheet('language') }
                      else { toggleDesktopDropdown('language') }
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
                      desktopDropdown === 'language'
                        ? 'border-t-accent bg-t-accent-soft text-t-accent-text'
                        : 'border-t-edge-strong bg-t-surface-el text-t-text-2 hover:bg-t-hover',
                    )}
                  >
                    <Globe className="size-3" />
                    {selectedLang?.label ?? 'English'}
                  </button>

                  {/* Desktop language dropdown — anchored to language pill, opens upward */}
                  <AnimatePresence>
                    {desktopDropdown === 'language' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="hidden sm:block absolute left-0 top-full mt-2 w-52 rounded-xl border border-t-edge bg-t-surface shadow-t-lg overflow-hidden z-50"
                      >
                        <div className="p-2">
                          <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-t-text-4" />
                            <input
                              type="text"
                              value={langSearch}
                              onChange={(e) => setLangSearch(e.target.value)}
                              placeholder="Search..."
                              className="w-full rounded-lg bg-t-surface-el border border-t-edge pl-8 pr-3 py-1.5 text-xs text-t-text placeholder:text-t-text-4 focus:outline-none focus:border-t-focus"
                              autoFocus
                            />
                          </div>
                          {filteredLangs.map((l) => (
                            <button
                              key={l.code}
                              onClick={() => { setLanguage(l.code); setDesktopDropdown(null); setLangSearch('') }}
                              className={cn(
                                'w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition',
                                l.code === language ? 'bg-t-accent-soft text-t-accent-text' : 'text-t-text hover:bg-t-hover',
                              )}
                            >
                              {l.label}
                              {l.code === language && <CheckMark />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Status indicators */}
                <div className="flex-1" />

                {/* Credits badge (when logged in) */}
                {user && profile && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-t-text-3">
                    <Coins className="size-3 text-t-accent-text" /> {profile.credits}
                  </span>
                )}

                {researchMode && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium text-t-accent-text">
                    <Zap className="size-3" /> Deep
                  </span>
                )}

                {/* Send / Sign In button */}
                {user ? (
                  <button
                    onClick={handleConnect}
                    disabled={!query.trim()}
                    className={cn(
                      'size-9 rounded-full flex items-center justify-center transition',
                      query.trim()
                        ? 'bg-t-accent text-white hover:opacity-90 active:scale-95'
                        : 'bg-t-surface-el text-t-text-4 cursor-not-allowed',
                    )}
                    aria-label="Send"
                  >
                    <Phone className="size-4" />
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    className="flex items-center gap-1.5 rounded-full bg-t-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition"
                  >
                    <LogIn className="size-3.5" /> Sign in
                  </Link>
                )}
              </div>
            </div>

            {/* ── Preset suggestions ── */}
            {(presets.length > 0 || userPresets.length > 0) && (
              <div className="mt-6 sm:mt-8">

                {/* Desktop: tab switcher (only if both lists exist) */}
                {userPresets.length > 0 && presets.length > 0 && (
                  <div className="hidden sm:flex items-center justify-center gap-1 mb-4">
                    <button
                      onClick={() => setPresetTab('suggested')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition ${presetTab === 'suggested' ? 'bg-t-surface-el text-t-text border border-t-edge-strong' : 'text-t-text-3 hover:text-t-text-2'}`}
                    >
                      Suggested Topics
                    </button>
                    <button
                      onClick={() => setPresetTab('recommended')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition ${presetTab === 'recommended' ? 'bg-t-surface-el text-t-text border border-t-edge-strong' : 'text-t-text-3 hover:text-t-text-2'}`}
                    >
                      Based on Your Interests
                    </button>
                  </div>
                )}

                {/* Desktop: single label if only one list */}
                {(userPresets.length === 0 || presets.length === 0) && (
                  <p className="hidden sm:block mb-4 text-center text-xs font-medium uppercase tracking-wider text-t-text-3">
                    {userPresets.length > 0 ? 'Based on Your Interests' : 'Suggested Topics'}
                  </p>
                )}

                {/* ── MOBILE: both carousels stacked ── */}
                <div className="sm:hidden space-y-6">
                  {/* Suggested Topics */}
                  {presets.length > 0 && (
                    <div>
                      <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-t-text-3">Suggested Topics</p>
                      <div className="-mx-4 px-4">
                        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                          {presets.map((preset) => (
                            <button key={preset.id} onClick={() => setQuery(preset.query_template)} className="group snap-start shrink-0 w-[72vw] text-left rounded-xl border border-t-edge bg-t-surface p-3.5 shadow-t transition active:scale-[0.98]">
                              {preset.category && <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium mb-1.5 ${categoryColors[preset.category] ?? defaultCategoryColor}`}>{preset.category}</span>}
                              <p className="text-sm font-medium text-t-text leading-snug">{preset.title}</p>
                              <p className="mt-1 text-xs text-t-text-3 line-clamp-2 leading-relaxed">{preset.query_template}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User presets (mobile carousel) */}
                  {userPresets.length > 0 && (
                    <div>
                      <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-t-text-3">Based on Your Interests</p>
                      <div className="-mx-4 px-4">
                        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                          {userPresets.map((preset) => (
                            <button key={preset.id} onClick={() => setQuery(preset.query_template)} className="group snap-start shrink-0 w-[72vw] text-left rounded-xl border border-t-edge bg-t-surface overflow-hidden shadow-t transition active:scale-[0.98]">
                              {preset.interest && <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide border-b ${interestColor(preset.interest)}`}>{preset.interest}</div>}
                              <div className="p-3.5">
                                <p className="text-sm font-medium text-t-text leading-snug">{preset.title}</p>
                                <p className="mt-1 text-xs text-t-text-3 line-clamp-2 leading-relaxed">{preset.query_template}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── DESKTOP: tabbed grid ── */}
                <div className="hidden sm:block">
                  {/* Suggested Topics grid */}
                  {(presetTab === 'suggested' || userPresets.length === 0) && presets.length > 0 && userPresets.length === 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {presets.map((preset) => (
                        <button key={preset.id} onClick={() => setQuery(preset.query_template)} className="group text-left rounded-xl border border-t-edge bg-t-surface p-4 shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg">
                          {preset.category && <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium mb-2 ${categoryColors[preset.category] ?? defaultCategoryColor}`}>{preset.category}</span>}
                          <p className="text-sm font-medium text-t-text leading-snug group-hover:text-t-accent-text transition">{preset.title}</p>
                          <p className="mt-1.5 text-xs text-t-text-3 line-clamp-2 leading-relaxed">{preset.query_template}</p>
                        </button>
                      ))}
                    </div>
                  ) : presetTab === 'suggested' && presets.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {presets.map((preset) => (
                        <button key={preset.id} onClick={() => setQuery(preset.query_template)} className="group text-left rounded-xl border border-t-edge bg-t-surface p-4 shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg">
                          {preset.category && <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium mb-2 ${categoryColors[preset.category] ?? defaultCategoryColor}`}>{preset.category}</span>}
                          <p className="text-sm font-medium text-t-text leading-snug group-hover:text-t-accent-text transition">{preset.title}</p>
                          <p className="mt-1.5 text-xs text-t-text-3 line-clamp-2 leading-relaxed">{preset.query_template}</p>
                        </button>
                      ))}
                    </div>
                  ) : userPresets.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {userPresets.map((preset) => (
                        <button key={preset.id} onClick={() => setQuery(preset.query_template)} className="group text-left rounded-xl border border-t-edge bg-t-surface overflow-hidden shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg">
                          {preset.interest && <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide border-b ${interestColor(preset.interest)}`}>{preset.interest}</div>}
                          <div className="p-4">
                            <p className="text-sm font-medium text-t-text leading-snug group-hover:text-t-accent-text transition">{preset.title}</p>
                            <p className="mt-1.5 text-xs text-t-text-3 line-clamp-2 leading-relaxed">{preset.query_template}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Call states (connecting/live/done/error) ── */}
        {step === 'connecting' && (
          <div className="flex flex-col items-center py-16 gap-5">
            <div className="size-16 rounded-full bg-t-surface border border-t-edge flex items-center justify-center shadow-t-lg"><LoadingSpinner /></div>
            <div className="text-center">
              <p className="text-base font-semibold text-t-text">Connecting to The Reporter</p>
              <p className="mt-1.5 text-sm text-t-text-3">Searching the news wire...</p>
            </div>
            {query && <div className="mt-2 max-w-md rounded-xl border border-t-edge bg-t-surface px-4 py-3 shadow-t"><p className="text-xs text-t-text-3 mb-1">Your query</p><p className="text-sm text-t-text-2 line-clamp-2">{query}</p></div>}
          </div>
        )}

        {step === 'live' && (
          <div className="flex flex-col items-center py-12 gap-6">
            <div className="size-16 rounded-full bg-t-surface border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10"><span className="text-2xl">📡</span></div>
            <div className="text-center">
              <p className="text-lg font-semibold text-t-text">The Reporter is on air</p>
              <p className="mt-1 text-sm text-t-text-3">Report will be saved to The Wire when complete</p>
            </div>
            {query && <div className="max-w-md rounded-xl border border-t-edge bg-t-surface px-4 py-3 shadow-t"><p className="text-xs text-t-text-3 mb-1">Reporting on</p><p className="text-sm text-t-text-2">{query}</p></div>}

            {/* Fallback: if browser blocked audio, show a tap-to-unmute button */}
            {audioBlocked && (
              <button
                onClick={forceUnmute}
                className="flex items-center gap-2 rounded-xl bg-t-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-95 transition animate-pulse"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                Tap to Enable Audio
              </button>
            )}

            <LiveWaveform />
            <button onClick={handleLeaveCall} className="mt-2 flex items-center gap-2 rounded-xl border border-t-edge-strong bg-t-surface-el px-6 py-3 text-sm font-medium text-t-text-2 hover:bg-t-hover transition"><PhoneOffIcon /> Leave Call</button>
            <p className="text-xs text-t-text-3 text-center max-w-xs leading-relaxed">You can leave anytime — the full report will appear in your dashboard once The Reporter finishes.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-16 gap-5">
            <div className="size-16 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center"><CheckIcon /></div>
            <div className="text-center"><p className="text-lg font-semibold text-t-text">Report submitted</p><p className="mt-1.5 text-sm text-t-text-2">Your report will appear in your dashboard shortly after analysis completes.</p></div>
            <div className="flex gap-3">
              <button onClick={handleReset} className="rounded-xl bg-t-surface-el border border-t-edge-strong px-6 py-2.5 text-sm font-medium text-t-text-2 hover:bg-t-hover transition">Make Another Call</button>
              <a href="/my/reports" className="rounded-xl bg-t-accent px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">View My Reports</a>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center py-16 gap-5">
            <div className="size-16 rounded-full bg-red-950/40 border border-red-800/60 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
            <p className="text-sm text-red-400">{errorMsg || 'Something went wrong'}</p>
            <button onClick={() => setStep('idle')} className="rounded-xl bg-t-surface-el border border-t-edge-strong px-5 py-2.5 text-sm font-medium text-t-text-2 hover:bg-t-hover transition">Try again</button>
          </div>
        )}
      </div>

      {/* Top-up modal */}
      {showTopUp && <TopUpModal creditsNeeded={5} onClose={() => setShowTopUp(false)} />}

      {/* ═══════════════════════════════════════════════════════════════════════
         MOBILE BOTTOM SHEETS (sm:hidden)
         ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {activeSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setActiveSheet(null); setLangSearch('') }}
              className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-[72px] z-50 sm:hidden sm:bottom-0"
            >
              <div className="rounded-t-2xl bg-t-surface border-t border-t-edge shadow-t-lg max-h-[70vh] overflow-y-auto">
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-t-edge-strong" />
                </div>

                {/* ── Options sheet ── */}
                {activeSheet === 'options' && (
                  <div className="px-5 pb-8 pt-2">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-semibold text-t-text">Options</h3>
                      <button onClick={() => setActiveSheet(null)} className="size-8 rounded-full bg-t-surface-el flex items-center justify-center text-t-text-3"><X className="size-4" /></button>
                    </div>

                    {/* Reporter agent card */}
                    <p className="text-xs font-semibold text-t-text-3 uppercase tracking-wider mb-3">Agent</p>
                    {agents[0] && (
                      <div className="flex items-start gap-3 rounded-xl border border-t-accent/30 bg-t-accent-soft p-4 mb-4">
                        <AgentAvatar agent={agents[0]} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-t-text">{agents[0].name}</p>
                          <p className="text-xs text-t-text-3 leading-relaxed mt-1">{agents[0].shortBio}</p>
                        </div>
                      </div>
                    )}

                    {/* Deep Research toggle */}
                    <div className="border-t border-t-edge-muted pt-4 mt-2">
                      <button
                        onClick={() => setResearchMode(!researchMode)}
                        className="w-full flex items-center gap-4 rounded-xl px-4 py-3 transition hover:bg-t-hover"
                      >
                        <div className={cn('size-10 rounded-xl flex items-center justify-center', researchMode ? 'bg-t-accent-soft' : 'bg-t-surface-el')}>
                          <Zap className={cn('size-5', researchMode ? 'text-t-accent-text' : 'text-t-text-3')} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-t-text">Deep Research</p>
                          <p className="text-xs text-t-text-3">In-depth reports and analysis</p>
                        </div>
                        <div className={cn('w-11 h-6 rounded-full transition-colors relative', researchMode ? 'bg-t-accent' : 'bg-t-edge-strong')}>
                          <div className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform', researchMode ? 'translate-x-5.5' : 'translate-x-0.5')} />
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Language sheet ── */}
                {activeSheet === 'language' && (
                  <div className="px-5 pt-2 flex flex-col" style={{ maxHeight: 'calc(70vh - 72px)' }}>
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <h3 className="text-lg font-semibold text-t-text">Language</h3>
                      <button onClick={() => { setActiveSheet(null); setLangSearch('') }} className="size-8 rounded-full bg-t-surface-el flex items-center justify-center text-t-text-3"><X className="size-4" /></button>
                    </div>

                    <div className="space-y-1 overflow-y-auto pb-8 -mx-1 px-1">
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => { setLanguage(l.code); setActiveSheet(null); setLangSearch('') }}
                          className={cn(
                            'w-full flex items-center justify-between rounded-xl px-4 py-3.5 text-sm transition',
                            l.code === language ? 'bg-t-accent-soft text-t-accent-text font-medium' : 'text-t-text hover:bg-t-hover',
                          )}
                        >
                          {l.label}
                          {l.code === language && <CheckMark />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AgentAvatar({ agent, size = 32 }: { agent: { name: string; avatarUrl: string | null }; size?: number }) {
  if (agent.avatarUrl) {
    return <div className="relative shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size }}><Image src={agent.avatarUrl} alt={agent.name} fill className="object-cover" sizes={`${size}px`} /></div>
  }
  const initials = agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)
  return <div className="shrink-0 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-xs font-bold text-t-text-2" style={{ width: size, height: size }}>{initials}</div>
}

function CheckMark() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-t-accent-text shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
}

function PhoneOffIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/><path d="M14.5 2.5a10 10 0 0 0-10 10"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
}
function CheckIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
}
function LoadingSpinner() {
  return <svg className="animate-spin text-neutral-400" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
}
function LiveWaveform() {
  return <div className="flex items-end gap-1 h-10">{[0.4,0.7,1,0.6,0.9,0.5,0.8,0.65,0.45,0.75,0.55,0.85].map((h,i) => <div key={i} className="w-1.5 rounded-full bg-amber-400 animate-pulse" style={{ height: `${h*100}%`, animationDelay: `${i*70}ms`, animationDuration: '900ms' }} />)}</div>
}
