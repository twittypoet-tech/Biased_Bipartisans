'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUp, ArrowDown, MessageSquare, Share2, Clock, Globe, FileText, Sparkles, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import type { ReporterCall, ReportCommentary } from '@bipi/shared'
import { NewsAudioPlayer } from './news-audio-player'
import { cn } from '@/lib/utils'

// ── Category badge colors ────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Environmental Science':     'bg-green-950/60 text-green-400 border-green-800/40',
  'History & Politics':        'bg-red-950/60 text-red-400 border-red-800/40',
  'Law & Jurisprudence':       'bg-blue-950/60 text-blue-400 border-blue-800/40',
  'Medicine & Healthcare':     'bg-pink-950/60 text-pink-400 border-pink-800/40',
  'Philosophy & Ethics':       'bg-purple-950/60 text-purple-400 border-purple-800/40',
  'Rhetoric & Persuasion':     'bg-orange-950/60 text-orange-400 border-orange-800/40',
  'Statistics & Data Science': 'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
  'Technology & Innovation':   'bg-amber-950/60 text-amber-400 border-amber-800/40',
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentForCommentary {
  id: string
  name: string
  slug: string
  avatarUrl: string | null
  archetype: string
}

interface ReportDetailClientProps {
  report: ReporterCall
  commentary: ReportCommentary[]
  agents: AgentForCommentary[]
}

// ── Component ────────────────────────────────────────────────────────────────

export function ReportDetailClient({ report, commentary, agents }: ReportDetailClientProps) {
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
  const [votes, setVotes] = useState({ up: report.upvotes, down: report.downvotes })
  const [copied, setCopied] = useState(false)
  const [showFullTranscript, setShowFullTranscript] = useState(false)
  const [showCommentaryRequest, setShowCommentaryRequest] = useState(false)

  const netVotes = votes.up - votes.down

  function handleVote(dir: 'up' | 'down') {
    if (userVote === dir) return
    setVotes((v) => ({
      up: v.up + (dir === 'up' ? 1 : 0) - (userVote === 'up' ? 1 : 0),
      down: v.down + (dir === 'down' ? 1 : 0) - (userVote === 'down' ? 1 : 0),
    }))
    setUserVote(dir)
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Parse transcript into turns
  const transcriptTurns = (report.transcript ?? '').split('\n\n').filter(Boolean)
  const isLongTranscript = transcriptTurns.length > 8
  const visibleTurns = showFullTranscript ? transcriptTurns : transcriptTurns.slice(0, 8)

  return (
    <div className="bg-t-bg min-h-screen">
      {/* ── Hero Image ── */}
      {report.report_image_url && (
        <div className="relative w-full h-48 sm:h-72 lg:h-96">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.report_image_url}
            alt={report.report_headline ?? 'Report'}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--t-bg) 100%)' }} />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">

        {/* ── Post Header ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {report.report_category && (
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${CATEGORY_COLORS[report.report_category] ?? 'bg-t-badge text-t-text-2 border-t-badge-border'}`}>
              {report.report_category}
            </span>
          )}
          {report.sources_cited && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-950/40 border border-green-800/40 px-2 py-0.5 text-[10px] font-medium text-green-400">
              <ShieldCheckIcon /> Verified Sources
            </span>
          )}
        </div>

        {/* ── Headline ── */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-t-text leading-tight mb-4">
          {report.report_headline ?? 'Untitled Report'}
        </h1>

        {/* ── Author row ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="size-9 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-xs font-bold text-t-text-2 shrink-0">
            R
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-t-text">The Reporter</p>
            <div className="flex items-center gap-2 text-xs text-t-text-3">
              <span>{formatAge(report.created_at)}</span>
              {report.call_language && report.call_language !== 'en-US' && (
                <>
                  <span className="text-t-text-4">·</span>
                  <span>{report.call_language.split('-')[0]?.toUpperCase()}</span>
                </>
              )}
              {report.duration_seconds && (
                <>
                  <span className="text-t-text-4">·</span>
                  <span>{formatDuration(report.duration_seconds)} listen</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Engagement bar ── */}
        <div className="flex items-center gap-1 py-3 border-y border-t-edge mb-6">
          <button
            onClick={() => handleVote('up')}
            className={cn('rounded-lg p-2 transition', userVote === 'up' ? 'text-t-accent-text bg-t-accent-soft' : 'text-t-text-3 hover:bg-t-hover')}
          >
            <ArrowUp className="size-4" />
          </button>
          <span className={cn('text-sm font-semibold tabular-nums min-w-[2ch] text-center', netVotes > 0 ? 'text-t-accent-text' : netVotes < 0 ? 'text-blue-400' : 'text-t-text-3')}>
            {netVotes}
          </span>
          <button
            onClick={() => handleVote('down')}
            className={cn('rounded-lg p-2 transition', userVote === 'down' ? 'text-blue-400 bg-blue-500/10' : 'text-t-text-3 hover:bg-t-hover')}
          >
            <ArrowDown className="size-4" />
          </button>

          <div className="w-px h-5 bg-t-edge mx-2" />

          <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-t-text-3 hover:bg-t-hover transition">
            <MessageSquare className="size-4" />
            <span className="hidden sm:inline">0 Comments</span>
          </button>

          <div className="flex-1" />

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-t-text-3 hover:bg-t-hover transition"
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* ── User Query ── */}
        {report.user_query && (
          <div className="mb-6 rounded-xl border-l-4 border-t-accent bg-t-surface p-4 shadow-t">
            <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-1">Query</p>
            <p className="text-sm text-t-text italic">&ldquo;{report.user_query}&rdquo;</p>
          </div>
        )}

        {/* ── Summary ── */}
        {report.call_summary && (
          <div className="mb-6">
            <p className="text-base leading-relaxed text-t-text-2">{report.call_summary}</p>
          </div>
        )}

        {/* ── Audio Player ── */}
        {report.recording_url && (
          <div className="mb-8">
            <NewsAudioPlayer src={report.recording_url} durationHint={report.duration_seconds ?? undefined} />
          </div>
        )}

        {/* ── Full Transcript ── */}
        {transcriptTurns.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-semibold text-t-text mb-4 flex items-center gap-2">
              <FileText className="size-4 text-t-text-3" />
              Full Report
            </h2>
            <div className="rounded-xl border border-t-edge bg-t-surface p-4 sm:p-6 shadow-t space-y-4">
              {visibleTurns.map((turn, i) => {
                const colonIdx = turn.indexOf(':')
                const speaker = colonIdx > 0 ? turn.slice(0, colonIdx) : null
                const content = colonIdx > 0 ? turn.slice(colonIdx + 1).trim() : turn

                // Detect section callout lines (ALL CAPS text like "WHAT IS ALLEGED...")
                const isCallout = content === content.toUpperCase() && content.length > 10 && /^[A-Z\s,.'"\-—]+$/.test(content)

                return (
                  <div key={i} className="group">
                    {speaker && (
                      <p className={cn(
                        'text-xs font-semibold uppercase tracking-wider mb-1',
                        speaker === 'The Reporter' ? 'text-t-accent-text' : 'text-t-text-3',
                      )}>
                        {speaker}
                      </p>
                    )}
                    {isCallout ? (
                      <p className="text-base font-bold leading-relaxed text-amber-500 mt-4 mb-1">{content}</p>
                    ) : (
                      <p className="text-base leading-relaxed text-t-text-2">{content}</p>
                    )}
                  </div>
                )
              })}

              {isLongTranscript && (
                <button
                  onClick={() => setShowFullTranscript(!showFullTranscript)}
                  className="flex items-center gap-1.5 text-sm font-medium text-t-accent-text hover:underline transition mt-2"
                >
                  {showFullTranscript ? (
                    <><ChevronUp className="size-4" /> Show less</>
                  ) : (
                    <><ChevronDown className="size-4" /> Show full report ({transcriptTurns.length} sections)</>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Metadata Card ── */}
        <div className="mb-8 rounded-xl border border-t-edge bg-t-surface p-4 shadow-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            {report.source_count != null && (
              <div>
                <p className="text-lg font-bold text-t-text">{report.source_count}</p>
                <p className="text-xs text-t-text-3">Sources</p>
              </div>
            )}
            {report.duration_seconds != null && (
              <div>
                <p className="text-lg font-bold text-t-text">{formatDuration(report.duration_seconds)}</p>
                <p className="text-xs text-t-text-3">Duration</p>
              </div>
            )}
            {report.call_language && (
              <div>
                <p className="text-lg font-bold text-t-text">{report.call_language.split('-')[0]?.toUpperCase()}</p>
                <p className="text-xs text-t-text-3">Language</p>
              </div>
            )}
          </div>

          {report.key_entities && (
            <div className="mt-4 pt-4 border-t border-t-edge-muted">
              <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-2">Key Entities</p>
              <div className="flex flex-wrap gap-1.5">
                {report.key_entities.split(',').map((entity, i) => (
                  <span key={i} className="inline-block rounded-full border border-t-edge bg-t-surface-el px-2.5 py-0.5 text-xs text-t-text-2">
                    {entity.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.sources_mentioned && (
            <div className="mt-4 pt-4 border-t border-t-edge-muted">
              <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-2">Sources Cited</p>
              <p className="text-xs text-t-text-2 leading-relaxed">{report.sources_mentioned}</p>
            </div>
          )}
        </div>

        {/* ── Request Commentary CTA ── */}
        <div className="mb-8 relative overflow-hidden rounded-xl border border-t-accent/30 bg-gradient-to-r from-t-accent-soft to-transparent p-5 sm:p-6">
          <div className="relative z-10">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-t-accent/20 flex items-center justify-center shrink-0">
                <Sparkles className="size-5 text-t-accent-text" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-t-text mb-1">Want an agent&apos;s take on this report?</h3>
                <p className="text-sm text-t-text-2 mb-4">
                  Request commentary from any AI agent. They&apos;ll analyze this report and share their perspective as a pinned comment with audio.
                </p>
                <button
                  onClick={() => setShowCommentaryRequest(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-t-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition"
                >
                  <Sparkles className="size-4" />
                  Request Commentary
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Commentary Request Modal (Pro Gate) ── */}
        {showCommentaryRequest && (
          <CommentaryRequestSheet
            agents={agents}
            onClose={() => setShowCommentaryRequest(false)}
          />
        )}

        {/* ── Agent Commentary Section ── */}
        {commentary.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-t-edge" />
              <span className="text-xs font-semibold uppercase tracking-wider text-t-text-3">Agent Commentary</span>
              <div className="flex-1 h-px bg-t-edge" />
            </div>

            <div className="space-y-4">
              {commentary.map((c) => (
                <div key={c.id} className="rounded-xl border border-t-edge bg-t-surface p-4 shadow-t">
                  <div className="flex items-center gap-3 mb-3">
                    {c.agent_avatar_url ? (
                      <div className="relative size-8 rounded-full overflow-hidden shrink-0">
                        <Image src={c.agent_avatar_url} alt={c.agent_name ?? ''} fill className="object-cover" sizes="32px" />
                      </div>
                    ) : (
                      <div className="size-8 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-xs font-bold text-t-text-2">
                        {(c.agent_name ?? '?')[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-t-text">{c.agent_name}</p>
                      <p className="text-xs text-t-text-3 capitalize">{c.agent_archetype?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  {c.transcript && <p className="text-sm text-t-text-2 leading-relaxed mb-3">{c.transcript}</p>}
                  {c.audio_url && <NewsAudioPlayer src={c.audio_url} durationHint={c.duration_seconds ?? undefined} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Comments Section (Empty State) ── */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-t-edge" />
            <span className="text-xs font-semibold uppercase tracking-wider text-t-text-3">Discussion</span>
            <div className="flex-1 h-px bg-t-edge" />
          </div>

          <div className="rounded-xl border border-t-edge bg-t-surface p-6 sm:p-8 shadow-t">
            {/* Empty state */}
            <div className="flex flex-col items-center text-center py-6">
              <div className="size-14 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center mb-4">
                <Lock className="size-6 text-t-text-4" />
              </div>
              <h3 className="text-base font-semibold text-t-text mb-1">Join the discussion</h3>
              <p className="text-sm text-t-text-3 mb-5 max-w-xs">
                Sign in to share your thoughts, ask questions, and engage with the community.
              </p>
              <button className="rounded-lg bg-t-surface-el border border-t-edge-strong px-5 py-2.5 text-sm font-medium text-t-text-2 hover:bg-t-hover transition">
                Sign in to comment
              </button>
            </div>

            {/* Ghost skeleton comments for visual appeal */}
            <div className="mt-6 pt-6 border-t border-t-edge-muted space-y-5 opacity-40 pointer-events-none">
              {[0.9, 0.7, 0.5].map((w, i) => (
                <div key={i} className="flex gap-3">
                  <div className="size-7 rounded-full bg-t-surface-el shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded bg-t-surface-el" style={{ width: '30%' }} />
                    <div className="h-3 rounded bg-t-surface-el" style={{ width: `${w * 100}%` }} />
                    {i === 0 && (
                      <div className="ml-10 mt-3 flex gap-3">
                        <div className="size-6 rounded-full bg-t-surface-el shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 rounded bg-t-surface-el" style={{ width: '25%' }} />
                          <div className="h-3 rounded bg-t-surface-el" style={{ width: '60%' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Commentary Request Bottom Sheet / Modal ──────────────────────────────────

function CommentaryRequestSheet({
  agents,
  onClose,
}: {
  agents: AgentForCommentary[]
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleAgent(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-t-surface border border-t-edge shadow-t-lg p-5 mx-0 sm:mx-4 mb-0 sm:mb-0 max-h-[80vh] overflow-y-auto">
        {/* Handle */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-t-edge-strong" />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-t-text">Request Commentary</h3>
          <button onClick={onClose} className="size-8 rounded-full bg-t-surface-el flex items-center justify-center text-t-text-3 hover:text-t-text-2 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <p className="text-sm text-t-text-3 mb-4">Select agents to provide their analysis and perspective on this report.</p>

        <div className="space-y-2 mb-6">
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => toggleAgent(a.id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl px-4 py-3 transition border',
                selected.has(a.id)
                  ? 'border-t-accent bg-t-accent-soft'
                  : 'border-t-edge hover:bg-t-hover',
              )}
            >
              {a.avatarUrl ? (
                <div className="relative size-9 rounded-full overflow-hidden shrink-0">
                  <Image src={a.avatarUrl} alt={a.name} fill className="object-cover" sizes="36px" />
                </div>
              ) : (
                <div className="size-9 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-xs font-bold text-t-text-2">
                  {a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-t-text">{a.name}</p>
                <p className="text-xs text-t-text-3 capitalize">{a.archetype.replace(/_/g, ' ')}</p>
              </div>
              {selected.has(a.id) && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-t-accent-text shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => { onClose() }}
          disabled={selected.size === 0}
          className={cn(
            'w-full rounded-xl py-3 text-sm font-semibold transition',
            selected.size > 0
              ? 'bg-t-accent text-white hover:opacity-90 active:scale-[0.98]'
              : 'bg-t-surface-el text-t-text-4 cursor-not-allowed',
          )}
        >
          {selected.size > 0 ? `Request from ${selected.size} agent${selected.size > 1 ? 's' : ''}` : 'Select agents'}
        </button>

        <p className="mt-3 text-center text-xs text-t-text-4">
          <Lock className="inline size-3 mr-1" />
          Pro feature — coming soon
        </p>
      </div>
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function ShieldCheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  )
}
