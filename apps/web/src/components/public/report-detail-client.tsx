'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUp, ArrowDown, MessageSquare, Share2, FileText, Sparkles, Lock, ChevronDown, ChevronUp, ChevronRight, ExternalLink, AlignLeft, Trash2 } from 'lucide-react'
import type { ReporterCall, ReportCommentary, ContentBlock, Callout } from '@bipi/shared'
import { NewsAudioPlayer } from './news-audio-player'
import { useAuth } from '@/components/auth-provider'
import { SignUpCallout, TournamentCallout, SponsoredCallout } from './promo-callouts'
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
  shortBio: string
}

interface ReportDetailClientProps {
  report: ReporterCall
  commentary: ReportCommentary[]
  agents: AgentForCommentary[]
  isOwner?: boolean
  relatedReports?: ReporterCall[]
  upcomingTournament?: { title: string; slug: string } | null
}

const WIRE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  none:     { label: 'Dashboard Only', className: 'bg-t-surface-el text-t-text-3 border-t-edge' },
  pending:  { label: 'Pending Wire Review', className: 'bg-amber-950/40 text-amber-400 border-amber-800/40' },
  approved: { label: 'Published to Wire', className: 'bg-green-950/40 text-green-400 border-green-800/40' },
  rejected: { label: 'Wire Request Declined', className: 'bg-red-950/40 text-red-400 border-red-800/40' },
  auto:     { label: 'Published to Wire', className: 'bg-green-950/40 text-green-400 border-green-800/40' },
}

// ── Component ────────────────────────────────────────────────────────────────

export function ReportDetailClient({ report, commentary: initialCommentary, agents, isOwner = false, relatedReports = [], upcomingTournament }: ReportDetailClientProps) {
  const { profile } = useAuth()
  const [commentary, setCommentary] = useState(initialCommentary)
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
  const [votes, setVotes] = useState({ up: report.upvotes, down: report.downvotes })
  const [copied, setCopied] = useState(false)
  const [showFullTranscript, setShowFullTranscript] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showCommentaryRequest, setShowCommentaryRequest] = useState(false)
  const [wireStatus, setWireStatus] = useState(report.wire_status)
  const [publishRequesting, setPublishRequesting] = useState(false)

  const netVotes = votes.up - votes.down
  const canRequestCommentary = isOwner || profile?.role === 'journalist' || profile?.role === 'admin'

  async function handleDeleteCommentary(commentaryId: string) {
    if (!confirm('Remove this commentary?')) return
    try {
      const res = await fetch(`/api/commentary/${commentaryId}`, { method: 'DELETE' })
      if (res.ok) setCommentary((prev) => prev.filter((c) => c.id !== commentaryId))
    } catch {}
  }

  function handleVote(dir: 'up' | 'down') {
    if (userVote === dir) return
    setVotes((v) => ({
      up: v.up + (dir === 'up' ? 1 : 0) - (userVote === 'up' ? 1 : 0),
      down: v.down + (dir === 'down' ? 1 : 0) - (userVote === 'down' ? 1 : 0),
    }))
    setUserVote(dir)
  }

  async function handleShare() {
    const shareData = {
      title: report.report_headline ?? 'Report — Biased Bipartisans',
      text: report.call_summary ?? '',
      url: window.location.href,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* user cancelled */ }
    } else {
      // Desktop fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleRequestPublish() {
    if (publishRequesting) return
    setPublishRequesting(true)
    try {
      const res = await fetch('/api/reporter/request-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: report.id }),
      })
      if (res.ok) {
        setWireStatus('pending')
      }
    } catch {
      // silently fail
    } finally {
      setPublishRequesting(false)
    }
  }

  // Parse transcript — strip Caller lines, show only Reporter's report
  // The transcript is: Caller lines... then "The Reporter: ..." followed by
  // the rest of the report as plain paragraphs (no prefix).
  const rawTranscript = report.transcript ?? ''
  const reporterStart = rawTranscript.indexOf('The Reporter:')
  const reporterText = reporterStart >= 0
    ? rawTranscript.slice(reporterStart + 'The Reporter:'.length).trim()
    : rawTranscript
  const reporterTurns = reporterText.split('\n\n').filter(Boolean)
  const isLongTranscript = reporterTurns.length > 6
  const visibleTurns = showFullTranscript ? reporterTurns : reporterTurns.slice(0, 6)

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

      {/* ── Category Banner ── */}
      {report.report_category && (
        <div className={`px-4 sm:px-6 py-2 text-[11px] font-semibold uppercase tracking-wider ${CATEGORY_BANNER[report.report_category] ?? 'bg-t-surface-el text-t-text-3'}`}>
          <div className="mx-auto max-w-3xl">{report.report_category}</div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">

        {/* ── Headline ── */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-t-text leading-snug mb-5" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {report.report_headline ?? 'Untitled Report'}
        </h1>

        {/* ── Author row ── */}
        <div className="flex items-center gap-3 mb-4">
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

        {/* ── Audio Player (top of page, below author) ── */}
        {report.recording_url && (
          <div className="mb-5">
            <NewsAudioPlayer src={report.recording_url} durationHint={report.duration_seconds ?? undefined} />
          </div>
        )}

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

          {report.call_summary && (
            <button
              onClick={() => setShowSummary(!showSummary)}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition', showSummary ? 'text-t-accent-text bg-t-accent-soft' : 'text-t-text-3 hover:bg-t-hover')}
            >
              <AlignLeft className="size-4" />
              <span className="hidden sm:inline">Summarize</span>
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-t-text-3 hover:bg-t-hover transition"
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* ── Owner: wire status + publish request ── */}
        {isOwner && (
          <div className="flex items-center gap-3 px-1 py-2">
            {wireStatus && WIRE_STATUS_BADGE[wireStatus] && (
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${WIRE_STATUS_BADGE[wireStatus].className}`}>
                {WIRE_STATUS_BADGE[wireStatus].label}
              </span>
            )}
            {wireStatus === 'none' && (
              <button
                onClick={handleRequestPublish}
                disabled={publishRequesting}
                className="rounded-lg bg-t-accent px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
              >
                {publishRequesting ? 'Requesting...' : 'Request Publish to Wire'}
              </button>
            )}
          </div>
        )}

        {/* ── Summary (toggleable) ── */}
        {showSummary && report.call_summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 rounded-xl border border-t-edge bg-t-surface p-4 shadow-t"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-2">Summary</p>
            <p className="text-sm leading-relaxed text-t-text-2">{report.call_summary}</p>
          </motion.div>
        )}

        {/* ── Report body (structured or plain text fallback) ── */}
        {(report.body?.length || reporterTurns.length > 0) && (
          <div className="mb-8">

            {report.body && report.body.length > 0 ? (
              /* ── Structured editorial content ── */
              <div className="space-y-5">
                {buildReportBody(report.body, report.callouts ?? [], [
                  <SignUpCallout key="promo-signup" />,
                  <TournamentCallout key="promo-tournament" title={upcomingTournament?.title} slug={upcomingTournament?.slug} />,
                  <SponsoredCallout key="promo-sponsored" />,
                ])}
              </div>
            ) : (
              /* ── Plain text fallback for legacy reports ── */
              <div className="rounded-xl border border-t-edge bg-t-surface p-4 sm:p-6 shadow-t space-y-4">
                {visibleTurns.map((turn, i) => (
                  <p key={i} className="text-base leading-relaxed text-t-text-2">{turn}</p>
                ))}
                {isLongTranscript && (
                  <button
                    onClick={() => setShowFullTranscript(!showFullTranscript)}
                    className="flex items-center gap-1.5 text-sm font-medium text-t-accent-text hover:underline transition mt-2"
                  >
                    {showFullTranscript ? (
                      <><ChevronUp className="size-4" /> Show less</>
                    ) : (
                      <><ChevronDown className="size-4" /> Continue reading ({reporterTurns.length - 6} more sections)</>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Agent Commentary Section (immediately after article) ── */}
        {commentary.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-t-edge" />
              <span className="text-xs font-semibold uppercase tracking-wider text-t-text-3">Agent Commentary</span>
              <div className="flex-1 h-px bg-t-edge" />
            </div>

            <div className="space-y-4">
              {commentary.map((c) => (
                <CommentaryCard key={c.id} commentary={c} isOwner={isOwner} onDelete={() => handleDeleteCommentary(c.id)} />
              ))}
            </div>
          </div>
        )}

        {/* ── Related Reports Carousel ── */}
        {relatedReports.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-t-edge" />
              <span className="text-xs font-semibold uppercase tracking-wider text-t-text-3">Related Reports</span>
              <div className="flex-1 h-px bg-t-edge" />
            </div>

            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
              {relatedReports.map((r) => (
                <Link key={r.id} href={`/reports/${r.slug}`} className="snap-start shrink-0 w-[220px] sm:w-[260px] group">
                  <div className="rounded-xl border border-t-edge bg-t-surface overflow-hidden shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg h-full">
                    {r.report_category && (
                      <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_BANNER[r.report_category] ?? 'bg-t-surface-el text-t-text-3'}`}>
                        {r.report_category}
                      </div>
                    )}
                    <div className="p-3.5">
                      <h4 className="text-sm font-semibold text-t-text leading-snug group-hover:text-t-accent-text transition mb-2">
                        {r.report_headline ?? 'Untitled'}
                      </h4>
                      <p className="text-[11px] text-t-text-3">{formatAge(r.created_at)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Sources & Entities Card ── */}
        <div className="mb-8 rounded-xl border border-t-edge bg-t-surface p-4 shadow-t">
          {report.key_entities && (
            <div>
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

          {(report.sources_json?.length || report.sources_mentioned) && (
            <div className={report.key_entities ? 'mt-4 pt-4 border-t border-t-edge-muted' : ''}>
              <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-3">Sources Cited</p>
              {report.sources_json && report.sources_json.length > 0 ? (
                <ol className="space-y-2">
                  {report.sources_json.map((source, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="shrink-0 text-xs font-bold text-t-text-3 mt-0.5 w-5 text-right">{i + 1}.</span>
                      <div className="min-w-0">
                        {source.url ? (
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-1.5">
                            <span className="text-sm font-medium text-t-accent-text group-hover:underline">{source.title}</span>
                            <ExternalLink className="size-3 shrink-0 text-t-text-4 mt-1 group-hover:text-t-accent-text transition" />
                          </a>
                        ) : (
                          <span className="text-sm text-t-text-2">{source.title}</span>
                        )}
                        {source.url && (
                          <p className="text-[11px] text-t-text-4 truncate max-w-xs">{new URL(source.url).hostname}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : report.sources_mentioned ? (
                <p className="text-xs text-t-text-2 leading-relaxed">{report.sources_mentioned}</p>
              ) : null}
            </div>
          )}

          {report.user_query && (
            <div className="mt-4 pt-4 border-t border-t-edge-muted">
              <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-2">Original Query</p>
              <p className="text-sm text-t-text-2 italic leading-relaxed">&ldquo;{report.user_query}&rdquo;</p>
            </div>
          )}
        </div>

        {/* ── Request Commentary CTA (permission-gated) ── */}
        {canRequestCommentary && (
          <div className="mb-12 relative overflow-hidden rounded-xl border border-t-accent/30 bg-gradient-to-r from-t-accent-soft to-transparent p-5 sm:p-6">
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
        )}

        {/* ── Commentary Request Modal ── */}
        {showCommentaryRequest && (
          <CommentaryRequestSheet
            reportId={report.id}
            agents={agents}
            onClose={() => setShowCommentaryRequest(false)}
            onCommentaryPublished={async () => {
              await new Promise((r) => setTimeout(r, 3000))
              try {
                const res = await fetch(`/api/reports/${report.id}/commentary`)
                if (res.ok) {
                  const data = await res.json()
                  if (data.commentary) setCommentary(data.commentary)
                }
              } catch {}
            }}
          />
        )}
      </div>
    </div>
  )
}

// ── Commentary Card ──────────────────────────────────────────────────────────

const TRANSCRIPT_PREVIEW_LENGTH = 280

function CommentaryCard({ commentary: c, isOwner = false, onDelete }: { commentary: ReportCommentary; isOwner?: boolean; onDelete?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [votes, setVotes] = useState({ up: c.upvotes, down: c.downvotes })
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)

  const netVotes = votes.up - votes.down
  const needsTruncation = (c.transcript?.length ?? 0) > TRANSCRIPT_PREVIEW_LENGTH

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

  const avatarEl = c.agent_avatar_url ? (
    <div className="relative size-9 rounded-full overflow-hidden shrink-0">
      <Image src={c.agent_avatar_url} alt={c.agent_name ?? ''} fill className="object-cover" sizes="36px" />
    </div>
  ) : (
    <div className="size-9 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-xs font-bold text-t-text-2">
      {(c.agent_name ?? '?')[0]}
    </div>
  )

  return (
    <div className="rounded-xl border border-t-edge bg-t-surface p-4 shadow-t">
      {/* Header: avatar (clickable) + name + archetype */}
      <div className="flex items-center gap-3 mb-3">
        {c.agent_slug ? (
          <Link href={`/agents/${c.agent_slug}`} className="hover:opacity-80 transition">
            {avatarEl}
          </Link>
        ) : avatarEl}
        <div className="flex-1 min-w-0">
          {c.agent_slug ? (
            <Link href={`/agents/${c.agent_slug}`} className="hover:underline">
              <p className="text-sm font-semibold text-t-text">{c.agent_name}</p>
            </Link>
          ) : (
            <p className="text-sm font-semibold text-t-text">{c.agent_name}</p>
          )}
          <p className="text-xs text-t-text-3 capitalize">{c.agent_archetype?.replace(/_/g, ' ')}</p>
        </div>

        {/* Vote buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleVote('up')}
            aria-label="Upvote"
            className={cn('rounded p-1.5 transition hover:bg-t-hover', userVote === 'up' ? 'text-amber-400' : 'text-t-text-3')}
          >
            <ArrowUp className="size-3.5" strokeWidth={2.5} />
          </button>
          <span className={cn('text-xs font-semibold tabular-nums min-w-[16px] text-center',
            netVotes > 0 ? 'text-amber-400' : netVotes < 0 ? 'text-blue-400' : 'text-t-text-3')}>
            {netVotes}
          </span>
          <button
            onClick={() => handleVote('down')}
            aria-label="Downvote"
            className={cn('rounded p-1.5 transition hover:bg-t-hover', userVote === 'down' ? 'text-blue-400' : 'text-t-text-3')}
          >
            <ArrowDown className="size-3.5" strokeWidth={2.5} />
          </button>
          {isOwner && onDelete && (
            <button
              onClick={onDelete}
              aria-label="Delete commentary"
              className="rounded p-1.5 transition text-t-text-4 hover:text-red-400 hover:bg-red-500/10 ml-1"
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Transcript with View All toggle */}
      {c.transcript && (
        <div className="mb-3">
          <p className="text-sm text-t-text-2 leading-relaxed">
            {expanded || !needsTruncation
              ? c.transcript
              : c.transcript.slice(0, TRANSCRIPT_PREVIEW_LENGTH).trimEnd() + '...'}
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
      {c.audio_url && <NewsAudioPlayer src={c.audio_url} durationHint={c.duration_seconds ?? undefined} />}
    </div>
  )
}

// ── LiveKit preload (shared singleton) ───────────────────────────────────────

let livekitReady: Promise<typeof import('livekit-client')> | null = null
function preloadLiveKit() {
  if (!livekitReady) livekitReady = import('livekit-client')
  return livekitReady
}

// ── Commentary Request Bottom Sheet / Modal ──────────────────────────────────

type CommentaryStep = 'select' | 'confirm' | 'connecting' | 'live' | 'done' | 'error'

function CommentaryRequestSheet({
  reportId,
  agents,
  onClose,
  onCommentaryPublished,
}: {
  reportId: string
  agents: AgentForCommentary[]
  onClose: () => void
  onCommentaryPublished?: () => void
}) {
  const { user, profile, refreshProfile } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [step, setStep] = useState<CommentaryStep>('select')
  const [error, setError] = useState<string | null>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)

  const roomRef = useRef<any>(null)
  const audioElsRef = useRef<HTMLAudioElement[]>([])

  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null
  const isPro = profile?.tier === 'pro'

  // Preload LiveKit on mount
  useEffect(() => { preloadLiveKit() }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanupAudio(); roomRef.current?.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function attachAudio(el: HTMLAudioElement) {
    el.autoplay = true
    el.style.display = 'none'
    document.body.appendChild(el)
    audioElsRef.current.push(el)
    el.play()
      .then(() => setAudioBlocked(false))
      .catch(() => {
        setTimeout(() => {
          el.play()
            .then(() => setAudioBlocked(false))
            .catch(() => setAudioBlocked(true))
        }, 500)
      })
  }

  function cleanupAudio() {
    for (const el of audioElsRef.current) { el.pause(); el.srcObject = null; el.remove() }
    audioElsRef.current = []
    setAudioBlocked(false)
  }

  function forceUnmute() {
    for (const el of audioElsRef.current) el.play().catch(() => {})
    try { (roomRef.current as any)?.startAudio?.() } catch {}
    setAudioBlocked(false)
  }

  function unlockAudio() {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      if (!(window as any).__bipiAudioCtx) (window as any).__bipiAudioCtx = new AC()
      const ctx = (window as any).__bipiAudioCtx as AudioContext
      if (ctx.state === 'suspended') ctx.resume()
      const buf = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start(0)
    } catch {}
  }

  async function handleRequest() {
    if (!selectedAgent) return

    // Unlock audio SYNCHRONOUSLY before any await (browser autoplay policy)
    unlockAudio()
    setStep('connecting')
    setError(null)

    try {
      const res = await fetch('/api/commentary-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, agentId: selectedAgent.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Request failed')
      }

      const { publicRoomUrl, browserToken, retellUrl, commentaryToken } = await res.json()
      refreshProfile()

      if (!publicRoomUrl && !commentaryToken) {
        throw new Error('Commentary agent not configured yet')
      }

      // Connect to LiveKit to stream commentary audio
      // Same pattern as reporter: prefer public room relay, fall back to direct token
      const { Room, RoomEvent, Track } = await preloadLiveKit()
      cleanupAudio()
      const room = new Room({ adaptiveStream: false, dynacast: false })
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          attachAudio(track.attach())
          setStep('live')
        }
      })

      room.on(RoomEvent.Disconnected, () => {
        cleanupAudio()
        roomRef.current = null
        setStep('done')
        onCommentaryPublished?.()
      })

      if (publicRoomUrl && browserToken) {
        await room.connect(publicRoomUrl, browserToken)
      } else if (commentaryToken) {
        await room.connect(retellUrl, commentaryToken)
      }

      try { await room.startAudio() } catch {
        try { await (room as any).startAudio?.() } catch {}
      }

      // Attach any already-published tracks
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) {
          if (pub.track && pub.isSubscribed) {
            attachAudio(pub.track.attach())
            setStep('live')
          }
        }
      }

      // Periodic retry for stubborn browsers
      const retryInterval = setInterval(() => {
        for (const el of audioElsRef.current) {
          if (el.paused && el.srcObject) el.play().catch(() => {})
        }
      }, 2000)

      // Safety timeout: 10 min max
      setTimeout(() => { clearInterval(retryInterval); room.disconnect() }, 10 * 60 * 1000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('error')
    }
  }

  // ── Render helper: agent avatar ──
  function AgentAvatarEl({ agent, size = 48 }: { agent: AgentForCommentary; size?: number }) {
    if (agent.avatarUrl) {
      return (
        <div className="relative rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
          <Image src={agent.avatarUrl} alt={agent.name} fill className="object-cover" sizes={`${size}px`} />
        </div>
      )
    }
    return (
      <div className="rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center font-bold text-t-text-2 shrink-0"
        style={{ width: size, height: size, fontSize: size > 40 ? 14 : 11 }}>
        {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={step === 'live' || step === 'connecting' ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-t-surface border border-t-edge shadow-t-lg p-5 mx-0 sm:mx-4 mb-0 sm:mb-0 max-h-[80vh] overflow-y-auto">
        {/* Handle */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-t-edge-strong" />
        </div>

        {/* ── Header (hidden during live/connecting) ── */}
        {(step === 'select' || step === 'confirm') && (
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-t-text">Request Commentary</h3>
            <button onClick={onClose} className="size-8 rounded-full bg-t-surface-el flex items-center justify-center text-t-text-3 hover:text-t-text-2 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* ── Step: Select Agent ── */}
        {step === 'select' && (
          <>
            <p className="text-sm text-t-text-3 mb-4">Select an agent to analyze this report and share their perspective.</p>
            <div className="space-y-2">
              {agents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedId(a.id); setStep('confirm') }}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 transition border border-t-edge hover:bg-t-hover hover:border-t-edge-strong"
                >
                  <AgentAvatarEl agent={a} size={36} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-t-text">{a.name}</p>
                    <p className="text-xs text-t-text-3 capitalize">{a.archetype.replace(/_/g, ' ')}</p>
                  </div>
                  <ChevronRight className="size-4 text-t-text-4" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step: Confirm Agent ── */}
        {step === 'confirm' && selectedAgent && (
          <>
            <button
              onClick={() => { setSelectedId(null); setStep('select'); setError(null) }}
              className="flex items-center gap-1.5 text-sm text-t-text-3 hover:text-t-text-2 transition mb-4"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Choose a different agent
            </button>

            <div className="rounded-xl border border-t-accent/30 bg-t-accent-soft p-5 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <AgentAvatarEl agent={selectedAgent} size={48} />
                <div>
                  <p className="text-base font-semibold text-t-text">{selectedAgent.name}</p>
                  <p className="text-xs text-t-text-3 capitalize">{selectedAgent.archetype.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <p className="text-sm text-t-text-2 leading-relaxed">{selectedAgent.shortBio}</p>
            </div>

            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

            {!user ? (
              <div className="text-center">
                <p className="text-sm text-t-text-3 mb-3">Sign in to request commentary</p>
                <a href="/auth" className="inline-flex rounded-xl bg-t-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">Sign In</a>
              </div>
            ) : !isPro ? (
              <div className="text-center">
                <p className="text-sm text-t-text-3 mb-3">Pro subscription required for commentary requests</p>
                <a href="/subscribe" className="inline-flex rounded-xl bg-t-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">Upgrade to Pro</a>
              </div>
            ) : (
              <>
                <button
                  onClick={handleRequest}
                  className="w-full rounded-xl py-3 text-sm font-semibold bg-t-accent text-white hover:opacity-90 active:scale-[0.98] transition"
                >
                  Call {selectedAgent.name}
                </button>
                <p className="mt-2 text-center text-xs text-t-text-4">1 credit per commentary request</p>
              </>
            )}
          </>
        )}

        {/* ── Step: Connecting ── */}
        {step === 'connecting' && selectedAgent && (
          <div className="flex flex-col items-center py-10 gap-5">
            <AgentAvatarEl agent={selectedAgent} size={56} />
            <div className="text-center">
              <p className="text-sm font-semibold text-t-text mb-1">Connecting to {selectedAgent.name}</p>
              <p className="text-xs text-t-text-3">Preparing commentary on this report...</p>
            </div>
            <svg className="animate-spin text-t-accent-text" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        )}

        {/* ── Step: Live Listening ── */}
        {step === 'live' && selectedAgent && (
          <div className="flex flex-col items-center py-8 gap-5">
            <div className="relative">
              <AgentAvatarEl agent={selectedAgent} size={64} />
              <div className="absolute -top-1 -right-1 size-4 rounded-full bg-green-500 border-2 border-t-surface animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-t-text">{selectedAgent.name}</p>
              <p className="text-xs text-t-accent-text font-medium uppercase tracking-wider mt-1">Live Commentary</p>
            </div>

            {/* Waveform */}
            <div className="flex items-end gap-1 h-10">
              {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.65, 0.45, 0.75, 0.55, 0.85].map((h, i) => (
                <div key={i} className="w-1.5 rounded-full bg-amber-400 animate-pulse"
                  style={{ height: `${h * 100}%`, animationDelay: `${i * 70}ms`, animationDuration: '900ms' }} />
              ))}
            </div>

            {/* Audio blocked fallback */}
            {audioBlocked && (
              <button onClick={forceUnmute}
                className="rounded-xl border border-amber-600/50 bg-amber-950/30 px-5 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-950/50 transition">
                Tap to Enable Audio
              </button>
            )}

            <p className="text-xs text-t-text-3 text-center max-w-xs">
              {selectedAgent.name} is analyzing the report and delivering their perspective live.
            </p>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && selectedAgent && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="size-14 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-t-text">Commentary Complete</p>
              <p className="mt-1 text-sm text-t-text-3">
                {selectedAgent.name}&apos;s commentary has been published to this report.
              </p>
            </div>
            <button onClick={onClose}
              className="rounded-xl bg-t-accent px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
              View Commentary
            </button>
          </div>
        )}

        {/* ── Step: Error ── */}
        {step === 'error' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="size-14 rounded-full bg-red-950/40 border border-red-800/60 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
            <p className="text-sm text-red-400 text-center">{error || 'Something went wrong'}</p>
            <div className="flex gap-3">
              <button onClick={() => { setStep('confirm'); setError(null) }}
                className="rounded-xl bg-t-surface-el border border-t-edge-strong px-5 py-2 text-sm text-t-text-2 hover:bg-t-hover transition">
                Try Again
              </button>
              <button onClick={onClose}
                className="rounded-xl px-5 py-2 text-sm text-t-text-3 hover:text-t-text-2 transition">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

// ── Structured content renderers ─────────────────────────────────────────────

function renderReportBlock(block: ContentBlock, idx: number) {
  switch (block.type) {
    case 'paragraph':
      return <p key={idx} className="text-[17px] leading-[1.8] text-t-text-2 mb-1">{block.content}</p>
    case 'heading':
      if ((block.level ?? 2) <= 2) {
        return <h2 key={idx} className="mt-10 mb-4 text-xl sm:text-2xl font-bold text-t-text" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{block.content}</h2>
      }
      return <h3 key={idx} className="mt-8 mb-3 text-lg sm:text-xl font-semibold text-t-text">{block.content}</h3>
    case 'quote':
      return (
        <blockquote key={idx} className="my-6 border-l-4 pl-6" style={{ borderColor: '#C8A44A' }}>
          <p className="text-lg italic leading-[1.7] text-t-text" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{block.content}</p>
        </blockquote>
      )
    case 'divider':
      return <hr key={idx} className="my-10 border-t-edge" />
    default:
      return null
  }
}

const calloutAnimation = {
  initial: { opacity: 0, x: -20 } as const,
  whileInView: { opacity: 1, x: 0 } as const,
  viewport: { once: true, margin: '-50px' as any },
  transition: { duration: 0.5, ease: 'easeOut' as const },
}

function renderReportCallout(callout: Callout, idx: number) {
  switch (callout.type) {

    // ── FACT: Pull-stat / magazine highlight ──
    case 'fact':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-12 py-8 text-center">
          <div className="mx-auto w-20 h-px mb-6" style={{ backgroundColor: '#C8A44A' }} />
          <p className="text-xl sm:text-2xl font-medium leading-snug text-t-text max-w-xl mx-auto" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {callout.content}
          </p>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: '#C8A44A' }}>
            Verified
          </p>
          <div className="mx-auto w-20 h-px mt-6" style={{ backgroundColor: '#C8A44A' }} />
        </motion.div>
      )

    // ── PERSON: Editorial aside ──
    case 'person':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-10 ml-4 sm:ml-8 pl-5 sm:pl-6 relative">
          <div className="absolute left-0 top-0 w-[2px] h-full rounded-full" style={{ backgroundColor: 'rgba(200,164,74,0.4)' }} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: '#C8A44A' }}>Who</p>
          <p className="text-base sm:text-lg leading-[1.7] text-t-text" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {callout.content}
          </p>
        </motion.div>
      )

    // ── DATE: Timeline marker ──
    case 'date':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-10 flex items-start gap-4 ml-4 sm:ml-8">
          <div className="flex flex-col items-center shrink-0 pt-1.5">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: '#C8A44A' }} />
            <div className="w-px flex-1 min-h-[28px]" style={{ backgroundColor: 'rgba(200,164,74,0.3)' }} />
          </div>
          <div className="pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: '#C8A44A' }}>Timeline</p>
            <p className="text-base sm:text-lg leading-[1.7] text-t-text">{callout.content}</p>
          </div>
        </motion.div>
      )

    // ── ISSUE: Editorial note ──
    case 'issue':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-12 py-7">
          <div className="h-px w-full mb-6" style={{ backgroundColor: 'rgba(200,164,74,0.3)' }} />
          <div className="px-4 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: '#C8A44A' }}>At Issue</p>
            <p className="text-lg sm:text-xl leading-[1.6] text-t-text italic" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {callout.content}
            </p>
          </div>
          <div className="h-px w-full mt-6" style={{ backgroundColor: 'rgba(200,164,74,0.3)' }} />
        </motion.div>
      )

    // ── QUOTE: Classic editorial pull-quote ──
    case 'quote':
      return (
        <motion.blockquote key={`co-${idx}`} {...calloutAnimation} className="my-12 py-4 px-4 sm:px-8 relative">
          <span className="absolute -top-3 left-2 sm:left-5 text-6xl sm:text-7xl leading-none font-bold select-none pointer-events-none" style={{ color: '#C8A44A', fontFamily: 'Georgia, "Times New Roman", serif', opacity: 0.3 }}>
            &ldquo;
          </span>
          <p className="text-xl sm:text-2xl italic leading-snug text-t-text relative z-10 pl-4 sm:pl-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {callout.content}
          </p>
        </motion.blockquote>
      )

    default:
      return null
  }
}

function buildReportBody(blocks: ContentBlock[], callouts: Callout[], promoNodes?: React.ReactNode[]): React.ReactNode[] {
  const nodes: React.ReactNode[] = []

  // Build a map of callout positions
  const calloutsByPosition: Record<number, Callout[]> = {}
  const unpositioned: Callout[] = []

  callouts.forEach((c) => {
    if (c.block_order != null) {
      const pos = c.block_order
      if (!calloutsByPosition[pos]) calloutsByPosition[pos] = []
      calloutsByPosition[pos]!.push(c)
    } else {
      unpositioned.push(c)
    }
  })

  // Distribute unpositioned callouts evenly
  if (unpositioned.length > 0 && blocks.length > 0) {
    const step = Math.max(1, Math.floor(blocks.length / (unpositioned.length + 1)))
    unpositioned.forEach((c, i) => {
      const pos = Math.min((i + 1) * step, blocks.length - 1)
      if (!calloutsByPosition[pos]) calloutsByPosition[pos] = []
      calloutsByPosition[pos].push(c)
    })
  }

  // Determine positions for promo callouts — place after existing callouts, evenly spaced
  const promos = promoNodes ?? []
  const promoPositions = new Set<number>()
  if (promos.length > 0 && blocks.length > 3) {
    const promoStep = Math.max(1, Math.floor(blocks.length / (promos.length + 1)))
    promos.forEach((_, i) => {
      promoPositions.add(Math.min((i + 1) * promoStep, blocks.length - 1))
    })
  }
  const promoIter = promos[Symbol.iterator]()

  // Interleave blocks, callouts, and promos
  blocks.forEach((block, i) => {
    nodes.push(renderReportBlock(block, i))
    if (calloutsByPosition[i]) {
      calloutsByPosition[i].forEach((c, ci) => {
        nodes.push(renderReportCallout(c, i * 100 + ci))
      })
    }
    if (promoPositions.has(i)) {
      const next = promoIter.next()
      if (!next.done) nodes.push(next.value)
    }
  })

  return nodes
}

