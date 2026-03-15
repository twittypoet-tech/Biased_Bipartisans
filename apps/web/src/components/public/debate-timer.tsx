'use client'

import { useEffect, useState } from 'react'

interface DebateTimerProps {
  /** ISO timestamp when the debate started */
  startedAt: string
  /** ISO timestamp when the debate ended (for past debates) */
  endedAt?: string | null
  /** Estimated total duration in seconds (from format round_sequence) */
  estimatedDurationSec: number
  /** 'live' ticks every second; 'static' shows fixed duration */
  mode: 'live' | 'static'
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

export function DebateTimer({ startedAt, endedAt, estimatedDurationSec, mode }: DebateTimerProps) {
  const [elapsed, setElapsed] = useState(() => {
    const end = endedAt ? new Date(endedAt).getTime() : Date.now()
    return Math.floor((end - new Date(startedAt).getTime()) / 1000)
  })

  useEffect(() => {
    if (mode !== 'live') return
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt, mode])

  const progress = estimatedDurationSec > 0
    ? Math.min(100, (elapsed / estimatedDurationSec) * 100)
    : 0

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Clock icon */}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>

      <span className="text-neutral-400 tabular-nums">
        {formatTime(elapsed)}
      </span>

      {estimatedDurationSec > 0 && (
        <>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-600 tabular-nums">
            ~{formatTime(estimatedDurationSec)}
          </span>

          {/* Mini progress bar */}
          <div className="h-1 w-16 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                progress > 90 ? 'bg-red-500' : progress > 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}
