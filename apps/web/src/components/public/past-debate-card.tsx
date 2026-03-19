'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Participant {
  id: string
  name: string
  archetype: string
}

interface PastDebateCardProps {
  title: string
  slug: string
  headline: string
  endedAt: string | null
  startedAt: string | null
  recordingUrl: string | null
  participants: Participant[]
}

// Per-archetype avatar palette (solid colors for the initials bubble)
const avatarPalette: Record<string, { bg: string; text: string }> = {
  hawk:               { bg: '#7f1d1d', text: '#fca5a5' },
  dove:               { bg: '#0c4a6e', text: '#7dd3fc' },
  technocrat:         { bg: '#3b0764', text: '#c4b5fd' },
  populist:           { bg: '#78350f', text: '#fcd34d' },
  cynic:              { bg: '#3f3f46', text: '#d4d4d8' },
  conspiracy_theorist:{ bg: '#064e3b', text: '#6ee7b7' },
  institutionalist:   { bg: '#1e3a5f', text: '#93c5fd' },
  libertarian:        { bg: '#7c2d12', text: '#fdba74' },
}

const defaultPalette = { bg: '#27272a', text: '#a1a1aa' }

function getAvatarColors(archetype: string) {
  return avatarPalette[archetype] ?? defaultPalette
}

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Inline SVG Icons ──────────────────────────────────────────────────────────

function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

function SkipBackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
    </svg>
  )
}

function SkipForwardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M16 6h2v12h-2zM6 6l8.5 6L6 18V6z" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 shrink-0">
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PastDebateCard({
  title,
  slug,
  headline,
  endedAt,
  startedAt,
  recordingUrl,
  participants,
}: PastDebateCardProps) {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 0)
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const audio = audioRef.current
      if (!audio || !recordingUrl) return
      if (isPlaying) {
        audio.pause()
      } else {
        void audio.play()
      }
      setIsPlaying(!isPlaying)
    },
    [isPlaying, recordingUrl],
  )

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }, [])

  const skipTime = useCallback(
    (e: React.MouseEvent, secs: number) => {
      e.stopPropagation()
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = Math.max(0, Math.min(displayDuration, audio.currentTime + secs))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duration, startedAt, endedAt],
  )

  const hasAudio = !!recordingUrl

  const displayDuration =
    duration > 0
      ? duration
      : startedAt && endedAt
        ? (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
        : 0

  const progressPercent = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0

  // Debaters only (no moderator) for the participants row
  const debaters = participants.filter((p) => p.archetype !== 'moderator').slice(0, 4)

  return (
    <div
      onClick={() => router.push(`/debates/${slug}`)}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-neutral-700 hover:bg-neutral-900"
    >
      {recordingUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} src={recordingUrl} preload="metadata" />
      )}

      {/* ── Date row ── */}
      <div className="mb-3 flex items-center gap-2 text-xs text-neutral-500">
        {endedAt && <span>{formatDate(endedAt)}</span>}
        {displayDuration > 0 && (
          <>
            <span>·</span>
            <span>{formatTime(displayDuration)}</span>
          </>
        )}
      </div>

      {/* ── Participants ── */}
      {debaters.length > 0 && (
        <div className="mb-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {debaters.length === 2 ? (
            // Two-participant "vs" layout
            <div className="flex w-full items-center gap-2">
              {debaters.map((p, i) => {
                const colors = getAvatarColors(p.archetype)
                const initials = p.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                return (
                  <div key={p.id} className={`flex items-center gap-1.5 ${i === 0 ? 'flex-1 justify-start' : 'flex-1 justify-end'}`}>
                    {i === 0 && (
                      <>
                        <span
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {initials}
                        </span>
                        <span className="truncate text-xs font-medium text-neutral-300">{p.name}</span>
                      </>
                    )}
                    {i === 1 && (
                      <>
                        <span className="truncate text-xs font-medium text-neutral-300">{p.name}</span>
                        <span
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{ background: colors.bg, color: colors.text }}
                        >
                          {initials}
                        </span>
                      </>
                    )}
                  </div>
                )
              })}
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">vs</span>
            </div>
          ) : (
            // Multi-participant row of avatars
            <div className="flex items-center gap-1.5">
              {debaters.map((p) => {
                const colors = getAvatarColors(p.archetype)
                const initials = p.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <span
                    key={p.id}
                    title={p.name}
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {initials}
                  </span>
                )
              })}
              <span className="ml-1 truncate text-xs text-neutral-400">
                {debaters.map((p) => p.name).join(' · ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Title ── */}
      <h3 className="line-clamp-2 font-semibold leading-snug text-neutral-100 group-hover:text-white">
        {title}
      </h3>

      {/* ── Headline (desktop only) ── */}
      {headline && (
        <p className="mt-1 hidden text-sm leading-relaxed text-neutral-400 line-clamp-2 sm:block">
          {headline}
        </p>
      )}

      {/* ── Audio Controls ── */}
      <div
        className="mt-4 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={displayDuration || 100}
            step={1}
            value={currentTime}
            onChange={handleSeek}
            disabled={!hasAudio}
            aria-label="Seek"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full disabled:cursor-default disabled:opacity-40"
            style={{
              background: `linear-gradient(to right, white ${progressPercent}%, rgb(64 64 64) ${progressPercent}%)`,
            }}
          />
        </div>

        {/* Time labels */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <span className="tabular-nums">{formatTime(displayDuration)}</span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left: transport */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => skipTime(e, -10)}
              disabled={!hasAudio}
              className="flex size-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-default disabled:opacity-40"
              aria-label="Skip back 10 seconds"
            >
              <SkipBackIcon />
            </button>

            <button
              onClick={togglePlay}
              disabled={!hasAudio}
              className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-900 shadow transition hover:bg-neutral-200 disabled:cursor-default disabled:opacity-40"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button
              onClick={(e) => skipTime(e, 10)}
              disabled={!hasAudio}
              className="flex size-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-default disabled:opacity-40"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForwardIcon />
            </button>
          </div>

          {/* Right: Open Room CTA */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/debates/${slug}`)
            }}
            className="flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-neutral-900 shadow-sm transition hover:bg-neutral-100 hover:shadow-md active:scale-95"
          >
            Open Room
            <ArrowRightIcon />
          </button>
        </div>
      </div>

      {!hasAudio && (
        <p className="mt-3 text-xs text-neutral-600">Recording unavailable</p>
      )}
    </div>
  )
}
