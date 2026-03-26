'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const m  = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${ss.toString().padStart(2, '0')}`
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px] translate-x-[1px]">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}
function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5 shrink-0">
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
    </svg>
  )
}
function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-[18px]">
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  )
}
function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-[18px]">
      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}

// ── Stack Debate Card ─────────────────────────────────────────────────────────

interface StackDebateCardProps {
  debate: DebateCardData
  isActive: boolean
}

function StackDebateCard({ debate, isActive }: StackDebateCardProps) {
  const router   = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying]   = useState(false)
  const [current, setCurrent]   = useState(0)
  const [duration, setDuration] = useState(0)

  // Pause + reset when card leaves the front
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
    a.addEventListener('timeupdate',      onTime)
    a.addEventListener('durationchange',  onDur)
    a.addEventListener('loadedmetadata',  onDur)
    a.addEventListener('ended',           onEnd)
    return () => {
      a.removeEventListener('timeupdate',     onTime)
      a.removeEventListener('durationchange', onDur)
      a.removeEventListener('loadedmetadata', onDur)
      a.removeEventListener('ended',          onEnd)
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

  const hasAudio = !!debate.recordingUrl
  const displayDuration =
    duration > 0
      ? duration
      : debate.startedAt && debate.endedAt
        ? (new Date(debate.endedAt).getTime() - new Date(debate.startedAt).getTime()) / 1000
        : 0
  const progress = displayDuration > 0 ? (current / displayDuration) * 100 : 0

  const debaters = debate.participants
    .filter(p => p.archetype !== 'moderator' && p.role !== 'moderator')
    .slice(0, 4)

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl select-none"
      style={{
        background: 'linear-gradient(160deg, #17171e 0%, #0c0c0f 55%, #101013 100%)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
      }}
    >
      {debate.recordingUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} src={debate.recordingUrl} preload="metadata" />
      )}

      <div className="flex flex-col gap-4 p-5 sm:p-6">

        {/* ── Meta ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {debate.endedAt ? formatDate(debate.endedAt) : ''}
          </span>
          {displayDuration > 0 && (
            <span className="tabular-nums text-xs text-neutral-600">
              {formatTime(displayDuration)}
            </span>
          )}
        </div>

        {/* ── Title + headline ─────────────────────────────────────────── */}
        <div>
          <h3 className="text-base font-bold leading-snug text-white line-clamp-2 sm:text-[17px]">
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
          <>
            {debaters.length === 2 ? (
              // Strict 3-column: [left agent] [vs] [right agent]
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                {/* Left */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar participant={debaters[0]!} />
                  <span className="truncate text-xs font-medium text-neutral-300">
                    {debaters[0]!.name}
                  </span>
                </div>

                {/* VS — always centered */}
                <span className="text-[10px] font-bold tracking-widest text-neutral-700 px-1">
                  vs
                </span>

                {/* Right */}
                <div className="flex items-center justify-end gap-1.5 min-w-0">
                  <span className="truncate text-xs font-medium text-neutral-300">
                    {debaters[1]!.name}
                  </span>
                  <Avatar participant={debaters[1]!} />
                </div>
              </div>
            ) : (
              <span className="truncate text-xs text-neutral-500">
                {debaters.map(p => p.name).join(' · ')}
              </span>
            )}
          </>
        )}

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="h-px bg-white/[0.06]" />

        {/* ── Audio ────────────────────────────────────────────────────── */}
        <div className="space-y-2" onClick={e => e.stopPropagation()}>
          {/* Track */}
          <div className="relative h-[3px] w-full rounded-full bg-white/[0.08]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-neutral-300 transition-none"
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

          {/* Times */}
          <div className="flex justify-between tabular-nums text-[11px] text-neutral-700">
            <span>{formatTime(current)}</span>
            <span>{formatTime(displayDuration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-0.5">
            <button
              onClick={togglePlay}
              disabled={!hasAudio}
              aria-label={playing ? 'Pause' : 'Play'}
              className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-900 shadow transition hover:bg-neutral-100 active:scale-95 disabled:cursor-default disabled:opacity-30"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button
              onClick={openRoom}
              className="group flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition hover:text-white"
            >
              Watch Recording
              <span className="transition-transform group-hover:translate-x-0.5">
                <ArrowRightIcon />
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// Small avatar helper used in the participant row
function Avatar({ participant }: { participant: Participant }) {
  const colors   = avatarColors(participant.archetype)
  const initials = participant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return participant.avatarUrl ? (
    <div className="relative size-5 shrink-0 overflow-hidden rounded-full">
      <Image src={participant.avatarUrl} alt={participant.name} fill className="object-cover" sizes="20px" />
    </div>
  ) : (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
      style={{ background: colors.bg, color: colors.text }}
    >
      {initials}
    </span>
  )
}

// ── Stack configuration ────────────────────────────────────────────────────────

const VISIBLE    = 3
const OFFSET_PX  = 10
const SCALE_STEP = 0.04
const DIM_STEP   = 0.35

const slideVariants = {
  enter: (dir: 'next' | 'prev') => ({
    x: dir === 'next' ? '106%' : '-106%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: 'next' | 'prev') => ({
    x: dir === 'next' ? '-106%' : '106%',
    opacity: 0,
  }),
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 34 }

// ── DebateCardStack ────────────────────────────────────────────────────────────

export function DebateCardStack({ debates }: { debates: DebateCardData[] }) {
  const [index, setIndex]         = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')

  const moveNext = useCallback(() => {
    setDirection('next')
    setIndex(prev => (prev + 1) % debates.length)
  }, [debates.length])

  const movePrev = useCallback(() => {
    setDirection('prev')
    setIndex(prev => (prev - 1 + debates.length) % debates.length)
  }, [debates.length])

  if (debates.length === 0) return null

  const frontDebate = debates[index]!

  // Back cards: next 2 debates after the front one
  const backDebates = Array.from({ length: VISIBLE - 1 }, (_, i) =>
    debates[(index + i + 1) % debates.length]!,
  )

  const pos = index + 1

  return (
    <div className="flex flex-col items-center gap-5 w-full">

      {/* ── Stack ─────────────────────────────────────────────────────── */}
      <div
        className="relative w-full max-w-[440px] mx-auto"
        style={{ paddingBottom: `${(VISIBLE - 1) * OFFSET_PX}px` }}
      >
        {/* Back cards — static depth cues, no animation */}
        {backDebates.map((debate, i) => {
          const depth      = i + 1
          const brightness = Math.max(0.3, 1 - depth * DIM_STEP)
          return (
            <div
              key={debate.id}
              style={{
                position:        'absolute',
                top:             `${depth * OFFSET_PX}px`,
                left:            0,
                right:           0,
                zIndex:          VISIBLE - depth,
                borderRadius:    16,
                overflow:        'hidden',
                transform:       `scale(${1 - depth * SCALE_STEP})`,
                transformOrigin: 'top center',
                filter:          `brightness(${brightness})`,
                pointerEvents:   'none',
              }}
            >
              <StackDebateCard debate={debate} isActive={false} />
            </div>
          )
        })}

        {/* Front card — directional slide animation */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{ zIndex: VISIBLE }}
        >
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={frontDebate.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRING}
            >
              <StackDebateCard debate={frontDebate} isActive />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5">
        <motion.button
          onClick={movePrev}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="flex size-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200"
          aria-label="Previous debate"
        >
          <ChevronLeftIcon />
        </motion.button>

        <span className="tabular-nums text-xs text-neutral-600 w-10 text-center">
          {pos} / {debates.length}
        </span>

        <motion.button
          onClick={moveNext}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="flex size-9 items-center justify-center rounded-full border border-neutral-800 bg-neutral-900 text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200"
          aria-label="Next debate"
        >
          <ChevronRightIcon />
        </motion.button>
      </div>

    </div>
  )
}
