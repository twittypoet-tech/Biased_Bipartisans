'use client'

import { useRef, useState } from 'react'
import type { ReporterCall } from '@bipi/shared'

const CATEGORY_COLORS: Record<string, string> = {
  'Environmental Science':    'bg-green-950/60 text-green-400 border-green-800/40',
  'History & Politics':       'bg-red-950/60 text-red-400 border-red-800/40',
  'Law & Jurisprudence':      'bg-blue-950/60 text-blue-400 border-blue-800/40',
  'Medicine & Healthcare':    'bg-pink-950/60 text-pink-400 border-pink-800/40',
  'Philosophy & Ethics':      'bg-purple-950/60 text-purple-400 border-purple-800/40',
  'Rhetoric & Persuasion':    'bg-orange-950/60 text-orange-400 border-orange-800/40',
  'Statistics & Data Science':'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
  'Technology & Innovation':  'bg-amber-950/60 text-amber-400 border-amber-800/40',
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'just now'
}

interface ReporterCallCardProps {
  call: ReporterCall
  onUpvote?: (id: string) => void
  onDownvote?: (id: string) => void
  userVote?: 'up' | 'down' | null
}

export function ReporterCallCard({ call, onUpvote, onDownvote, userVote = null }: ReporterCallCardProps) {
  const netVotes = call.upvotes - call.downvotes

  return (
    <article className="flex gap-3 rounded-xl border border-t-edge bg-t-surface p-4 shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg">

      {/* ── Vote column ── */}
      <div className="flex flex-col items-center gap-1 pt-0.5 min-w-[32px]">
        <button
          onClick={() => onUpvote?.(call.id)}
          aria-label="Upvote"
          className={`rounded p-1 transition hover:bg-t-hover ${userVote === 'up' ? 'text-amber-400' : 'text-t-text-3 hover:text-t-text-2'}`}
        >
          <ArrowUpIcon />
        </button>
        <span className={`text-xs font-semibold tabular-nums ${netVotes > 0 ? 'text-amber-400' : netVotes < 0 ? 'text-blue-400' : 'text-t-text-3'}`}>
          {netVotes}
        </span>
        <button
          onClick={() => onDownvote?.(call.id)}
          aria-label="Downvote"
          className={`rounded p-1 transition hover:bg-t-hover ${userVote === 'down' ? 'text-blue-400' : 'text-t-text-3 hover:text-t-text-2'}`}
        >
          <ArrowDownIcon />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {call.report_category && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_COLORS[call.report_category] ?? 'bg-t-badge text-t-text-2 border-t-badge-border'}`}>
              {call.report_category}
            </span>
          )}
          {call.sources_cited === true && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-950/40 border border-green-800/40 px-2 py-0.5 text-[10px] font-medium text-green-400">
              <ShieldCheckIcon /> Verified Sources
            </span>
          )}
          {call.sources_cited === false && (
            <span className="inline-flex items-center gap-1 rounded-full bg-t-badge border border-t-badge-border px-2 py-0.5 text-[10px] font-medium text-t-text-3">
              Unverified
            </span>
          )}
        </div>

        {/* Headline */}
        <h3 className="text-sm font-semibold text-t-text leading-snug mb-1.5">
          {call.report_headline ?? 'Untitled Report'}
        </h3>

        {/* Reporter + timestamp */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="size-5 rounded-full bg-t-surface-el border border-t-edge-strong flex items-center justify-center text-[9px] font-bold text-t-text-2 shrink-0">
            R
          </div>
          <span className="text-xs text-t-text-3">The Reporter</span>
          <span className="text-t-text-4">·</span>
          <span className="text-xs text-t-text-3">{formatAge(call.created_at)}</span>
          {call.call_language && call.call_language !== 'en-US' && (
            <>
              <span className="text-t-text-4">·</span>
              <span className="text-xs text-t-text-3">{call.call_language.split('-')[0]?.toUpperCase()}</span>
            </>
          )}
        </div>

        {/* Summary */}
        {call.call_summary && (
          <p className="text-xs text-t-text-2 leading-relaxed mb-3 line-clamp-3">
            {call.call_summary}
          </p>
        )}

        {/* Audio player */}
        {call.recording_url && (
          <AudioPlayer url={call.recording_url} durationSeconds={call.duration_seconds} />
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-t-edge-muted">
          {call.source_count != null && call.source_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-t-text-3">
              <SourceIcon />
              {call.source_count} {call.source_count === 1 ? 'source' : 'sources'}
            </span>
          )}
          {call.key_entities && (
            <span className="text-[11px] text-t-text-3 truncate max-w-[260px]" title={call.key_entities}>
              {call.key_entities}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Audio player ──────────────────────────────────────────────────────────────

function AudioPlayer({ url, durationSeconds }: { url: string; durationSeconds: number | null }) {
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent]   = useState(0)

  const duration = durationSeconds ?? 0

  function togglePlay() {
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
      audioRef.current.ontimeupdate = () => {
        const a = audioRef.current!
        setCurrent(a.currentTime)
        setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0)
      }
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); setCurrent(0) }
    }
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}) }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = pct * audioRef.current.duration
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-t-surface-el border border-t-edge px-3 py-2">
      <button
        onClick={togglePlay}
        className="size-7 rounded-full bg-t-accent flex items-center justify-center shrink-0 hover:opacity-90 transition active:scale-95"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full bg-t-surface-inset cursor-pointer overflow-hidden" onClick={seek} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-amber-400 transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <span className="text-[10px] text-t-text-3 tabular-nums shrink-0">
        {playing || current > 0 ? fmt(current) : (duration > 0 ? fmt(duration) : '--:--')}
      </span>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ArrowUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}
function ArrowDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
      <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>
  )
}
function ShieldCheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  )
}
function SourceIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}
