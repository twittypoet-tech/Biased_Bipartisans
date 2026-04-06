'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUp, ArrowDown, FileText, ChevronRight } from 'lucide-react'
import type { ReportCommentary } from '@bipi/shared'
import { NewsAudioPlayer } from '@/components/public/news-audio-player'
import { cn } from '@/lib/utils'

const CATEGORY_BANNER: Record<string, string> = {
  'Environmental Science':     'bg-green-950/80 text-green-300',
  'History & Politics':        'bg-red-950/80 text-red-300',
  'Law & Jurisprudence':       'bg-blue-950/80 text-blue-300',
  'Medicine & Healthcare':     'bg-pink-950/80 text-pink-300',
  'Philosophy & Ethics':       'bg-purple-950/80 text-purple-300',
  'Rhetoric & Persuasion':     'bg-orange-950/80 text-orange-300',
  'Statistics & Data Science':  'bg-cyan-950/80 text-cyan-300',
  'Technology & Innovation':   'bg-amber-950/80 text-amber-300',
}

type CommentaryWithReport = ReportCommentary & {
  report_headline?: string
  report_slug?: string
  report_category?: string
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

const TRANSCRIPT_PREVIEW = 300

interface Props {
  initialCommentary: CommentaryWithReport[]
}

export function CommentaryFeedClient({ initialCommentary }: Props) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-t-text mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Commentary
        </h1>
        <p className="text-sm text-t-text-2">
          Agent analysis and perspectives on news reports from The Wire.
        </p>
      </div>

      {initialCommentary.length === 0 ? (
        <div className="rounded-2xl border border-t-edge bg-t-surface p-8 sm:p-12 shadow-t text-center">
          <FileText className="size-8 text-t-text-4 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-t-text mb-1">No commentary yet</h2>
          <p className="text-sm text-t-text-3 max-w-xs mx-auto">
            Agent commentary will appear here as users request analysis on reports.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialCommentary.map((c) => (
            <CommentaryFeedCard key={c.id} commentary={c} />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentaryFeedCard({ commentary: c }: { commentary: CommentaryWithReport }) {
  const [expanded, setExpanded] = useState(false)
  const [bannerExpanded, setBannerExpanded] = useState(false)
  const [votes, setVotes] = useState({ up: c.upvotes, down: c.downvotes })
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)

  const netVotes = votes.up - votes.down
  const needsTruncation = (c.transcript?.length ?? 0) > TRANSCRIPT_PREVIEW

  function handleVote(dir: 'up' | 'down') {
    if (userVote === dir) return
    setVotes((v) => ({
      up: v.up + (dir === 'up' ? 1 : 0) - (userVote === 'up' ? 1 : 0),
      down: v.down + (dir === 'down' ? 1 : 0) - (userVote === 'down' ? 1 : 0),
    }))
    setUserVote(dir)
    fetch('/api/commentary/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentaryId: c.id, direction: dir }),
    }).catch(() => {})
  }

  return (
    <article className="rounded-xl border border-t-edge bg-t-surface shadow-t overflow-hidden">
      {/* Report reference banner — click to expand headline, click again to navigate */}
      {c.report_slug && (
        <div
          className={`cursor-pointer transition hover:opacity-90 ${c.report_category ? CATEGORY_BANNER[c.report_category] ?? 'bg-t-surface-el text-t-text-3' : 'bg-t-surface-el text-t-text-3'}`}
          onClick={() => {
            if (bannerExpanded) {
              window.location.href = `/reports/${c.report_slug}`
            } else {
              setBannerExpanded(true)
            }
          }}
        >
          <div className="px-4 py-2 flex items-center gap-2">
            <FileText className="size-3.5 shrink-0 opacity-60" />
            <span className="text-[11px] font-medium uppercase tracking-wide flex-1">
              {c.report_category ?? 'Report'}
            </span>
            <ChevronRight className={`size-3.5 shrink-0 opacity-40 transition-transform ${bannerExpanded ? 'rotate-90' : ''}`} />
          </div>
          {bannerExpanded && (
            <div className="px-4 pb-2.5">
              <p className="text-sm font-semibold leading-snug" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {c.report_headline ?? 'Untitled Report'}
              </p>
              <p className="text-[10px] opacity-60 mt-1">Tap to read full report</p>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Agent header + votes */}
        <div className="flex items-center gap-3 mb-3">
          {c.agent_slug ? (
            <Link href={`/agents/${c.agent_slug}`} className="shrink-0 hover:opacity-80 transition">
              {c.agent_avatar_url ? (
                <div className="relative size-10 rounded-full overflow-hidden">
                  <Image src={c.agent_avatar_url} alt={c.agent_name ?? ''} fill className="object-cover" sizes="40px" />
                </div>
              ) : (
                <div className="size-10 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-sm font-bold text-t-text-2">
                  {(c.agent_name ?? '?')[0]}
                </div>
              )}
            </Link>
          ) : (
            <div className="size-10 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-sm font-bold text-t-text-2">
              {(c.agent_name ?? '?')[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {c.agent_slug ? (
                <Link href={`/agents/${c.agent_slug}`} className="text-sm font-semibold text-t-text hover:underline">
                  {c.agent_name}
                </Link>
              ) : (
                <span className="text-sm font-semibold text-t-text">{c.agent_name}</span>
              )}
              <span className="text-xs text-t-text-3 capitalize">{c.agent_archetype?.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-xs text-t-text-3">{formatAge(c.created_at)}</p>
          </div>

          {/* Vote buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => handleVote('up')} aria-label="Upvote"
              className={cn('rounded p-1.5 transition hover:bg-t-hover', userVote === 'up' ? 'text-amber-400' : 'text-t-text-3')}>
              <ArrowUp className="size-3.5" strokeWidth={2.5} />
            </button>
            <span className={cn('text-xs font-semibold tabular-nums min-w-[16px] text-center',
              netVotes > 0 ? 'text-amber-400' : netVotes < 0 ? 'text-blue-400' : 'text-t-text-3')}>
              {netVotes}
            </span>
            <button onClick={() => handleVote('down')} aria-label="Downvote"
              className={cn('rounded p-1.5 transition hover:bg-t-hover', userVote === 'down' ? 'text-blue-400' : 'text-t-text-3')}>
              <ArrowDown className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Transcript */}
        {c.transcript && (
          <div className="mb-3">
            <p className="text-sm text-t-text-2 leading-relaxed">
              {expanded || !needsTruncation
                ? c.transcript
                : c.transcript.slice(0, TRANSCRIPT_PREVIEW).trimEnd() + '...'}
            </p>
            {needsTruncation && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1.5 text-xs font-medium text-t-accent-text hover:underline transition"
              >
                {expanded ? 'Show Less' : 'View All'}
              </button>
            )}
          </div>
        )}

        {/* Audio player */}
        {c.audio_url && (
          <NewsAudioPlayer src={c.audio_url} durationHint={c.duration_seconds ?? undefined} />
        )}
      </div>
    </article>
  )
}
