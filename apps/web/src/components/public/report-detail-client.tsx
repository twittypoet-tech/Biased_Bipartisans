'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUp, ArrowDown, MessageSquare, Share2, FileText, Sparkles, Lock, ChevronDown, ChevronUp, ChevronRight, ExternalLink, AlignLeft } from 'lucide-react'
import type { ReporterCall, ReportCommentary, ContentBlock, Callout } from '@bipi/shared'
import { NewsAudioPlayer } from './news-audio-player'
import { useAuth } from '@/components/auth-provider'
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
  shortBio: string
}

interface ReportDetailClientProps {
  report: ReporterCall
  commentary: ReportCommentary[]
  agents: AgentForCommentary[]
  isOwner?: boolean
}

const WIRE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  none:     { label: 'Dashboard Only', className: 'bg-t-surface-el text-t-text-3 border-t-edge' },
  pending:  { label: 'Pending Wire Review', className: 'bg-amber-950/40 text-amber-400 border-amber-800/40' },
  approved: { label: 'Published to Wire', className: 'bg-green-950/40 text-green-400 border-green-800/40' },
  rejected: { label: 'Wire Request Declined', className: 'bg-red-950/40 text-red-400 border-red-800/40' },
  auto:     { label: 'Published to Wire', className: 'bg-green-950/40 text-green-400 border-green-800/40' },
}

// ── Component ────────────────────────────────────────────────────────────────

export function ReportDetailClient({ report, commentary: initialCommentary, agents, isOwner = false }: ReportDetailClientProps) {
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
              <div className="space-y-1">
                {buildReportBody(report.body, report.callouts ?? [])}
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

          {/* Sources Cited — structured links if available, plain text fallback */}
          {(report.sources_json?.length || report.sources_mentioned) && (
            <div className="mt-4 pt-4 border-t border-t-edge-muted">
              <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-3">Sources Cited</p>
              {report.sources_json && report.sources_json.length > 0 ? (
                <ol className="space-y-2">
                  {report.sources_json.map((source, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="shrink-0 text-xs font-bold text-t-text-3 mt-0.5 w-5 text-right">{i + 1}.</span>
                      <div className="min-w-0">
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-1.5"
                          >
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

          {/* User query — blended into metadata card */}
          {report.user_query && (
            <div className="mt-4 pt-4 border-t border-t-edge-muted">
              <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-2">Original Query</p>
              <p className="text-sm text-t-text-2 italic leading-relaxed">&ldquo;{report.user_query}&rdquo;</p>
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

        {/* ── Commentary Request Modal ── */}
        {showCommentaryRequest && (
          <CommentaryRequestSheet
            reportId={report.id}
            agents={agents}
            onClose={() => setShowCommentaryRequest(false)}
            onCommentaryPublished={async () => {
              // Wait a moment for the webhook to process, then refresh commentary
              await new Promise((r) => setTimeout(r, 3000))
              try {
                const res = await fetch(`/api/reports/${report.id}/commentary`)
                if (res.ok) {
                  const data = await res.json()
                  if (data.commentary) setCommentary(data.commentary)
                }
              } catch { /* page will show updated commentary on next visit */ }
            }}
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
                <CommentaryCard key={c.id} commentary={c} />
              ))}
            </div>
          </div>
        )}

        {/* ── Discussion: Live Chat with The Reporter ── */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-t-edge" />
            <span className="text-xs font-semibold uppercase tracking-wider text-t-text-3">Discussion</span>
            <div className="flex-1 h-px bg-t-edge" />
          </div>

          <ReporterChat reportId={report.id} />
        </div>
      </div>
    </div>
  )
}

// ── Reporter Chat (Discussion) ───────────────────────────────────────────────

interface ChatMsg {
  id: string
  role: 'user' | 'reporter'
  display_name: string | null
  content: string
  created_at: string
}

function ReporterChat({ reportId }: { reportId: string }) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load chat history on mount
  useEffect(() => {
    fetch(`/api/reports/${reportId}/chat`)
      .then((r) => r.json())
      .then((d) => { setMessages(d.messages ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [reportId])

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSend() {
    if (!input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)

    // Optimistic: add user message immediately
    const tempUserMsg: ChatMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      display_name: profile?.display_name ?? 'You',
      content: msg,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const res = await fetch(`/api/reports/${reportId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
        alert(e.error ?? 'Failed to send')
        setInput(msg)
        return
      }
      const { userMessage, reporterMessage } = await res.json()
      // Replace temp with real messages
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        userMessage,
        reporterMessage,
      ])
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id))
      setInput(msg)
    } finally {
      setSending(false)
    }
  }

  if (!loaded) return null

  return (
    <div className="rounded-xl border border-t-edge bg-t-surface shadow-t overflow-hidden">
      {/* Chat thread */}
      <div ref={scrollRef} className="max-h-96 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.length === 0 && !sending && (
          <div className="text-center py-8">
            <div className="size-12 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center mx-auto mb-3 text-sm font-bold text-t-text-2">
              R
            </div>
            <p className="text-sm font-medium text-t-text mb-1">Ask The Reporter</p>
            <p className="text-xs text-t-text-3 max-w-xs mx-auto">
              Have a follow-up question about this report? The Reporter can answer based on the sources cited — and search for more.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
            {/* Avatar */}
            <div className={cn(
              'size-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
              msg.role === 'reporter'
                ? 'bg-t-surface-el border border-t-edge text-t-text-2'
                : 'bg-t-accent-soft text-t-accent-text',
            )}>
              {msg.role === 'reporter' ? 'R' : (msg.display_name?.[0]?.toUpperCase() ?? 'U')}
            </div>

            {/* Bubble */}
            <div className={cn(
              'max-w-[80%] rounded-xl px-4 py-2.5',
              msg.role === 'reporter'
                ? 'bg-t-surface-el border border-t-edge'
                : 'bg-t-accent-soft',
            )}>
              <p className="text-[10px] font-medium text-t-text-3 mb-0.5">
                {msg.role === 'reporter' ? 'The Reporter' : (msg.display_name ?? 'You')}
              </p>
              <p className="text-sm text-t-text leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-3">
            <div className="size-7 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center shrink-0 text-xs font-bold text-t-text-2">R</div>
            <div className="bg-t-surface-el border border-t-edge rounded-xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="size-1.5 rounded-full bg-t-text-3 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-t-edge p-3 sm:p-4">
        {user ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Ask The Reporter a follow-up..."
              disabled={sending}
              className="flex-1 rounded-lg bg-t-surface-el border border-t-edge-strong px-3 py-2.5 text-sm text-t-text placeholder:text-t-text-4 focus:outline-none focus:border-t-accent transition disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className={cn(
                'shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                input.trim() && !sending
                  ? 'bg-t-accent text-white hover:opacity-90 active:scale-95'
                  : 'bg-t-surface-el text-t-text-4 cursor-not-allowed',
              )}
            >
              Send
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className="flex items-center justify-center gap-2 rounded-lg border border-t-edge-strong bg-t-surface-el py-3 text-sm font-medium text-t-text-2 hover:bg-t-hover transition"
          >
            <Lock className="size-4" /> Sign in to ask The Reporter
          </Link>
        )}
        {user && !profile?.tier?.includes('pro') && (
          <p className="mt-2 text-[10px] text-t-text-4 text-center">1 credit per question · {profile?.credits ?? 0} credits remaining</p>
        )}
      </div>
    </div>
  )
}

// ── Commentary Card ──────────────────────────────────────────────────────────

const TRANSCRIPT_PREVIEW_LENGTH = 280

function CommentaryCard({ commentary: c }: { commentary: ReportCommentary }) {
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
      return <p key={idx} className="text-base leading-relaxed text-t-text-2">{block.content}</p>
    case 'heading':
      if ((block.level ?? 2) <= 2) {
        return <h2 key={idx} className="mt-8 mb-3 text-xl font-bold text-t-text sm:text-2xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{block.content}</h2>
      }
      return <h3 key={idx} className="mt-6 mb-2 text-lg font-semibold text-t-text">{block.content}</h3>
    case 'quote':
      return (
        <blockquote key={idx} className="my-5 border-l-4 pl-5" style={{ borderColor: '#C8A44A' }}>
          <p className="text-base italic leading-relaxed text-t-text">{block.content}</p>
        </blockquote>
      )
    case 'divider':
      return <hr key={idx} className="my-8 border-t-edge" />
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
    case 'fact':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-8 rounded-xl overflow-hidden" style={{ boxShadow: '0 0 20px rgba(245,158,11,0.08)' }}>
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />
          <div className="bg-amber-950/40 border border-amber-800/30 border-t-0 rounded-b-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="size-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400">Verified Fact</p>
            </div>
            <p className="text-sm font-semibold text-t-text leading-relaxed">{callout.content}</p>
          </div>
        </motion.div>
      )
    case 'person':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-8 flex gap-4 rounded-xl border-l-4 border-blue-500 p-5" style={{ backgroundColor: 'rgba(30,64,175,0.08)', boxShadow: '0 0 20px rgba(59,130,246,0.06)' }}>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/20">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Key Person</p>
            <p className="text-sm leading-relaxed text-t-text-2">{callout.content}</p>
          </div>
        </motion.div>
      )
    case 'date':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-8 flex gap-4 items-start rounded-xl border border-t-edge bg-t-surface p-5 shadow-t">
          <div className="flex-shrink-0 size-10 rounded-lg bg-t-surface-el border border-t-edge flex items-center justify-center">
            <svg className="h-5 w-5 text-t-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" /></svg>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-t-text-3 mb-1">Timeline</p>
            <p className="text-sm leading-relaxed text-t-text-2">{callout.content}</p>
          </div>
        </motion.div>
      )
    case 'issue':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-8 rounded-xl overflow-hidden" style={{ boxShadow: '0 0 20px rgba(249,115,22,0.06)' }}>
          <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />
          <div className="bg-orange-950/30 border border-orange-800/30 border-t-0 rounded-b-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                <svg className="size-3.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z"/></svg>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Key Issue</p>
            </div>
            <p className="text-sm leading-relaxed text-t-text-2">{callout.content}</p>
          </div>
        </motion.div>
      )
    case 'quote':
      return (
        <motion.blockquote key={`co-${idx}`} {...calloutAnimation} className="my-8 border-l-4 pl-6 py-2" style={{ borderColor: '#C8A44A' }}>
          <p className="text-lg italic leading-relaxed text-t-text" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{callout.content}</p>
        </motion.blockquote>
      )
    default:
      return null
  }
}

function buildReportBody(blocks: ContentBlock[], callouts: Callout[]): React.ReactNode[] {
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

  // Interleave blocks and callouts
  blocks.forEach((block, i) => {
    nodes.push(renderReportBlock(block, i))
    if (calloutsByPosition[i]) {
      calloutsByPosition[i].forEach((c, ci) => {
        nodes.push(renderReportCallout(c, i * 100 + ci))
      })
    }
  })

  return nodes
}

function ShieldCheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  )
}
