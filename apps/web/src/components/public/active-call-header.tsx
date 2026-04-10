'use client'

import { useCall } from './call-context'
import { cn } from '@/lib/utils'

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function timerColor(seconds: number): string {
  if (seconds > 60) return 'text-green-300'
  if (seconds > 30) return 'text-amber-300'
  return 'text-red-300'
}

export function ActiveCallHeader() {
  const { callState, agent, timeRemaining, endCall } = useCall()

  if (callState !== 'live' || !agent) return null

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-700/40 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 shadow-lg">
      <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Live indicator + agent */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="size-2.5 rounded-full bg-green-400 animate-pulse" />
            <div className="absolute inset-0 size-2.5 rounded-full bg-green-300 animate-ping opacity-75" />
          </div>
          <p className="text-sm font-bold text-white truncate">
            <span className="text-green-300">LIVE</span>
            <span className="text-amber-200/70 mx-2">·</span>
            <span className="text-white">{agent.name}</span>
          </p>
        </div>

        {/* Timer + end button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={cn(
            'text-base font-bold tabular-nums tracking-tight',
            timerColor(timeRemaining),
            timeRemaining <= 30 && 'animate-pulse',
          )}>
            {formatTimer(timeRemaining)}
          </div>
          <button
            onClick={endCall}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500 active:scale-95"
          >
            End
          </button>
        </div>
      </div>
    </div>
  )
}
