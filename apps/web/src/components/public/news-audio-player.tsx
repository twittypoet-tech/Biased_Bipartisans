'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

const SPEEDS = [0.75, 1, 1.25, 1.5] as const

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface NewsAudioPlayerProps {
  src: string
  durationHint?: number | null // seconds, used as display hint before metadata loads
}

export function NewsAudioPlayer({ src, durationHint }: NewsAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState<number>(durationHint ?? 0)
  const [speed, setSpeed] = useState<number>(1)
  const [isDragging, setIsDragging] = useState(false)

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      void audio.play()
    }
  }, [isPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (!isDragging) setCurrentTime(audioRef.current?.currentTime ?? 0)
  }, [isDragging])

  const handleLoadedMetadata = useCallback(() => {
    const d = audioRef.current?.duration
    if (d !== undefined && isFinite(d)) setDuration(d)
  }, [])

  const handleEnded = useCallback(() => setIsPlaying(false), [])

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setCurrentTime(val)
    if (audioRef.current) audioRef.current.currentTime = val
  }, [])

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed as typeof SPEEDS[number])
    const next = SPEEDS[(idx + 1) % SPEEDS.length] ?? 1
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }, [speed])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay  = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const remaining = duration - currentTime

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-700 bg-neutral-900 p-4 sm:p-5">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Controls row */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-neutral-900 transition hover:bg-neutral-200 active:scale-95"
        >
          {isPlaying ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="h-4 w-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          )}
        </button>

        {/* Time elapsed */}
        <span className="w-10 flex-shrink-0 text-right text-xs tabular-nums text-neutral-400">
          {formatTime(currentTime)}
        </span>

        {/* Scrub bar */}
        <div className="relative flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleScrub}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-700 accent-amber-400"
            style={{
              background: `linear-gradient(to right, #f59e0b ${progress}%, #404040 ${progress}%)`,
            }}
          />
        </div>

        {/* Time remaining */}
        <span className="w-12 flex-shrink-0 text-xs tabular-nums text-neutral-400">
          -{formatTime(remaining)}
        </span>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="flex-shrink-0 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-300 transition hover:border-neutral-500 hover:text-white"
        >
          {speed}×
        </button>
      </div>
    </div>
  )
}

/** Compact inline audio player for commentary cards */
export function MiniAudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause() } else { void audio.play() }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay  = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    const onTime  = () => setCurrentTime(audio.currentTime)
    const onMeta  = () => { if (isFinite(audio.duration)) setDuration(audio.duration) }
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
    }
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-700 text-white transition hover:bg-neutral-600 active:scale-95"
      >
        {isPlaying ? (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="h-3 w-3 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
        )}
      </button>
      <div
        className="relative h-1 flex-1 overflow-hidden rounded-full bg-neutral-700"
        style={{ minWidth: '4rem' }}
      >
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-neutral-500">{formatTime(currentTime)}</span>
    </div>
  )
}
