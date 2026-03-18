'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface PastDebateCardProps {
  title: string
  slug: string
  headline: string
  endedAt: string | null
  startedAt: string | null
  recordingUrl: string | null
}

function formatTime(seconds: number) {
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

// Inline SVG icons
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
      <path d="M6 18l8.5-6L6 6v12zm2.5-6L6 18V6zM16 6h2v12h-2z" />
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  )
}

function MuteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
      <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-3-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25A6.957 6.957 0 0 1 14 18.98v2.06A8.99 8.99 0 0 0 17.54 19l2.19 2.19L21 19.73 4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
    </svg>
  )
}

export function PastDebateCard({
  title,
  slug,
  headline,
  endedAt,
  startedAt,
  recordingUrl,
}: PastDebateCardProps) {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => setIsPlaying(false)
    const onCanPlay = () => setIsLoaded(true)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('canplay', onCanPlay)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('canplay', onCanPlay)
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100
    }
  }, [volume, isMuted])

  const togglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      const audio = audioRef.current
      if (!audio || !recordingUrl) return
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
      setIsPlaying(!isPlaying)
    },
    [isPlaying, recordingUrl],
  )

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const val = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }, [])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    const val = Number(e.target.value)
    setVolume(val)
    if (val > 0 && isMuted) setIsMuted(false)
  }, [isMuted])

  const skipTime = useCallback(
    (e: React.MouseEvent, secs: number) => {
      e.stopPropagation()
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + secs))
    },
    [duration],
  )

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMuted((m) => !m)
  }, [])

  const hasAudio = !!recordingUrl

  // Estimate duration from started_at/ended_at if audio hasn't loaded metadata
  const displayDuration =
    duration > 0
      ? duration
      : startedAt && endedAt
        ? (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
        : 0

  const progressPercent = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0

  return (
    <div
      onClick={() => router.push(`/debates/${slug}`)}
      className="group relative cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-neutral-700 hover:bg-neutral-900"
    >
      {recordingUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} src={recordingUrl} preload="metadata" />
      )}

      {/* Date */}
      <div className="mb-3 flex items-center gap-2 text-xs text-neutral-500">
        {endedAt && <span>{formatDate(endedAt)}</span>}
        {displayDuration > 0 && (
          <>
            <span>·</span>
            <span>{formatTime(displayDuration)}</span>
          </>
        )}
      </div>

      {/* Title + Headline */}
      <h3 className="font-semibold leading-snug text-neutral-100 group-hover:text-white">
        {title}
      </h3>
      {headline && (
        <p className="mt-1 text-sm leading-relaxed text-neutral-400 line-clamp-2">{headline}</p>
      )}

      {/* Audio Controls */}
      <div
        className="mt-4 space-y-3"
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
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-white disabled:cursor-default disabled:opacity-40"
            style={{
              background: `linear-gradient(to right, white ${progressPercent}%, rgb(64 64 64) ${progressPercent}%)`,
            }}
          />
        </div>

        {/* Time labels */}
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(displayDuration)}</span>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left: transport */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => skipTime(e, -10)}
              disabled={!hasAudio}
              className="flex size-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-default disabled:opacity-40"
              aria-label="Skip back 10s"
            >
              <SkipBackIcon />
            </button>

            <button
              onClick={togglePlay}
              disabled={!hasAudio}
              className="flex size-10 items-center justify-center rounded-full bg-white text-neutral-900 transition hover:bg-neutral-200 disabled:cursor-default disabled:opacity-40"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button
              onClick={(e) => skipTime(e, 10)}
              disabled={!hasAudio}
              className="flex size-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-default disabled:opacity-40"
              aria-label="Skip forward 10s"
            >
              <SkipForwardIcon />
            </button>
          </div>

          {/* Right: volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              disabled={!hasAudio}
              className="flex size-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-default disabled:opacity-40"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              disabled={!hasAudio}
              className="w-20 cursor-pointer appearance-none rounded-full bg-neutral-700 accent-white disabled:cursor-default disabled:opacity-40"
              style={{ height: '4px' }}
            />
          </div>
        </div>
      </div>

      {/* No recording indicator */}
      {!hasAudio && (
        <p className="mt-3 text-xs text-neutral-600">Recording unavailable</p>
      )}
    </div>
  )
}
