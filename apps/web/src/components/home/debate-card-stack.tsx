'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  archetype: string
  avatarUrl: string | null
  role?: string
  expertise?: string[]
}

export interface DebateCardData {
  id: string
  title: string
  slug: string
  headline: string
  endedAt: string | null
  startedAt: string | null
  recordingUrl: string | null
  participants: Participant[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${ss.toString().padStart(2, '0')}`
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const archetypePalette: Record<string, { bg: string; text: string }> = {
  hawk:                { bg: '#7f1d1d', text: '#fca5a5' },
  dove:                { bg: '#0c4a6e', text: '#7dd3fc' },
  technocrat:          { bg: '#3b0764', text: '#c4b5fd' },
  populist:            { bg: '#78350f', text: '#fcd34d' },
  cynic:               { bg: '#3f3f46', text: '#d4d4d8' },
  conspiracy_theorist: { bg: '#064e3b', text: '#6ee7b7' },
  institutionalist:    { bg: '#1e3a5f', text: '#93c5fd' },
  libertarian:         { bg: '#7c2d12', text: '#fdba74' },
}
function avatarColors(archetype: string) {
  return archetypePalette[archetype] ?? { bg: '#27272a', text: '#a1a1aa' }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlayIcon()  {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px] translate-x-[1px]">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"/>
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]">
      <rect x="6" y="4" width="4" height="16" rx="1"/>
      <rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>
  )
}
function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5 shrink-0">
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd"/>
    </svg>
  )
}
function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/>
    </svg>
  )
}
function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/>
    </svg>
  )
}
function SwipeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"/>
    </svg>
  )
}

// ── Stack Debate Card ─────────────────────────────────────────────────────────
// Self-contained card for use inside the stack.
// Clicking the card itself does NOT navigate — only "Watch Recording" does.

interface StackDebateCardProps {
  debate: DebateCardData
  isActive: boolean    // when false, audio pauses
}

function StackDebateCard({ debate, isActive }: StackDebateCardProps) {
  const router     = useRouter()
  const audioRef   = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying]     = useState(false)
  const [current, setCurrent]     = useState(0)
  const [duration, setDuration]   = useState(0)

  // Stop audio when this card leaves the front of the stack
  useEffect(() => {
    if (!isActive && audioRef.current && playing) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
      setCurrent(0)
    }
  }, [isActive, playing])

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setCurrent(a.currentTime)
    const onDur  = () => setDuration(isFinite(a.duration) ? a.duration : 0)
    const onEnd  = () => { setPlaying(false); setCurrent(0) }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('durationchange', onDur)
    a.addEventListener('loadedmetadata', onDur)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('durationchange', onDur)
      a.removeEventListener('loadedmetadata', onDur)
      a.removeEventListener('ended', onEnd)
    }
  }, [])

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const a = audioRef.current
    if (!a || !debate.recordingUrl) return
    if (playing) { a.pause() } else { void a.play() }
    setPlaying(!playing)
  }, [playing, debate.recordingUrl])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const val = Number(e.target.value)
    if (audioRef.current) { audioRef.current.currentTime = val; setCurrent(val) }
  }, [])

  const openRoom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/debates/${debate.slug}`)
  }, [router, debate.slug])

  // Derived values
  const hasAudio = !!debate.recordingUrl
  const displayDuration = duration > 0
    ? duration
    : (debate.startedAt && debate.endedAt)
      ? (new Date(debate.endedAt).getTime() - new Date(debate.startedAt).getTime()) / 1000
      : 0
  const progress = displayDuration > 0 ? (current / displayDuration) * 100 : 0

  // Participants: exclude moderators
  const debaters = debate.participants
    .filter(p => p.archetype !== 'moderator' && p.role !== 'moderator')
    .slice(0, 4)

  return (
    <div className="flex h-full flex-col bg-[#0d0d0f] rounded-2xl overflow-hidden select-none">
      {debate.recordingUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} src={debate.recordingUrl} preload="metadata" />
      )}

      <div className="flex flex-1 flex-col p-5 sm:p-6 gap-4">

        {/* ── Meta row ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {debate.endedAt ? formatDate(debate.endedAt) : ''}
          </span>
          {displayDuration > 0 && (
            <span className="text-xs tabular-nums text-neutral-600">
              {formatTime(displayDuration)}
            </span>
          )}
        </div>

        {/* ── Title ────────────────────────────────────────────────────── */}
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold leading-snug text-white line-clamp-2">
            {debate.title}
          </h3>
          {debate.headline && (
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-500 line-clamp-2">
              {debate.headline}
            </p>
          )}
        </div>

        {/* ── Participants ─────────────────────────────────────────────── */}
        {debaters.length > 0 && (
          <div className="flex items-center gap-2 min-w-0">
            {debaters.length === 2 ? (
              // Clean "Avatar Name × Avatar Name" layout
              <>
                {debaters.map((p, i) => {
                  const colors  = avatarColors(p.archetype)
                  const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <div key={p.id} className={`flex items-center gap-1.5 min-w-0 ${i === 0 ? 'flex-1' : 'flex-1 justify-end'}`}>
                      {i === 0 && (
                        <>
                          {p.avatarUrl
                            ? <div className="relative size-5 shrink-0 rounded-full overflow-hidden"><Image src={p.avatarUrl} alt={p.name} fill className="object-cover" sizes="20px"/></div>
                            : <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: colors.bg, color: colors.text }}>{initials}</span>
                          }
                          <span className="truncate text-xs font-medium text-neutral-300">{p.name}</span>
                        </>
                      )}
                      {i === 1 && (
                        <>
                          <span className="truncate text-xs font-medium text-neutral-300">{p.name}</span>
                          {p.avatarUrl
                            ? <div className="relative size-5 shrink-0 rounded-full overflow-hidden"><Image src={p.avatarUrl} alt={p.name} fill className="object-cover" sizes="20px"/></div>
                            : <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: colors.bg, color: colors.text }}>{initials}</span>
                          }
                        </>
                      )}
                    </div>
                  )
                })}
                <span className="shrink-0 text-[10px] font-semibold tracking-widest text-neutral-700 px-0.5">vs</span>
              </>
            ) : (
              <span className="truncate text-xs text-neutral-500">
                {debaters.map(p => p.name).join(' · ')}
              </span>
            )}
          </div>
        )}

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="h-px bg-neutral-800" />

        {/* ── Audio section ────────────────────────────────────────────── */}
        <div className="space-y-2" onClick={e => e.stopPropagation()}>
          {/* Progress bar */}
          <div className="relative h-1 w-full rounded-full bg-neutral-800">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-neutral-400 transition-none"
              style={{ width: `${progress}%` }}
            />
            <input
              type="range"
              min={0}
              max={displayDuration || 100}
              step={0.5}
              value={current}
              onChange={handleSeek}
              disabled={!hasAudio}
              aria-label="Seek"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
            />
          </div>

          {/* Time labels */}
          <div className="flex justify-between text-[11px] tabular-nums text-neutral-700">
            <span>{formatTime(current)}</span>
            <span>{formatTime(displayDuration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-0.5">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              disabled={!hasAudio}
              aria-label={playing ? 'Pause' : 'Play'}
              className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-900 shadow-sm transition hover:bg-neutral-100 active:scale-95 disabled:cursor-default disabled:opacity-30"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Watch Recording */}
            <button
              onClick={openRoom}
              className="group flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition hover:text-neutral-200"
            >
              Watch Recording
              <span className="transition group-hover:translate-x-0.5">
                <ArrowRightIcon />
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Stack configuration ────────────────────────────────────────────────────────

const VISIBLE     = 3     // cards rendered in DOM
const OFFSET_PX   = 10   // px each back card shifts down
const SCALE_STEP  = 0.04 // scale reduction per layer
const DIM_STEP    = 0.35 // brightness reduction per layer (back cards only)
const SPRING      = { type: 'spring' as const, stiffness: 180, damping: 28 }
const SWIPE_THRESH = 55

// ── DebateCardStack ────────────────────────────────────────────────────────────

interface DebateCardStackProps {
  debates: DebateCardData[]
}

export function DebateCardStack({ debates }: DebateCardStackProps) {
  const [cards, setCards]   = useState(debates)
  const [frontId, setFrontId] = useState(debates[0]?.id ?? null)
  const [exiting, setExiting] = useState(false)
  const dragY = useMotionValue(0)

  if (debates.length === 0) return null

  // ── Navigation ──────────────────────────────────────────────────────────────

  const moveToEnd = useCallback(() => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => {
      setCards(prev => {
        if (prev.length < 2) return prev
        const next: DebateCardData[] = [...prev.slice(1), prev[0]!]
        setFrontId(next[0]?.id ?? null)
        return next
      })
      setExiting(false)
    }, 120)
  }, [exiting])

  const moveToPrev = useCallback(() => {
    if (exiting) return
    setExiting(true)
    setTimeout(() => {
      setCards(prev => {
        if (prev.length < 2) return prev
        const next: DebateCardData[] = [prev[prev.length - 1]!, ...prev.slice(0, -1)]
        setFrontId(next[0]?.id ?? null)
        return next
      })
      setExiting(false)
    }, 120)
  }, [exiting])

  const handleDragEnd = useCallback((_: unknown, info: { velocity: { y: number }; offset: { y: number } }) => {
    const { velocity, offset } = info
    if (Math.abs(offset.y) > SWIPE_THRESH || Math.abs(velocity.y) > 500) {
      if (offset.y < 0 || velocity.y < -500) moveToEnd()
      else moveToPrev()
    }
    dragY.set(0)
  }, [moveToEnd, moveToPrev, dragY])

  // ── Position in original list ────────────────────────────────────────────────
  const frontCard = cards[0]
  const rawIdx    = frontCard ? debates.findIndex(d => d.id === frontCard.id) : -1
  const pos       = rawIdx >= 0 ? rawIdx + 1 : 1
  const visible   = cards.slice(0, VISIBLE)

  return (
    <div className="flex flex-col items-center gap-5 w-full">

      {/* ── Card Stack ──────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-[440px] mx-auto"
           style={{ paddingBottom: `${(VISIBLE - 1) * OFFSET_PX}px` }}>

        <AnimatePresence initial={false}>
          {visible.map((debate, i) => {
            const isFront    = i === 0
            const brightness = Math.max(0.3, 1 - i * DIM_STEP)
            const zIndex     = VISIBLE - i

            return (
              <motion.div
                key={debate.id}
                style={{
                  position: i === 0 ? 'relative' : 'absolute',
                  top: i === 0 ? undefined : `${i * OFFSET_PX}px`,
                  left: 0,
                  right: 0,
                  zIndex,
                  cursor: isFront ? 'grab' : 'default',
                  touchAction: isFront ? 'none' : 'auto',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: isFront
                    ? '0 24px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)'
                    : '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
                }}
                animate={{
                  scale:   isFront ? 1 : 1 - i * SCALE_STEP,
                  filter:  isFront ? 'brightness(1)' : `brightness(${brightness})`,
                  opacity: isFront ? (exiting ? 0 : 1) : 1,
                }}
                exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.15 } }}
                transition={SPRING}
                drag={isFront ? 'y' : false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.6}
                onDrag={(_, info) => { if (isFront) dragY.set(info.offset.y) }}
                onDragEnd={handleDragEnd}
                whileDrag={isFront ? { cursor: 'grabbing', scale: 1.01 } : {}}
              >
                <StackDebateCard
                  debate={debate}
                  isActive={debate.id === frontId}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* ── Controls row ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Prev */}
        <motion.button
          onClick={moveToPrev}
          disabled={exiting}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="flex size-8 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300 disabled:opacity-40"
          aria-label="Previous debate"
        >
          <ChevronLeftIcon />
        </motion.button>

        {/* Counter + swipe hint */}
        <div className="flex items-center gap-2 text-xs text-neutral-700">
          <SwipeIcon />
          <span className="tabular-nums">{pos} / {debates.length}</span>
        </div>

        {/* Next */}
        <motion.button
          onClick={moveToEnd}
          disabled={exiting}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="flex size-8 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-500 transition hover:border-neutral-700 hover:text-neutral-300 disabled:opacity-40"
          aria-label="Next debate"
        >
          <ChevronRightIcon />
        </motion.button>
      </div>

    </div>
  )
}
