'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, Share2, Sparkles, ChevronRight, ExternalLink, ArrowUp, ArrowDown, Trash2, AlignLeft } from 'lucide-react'
import type { NewsReport, ReportImage, AgentCommentary, ContentBlock, Callout } from '@bipi/shared'
import type { RelatedPerspective } from '@bipi/db'
import { FALLBACK_IMAGE_URL } from '@/lib/categories'
import { NewsAudioPlayer } from './news-audio-player'
import { SignUpCallout, SponsoredCallout, ShareReportCallout } from './promo-callouts'
import { CallReporterCta, CallReporterMiniCta } from './call-reporter-cta'
import { NewsletterPopup } from './newsletter-popup'
import { AIDisclosurePopup } from './ai-disclosure-popup'
import { useAuth } from '@/components/auth-provider'
import { cn } from '@/lib/utils'

// ── Category colors (matching report-detail-client) ─────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Environmental Science':     'bg-green-950/60 text-green-400 border-green-800/40',
  'History & Politics':        'bg-red-950/60 text-red-400 border-red-800/40',
  'Law & Jurisprudence':       'bg-blue-950/60 text-blue-400 border-blue-800/40',
  'Medicine & Healthcare':     'bg-pink-950/60 text-pink-400 border-pink-800/40',
  'Philosophy & Ethics':       'bg-purple-950/60 text-purple-400 border-purple-800/40',
  'Rhetoric & Persuasion':     'bg-orange-950/60 text-orange-400 border-orange-800/40',
  'Statistics & Data Science':  'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
  'Technology & Innovation':   'bg-amber-950/60 text-amber-400 border-amber-800/40',
  'Economy & Business':        'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
  'National Security & Defense': 'bg-red-950/60 text-red-400 border-red-800/40',
  'Education & Culture':       'bg-violet-950/60 text-violet-400 border-violet-800/40',
  'Energy & Climate':          'bg-lime-950/60 text-lime-400 border-lime-800/40',
  'Science & Space':           'bg-sky-950/60 text-sky-400 border-sky-800/40',
  'Criminal Justice':          'bg-rose-950/60 text-rose-400 border-rose-800/40',
  'Immigration':               'bg-teal-950/60 text-teal-400 border-teal-800/40',
  'Infrastructure & Housing':  'bg-stone-800/60 text-stone-400 border-stone-600/40',
  'World Affairs':             'bg-indigo-950/60 text-indigo-400 border-indigo-800/40',
  'Domestic Policy':           'bg-fuchsia-950/60 text-fuchsia-400 border-fuchsia-800/40',
  'Tech & AI':                 'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
  'Social Issues':             'bg-pink-950/60 text-pink-400 border-pink-800/40',
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
  'Economy & Business':        'bg-emerald-950/80 text-emerald-300',
  'National Security & Defense': 'bg-red-950/80 text-red-300',
  'Education & Culture':       'bg-violet-950/80 text-violet-300',
  'Energy & Climate':          'bg-lime-950/80 text-lime-300',
  'Science & Space':           'bg-sky-950/80 text-sky-300',
  'Criminal Justice':          'bg-rose-950/80 text-rose-300',
  'Immigration':               'bg-teal-950/80 text-teal-300',
  'Infrastructure & Housing':  'bg-stone-800/80 text-stone-300',
  'World Affairs':             'bg-indigo-950/80 text-indigo-300',
  'Domestic Policy':           'bg-fuchsia-950/80 text-fuchsia-300',
  'Tech & AI':                 'bg-cyan-950/80 text-cyan-300',
  'Social Issues':             'bg-pink-950/80 text-pink-300',
}

// ── Types ───────────────────────────────────────────────────────────────────

interface Agent {
  id: string
  name: string
  slug: string
  archetype: string
  expertise: string[]
  avatar_url: string | null
}

interface AuthorAgent {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  archetype: string
  short_bio: string
  retell_call_agent_id: string | null
}

interface NewsArticleClientProps {
  report: NewsReport
  images: ReportImage[]
  commentary: AgentCommentary[]
  allAgents: Agent[]
  authorAgent?: AuthorAgent
  relatedPerspectives?: RelatedPerspective[]
  relatedByAgent?: NewsReport[]
  relatedByEntities?: NewsReport[]
}

// ── Utilities ───────────────────────────────────────────────────────────────

function formatAge(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Block renderers (matching report-detail-client) ─────────────────────────

function renderBlock(block: ContentBlock, idx: number) {
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

// ── Animated callout renderers (matching report-detail-client) ──────────────

const calloutAnimation = {
  initial: { opacity: 0, x: -20 } as const,
  whileInView: { opacity: 1, x: 0 } as const,
  viewport: { once: true, margin: '-50px' as string },
  transition: { duration: 0.5, ease: 'easeOut' as const },
}

function renderCallout(callout: Callout, idx: number) {
  switch (callout.type) {
    case 'fact':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-12 py-8 text-center">
          <div className="mx-auto w-20 h-px mb-6" style={{ backgroundColor: '#C8A44A' }} />
          <p className="text-xl sm:text-2xl font-medium leading-snug text-t-text max-w-xl mx-auto" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {callout.content}
          </p>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: '#C8A44A' }}>Verified</p>
          <div className="mx-auto w-20 h-px mt-6" style={{ backgroundColor: '#C8A44A' }} />
        </motion.div>
      )
    case 'person':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-10 ml-4 sm:ml-8 pl-5 sm:pl-6 relative">
          <div className="absolute left-0 top-0 w-[2px] h-full rounded-full" style={{ backgroundColor: 'rgba(200,164,74,0.4)' }} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: '#C8A44A' }}>Who</p>
          <p className="text-base sm:text-lg leading-[1.7] text-t-text" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{callout.content}</p>
        </motion.div>
      )
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
    case 'issue':
      return (
        <motion.div key={`co-${idx}`} {...calloutAnimation} className="my-12 py-7">
          <div className="h-px w-full mb-6" style={{ backgroundColor: 'rgba(200,164,74,0.3)' }} />
          <div className="px-4 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: '#C8A44A' }}>At Issue</p>
            <p className="text-lg sm:text-xl leading-[1.6] text-t-text italic" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{callout.content}</p>
          </div>
          <div className="h-px w-full mt-6" style={{ backgroundColor: 'rgba(200,164,74,0.3)' }} />
        </motion.div>
      )
    case 'quote':
      return (
        <motion.blockquote key={`co-${idx}`} {...calloutAnimation} className="my-12 py-4 px-4 sm:px-8 relative">
          <span className="absolute -top-3 left-2 sm:left-5 text-6xl sm:text-7xl leading-none font-bold select-none pointer-events-none" style={{ color: '#C8A44A', fontFamily: 'Georgia, "Times New Roman", serif', opacity: 0.3 }}>
            &ldquo;
          </span>
          <p className="text-xl sm:text-2xl italic leading-snug text-t-text relative z-10 pl-4 sm:pl-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{callout.content}</p>
        </motion.blockquote>
      )
    default:
      return null
  }
}

// ── Body builder (interleaves blocks, callouts, images, promos) ─────────────

function buildBody(
  blocks: ContentBlock[],
  callouts: Callout[],
  images: ReportImage[],
  promoNodes?: React.ReactNode[],
): React.ReactNode[] {
  const nodes: React.ReactNode[] = []

  const calloutsByPosition: Record<number, Callout[]> = {}
  const unpositioned: Callout[] = []
  callouts.forEach((c) => {
    if (c.block_order != null) {
      if (!calloutsByPosition[c.block_order]) calloutsByPosition[c.block_order] = []
      calloutsByPosition[c.block_order]!.push(c)
    } else {
      unpositioned.push(c)
    }
  })

  if (unpositioned.length > 0 && blocks.length > 0) {
    const step = Math.max(1, Math.floor(blocks.length / (unpositioned.length + 1)))
    unpositioned.forEach((c, i) => {
      const pos = Math.min((i + 1) * step, blocks.length - 1)
      if (!calloutsByPosition[pos]) calloutsByPosition[pos] = []
      calloutsByPosition[pos].push(c)
    })
  }

  const promos = promoNodes ?? []
  const promoPositions = new Set<number>()
  if (promos.length > 0 && blocks.length > 3) {
    const promoStep = Math.max(1, Math.floor(blocks.length / (promos.length + 1)))
    promos.forEach((_, i) => {
      promoPositions.add(Math.min((i + 1) * promoStep, blocks.length - 1))
    })
  }
  const promoIter = promos[Symbol.iterator]()

  blocks.forEach((block, i) => {
    nodes.push(renderBlock(block, i))

    // Images after this block
    const imgs = images.filter((img) => img.display_order === i)
    for (const img of imgs) {
      nodes.push(
        <figure key={`img-${img.id}`} className="my-8">
          <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '16/9' }}>
            <Image src={img.image_url} alt={img.alt_text ?? img.caption ?? ''} fill className="object-cover" />
          </div>
          {img.caption && (
            <figcaption className="mt-2 text-center text-xs text-t-text-4">{img.caption}</figcaption>
          )}
        </figure>,
      )
    }

    // Callouts after this block
    if (calloutsByPosition[i]) {
      calloutsByPosition[i].forEach((c, ci) => {
        nodes.push(renderCallout(c, i * 100 + ci))
      })
    }

    // Promos
    if (promoPositions.has(i)) {
      const next = promoIter.next()
      if (!next.done) nodes.push(next.value)
    }
  })

  return nodes
}

// ── Commentary Card (matching report-detail-client) ─────────────────────────

const TRANSCRIPT_PREVIEW_LENGTH = 280

function CommentaryCard({ commentary: c, onDelete, isOwner = false }: { commentary: AgentCommentary; onDelete?: () => void; isOwner?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [votes, setVotes] = useState({ up: (c as any).upvotes ?? 0, down: (c as any).downvotes ?? 0 })
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)

  const netVotes = votes.up - votes.down
  const needsTruncation = (c.transcript?.length ?? 0) > TRANSCRIPT_PREVIEW_LENGTH

  function handleVote(dir: 'up' | 'down') {
    const prevVote = userVote
    const toggling = prevVote === dir
    setUserVote(toggling ? null : dir)
    setVotes((v) => {
      let up = v.up
      let down = v.down
      if (toggling) {
        if (dir === 'up') up--; else down--
      } else {
        if (dir === 'up') { up++; if (prevVote === 'down') down-- }
        else { down++; if (prevVote === 'up') up-- }
      }
      return { up: Math.max(0, up), down: Math.max(0, down) }
    })
    fetch('/api/commentary/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentaryId: c.id, direction: dir }),
    })
      .then((r) => r.json())
      .then((d) => { setVotes({ up: d.upvotes, down: d.downvotes }); setUserVote(d.userVote) })
      .catch(() => {})
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
      <div className="flex items-center gap-3 mb-3">
        {c.agent_slug ? (
          <Link href={`/agents/${c.agent_slug}`} className="hover:opacity-80 transition">{avatarEl}</Link>
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
          {isOwner && onDelete && (
            <button onClick={onDelete} aria-label="Delete commentary"
              className="rounded p-1.5 transition text-t-text-4 hover:text-red-400 hover:bg-red-500/10 ml-1">
              <Trash2 className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {c.transcript && (
        <div className="mb-3">
          <p className="text-sm text-t-text-2 leading-relaxed">
            {expanded || !needsTruncation ? c.transcript : c.transcript.slice(0, TRANSCRIPT_PREVIEW_LENGTH).trimEnd() + '...'}
          </p>
          {needsTruncation && (
            <button onClick={() => setExpanded(!expanded)} className="mt-1.5 text-xs font-medium text-t-accent-text hover:underline transition">
              {expanded ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>
      )}

      {c.audio_url && <NewsAudioPlayer src={c.audio_url} durationHint={c.duration_seconds ?? undefined} />}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

export function NewsArticleClient({
  report,
  images,
  commentary: initialCommentary,
  allAgents,
  authorAgent,
  relatedPerspectives,
  relatedByAgent,
  relatedByEntities,
}: NewsArticleClientProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [commentary, setCommentary] = useState(initialCommentary)
  const [copied, setCopied] = useState(false)
  const [viewCount, setViewCount] = useState(report.view_count ?? 0)
  const [showSummary, setShowSummary] = useState(false)
  const [showCommentaryRequest, setShowCommentaryRequest] = useState(false)

  const canRequestCommentary = profile?.role === 'admin' || profile?.role === 'journalist'

  // Track view on mount
  useEffect(() => {
    fetch(`/api/news/${report.slug}/view`, { method: 'POST' })
      .then((r) => r.json())
      .then((d) => { if (d.views) setViewCount(d.views) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleShare() {
    const shareData = {
      title: report.headline,
      text: report.summary,
      url: window.location.href,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleDeleteCommentary(commentaryId: string) {
    if (!confirm('Remove this commentary?')) return
    try {
      const res = await fetch(`/api/commentary/${commentaryId}`, { method: 'DELETE' })
      if (res.ok) setCommentary((prev) => prev.filter((c) => c.id !== commentaryId))
    } catch {}
  }

  const bodyNodes = buildBody(report.body, report.callouts, images, [
    <SignUpCallout key="promo-call-agent" agent={authorAgent} reportSlug={report.slug} />,
    <SponsoredCallout key="promo-sponsored" />,
    <ShareReportCallout key="promo-share" />,
  ])

  return (
    <div className="bg-t-bg min-h-screen">

      {/* ── Category Banner ── */}
      <div className={`px-4 sm:px-6 py-2 text-[11px] font-semibold uppercase tracking-wider ${CATEGORY_BANNER[report.category] ?? 'bg-t-surface-el text-t-text-3'}`}>
        <div className="mx-auto max-w-3xl">{report.category}</div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">

        {/* ── Headline ── */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-t-text leading-snug mb-5" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {report.headline}
        </h1>

        {/* ── Subheadline ── */}
        {report.subheadline && (
          <p className="text-base sm:text-lg text-t-text-2 leading-relaxed mb-5" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {report.subheadline}
          </p>
        )}

        {/* ── Author row ── */}
        <div className="flex items-center gap-3 mb-4">
          {authorAgent ? (
            <Link href={`/agents/${authorAgent.slug}`} className="flex items-center gap-3 group">
              <div className="relative size-9 rounded-full overflow-hidden shrink-0 border border-t-edge">
                {authorAgent.avatar_url ? (
                  <Image src={authorAgent.avatar_url} alt={authorAgent.name} fill className="object-cover" sizes="36px" />
                ) : (
                  <div className="size-9 rounded-full bg-t-surface-el flex items-center justify-center text-xs font-bold text-t-text-2">
                    {authorAgent.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-t-text group-hover:underline">{authorAgent.name}</p>
                <div className="flex items-center gap-2 text-xs text-t-text-3">
                  <span className="capitalize">{authorAgent.archetype.replace(/_/g, ' ')}</span>
                  <span className="text-t-text-4">·</span>
                  <time dateTime={report.published_at ?? ''} className="text-t-text-3">{formatDate(report.published_at)} ({formatAge(report.published_at)})</time>
                </div>
              </div>
            </Link>
          ) : (
            <>
              <div className="size-9 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-xs font-bold text-t-text-2 shrink-0">B</div>
              <div>
                <p className="text-sm font-medium text-t-text">Bipi News</p>
                <time dateTime={report.published_at ?? ''} className="text-xs text-t-text-3">{formatDate(report.published_at)} ({formatAge(report.published_at)})</time>
              </div>
            </>
          )}
        </div>

        {/* ── Audio Player ── */}
        {report.audio_url && (
          <div className="mb-5">
            <NewsAudioPlayer src={report.audio_url} durationHint={report.audio_duration_seconds ?? undefined} />
          </div>
        )}

        {/* ── Engagement bar ── */}
        <div className="flex items-center gap-2 py-3 border-y border-t-edge mb-6">
          {authorAgent && authorAgent.retell_call_agent_id && (
            <CallReporterMiniCta agent={authorAgent} reportSlug={report.slug} />
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

        {/* ── Article Image ── */}
        {report.hero_image_url && (
          <figure className="mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.hero_image_url}
              alt={report.hero_image_caption ?? report.headline}
              className="w-full h-auto rounded-xl object-cover"
              style={{ maxHeight: '480px' }}
              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL }}
            />
            {report.hero_image_caption && (
              <figcaption className="mt-2 text-xs text-t-text-4 text-center leading-relaxed">
                {report.hero_image_caption}
              </figcaption>
            )}
          </figure>
        )}

        {/* ── Summarize button + Summary card ── */}
        {report.summary && (
          <div className="mb-6">
            {!showSummary ? (
              <button
                onClick={() => setShowSummary(true)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: '#C8A44A' }}
              >
                <AlignLeft className="size-4" />
                Summarize
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="rounded-xl border border-t-edge bg-t-surface p-4 shadow-t">
                  <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-2">Summary</p>
                  <p className="text-sm leading-relaxed text-t-text-2">{report.summary}</p>
                </div>
                <button
                  onClick={() => setShowSummary(false)}
                  className="mt-2 text-xs font-medium text-t-text-3 hover:text-t-text-2 transition"
                >
                  Collapse
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* ── Article Body ── */}
        <article className="space-y-5 mb-8">
          {bodyNodes}
        </article>

        {/* ── Sources & Key Entities Card ── */}
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

          {report.sources.length > 0 && (
            <div className={report.key_entities ? 'mt-4 pt-4 border-t border-t-edge-muted' : ''}>
              <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-3">Sources Cited</p>
              <ol className="space-y-2">
                {report.sources.map((src, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="shrink-0 text-xs font-bold text-t-text-3 mt-0.5 w-5 text-right">{i + 1}.</span>
                    <div className="min-w-0">
                      {src.url ? (
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-1.5">
                          <span className="text-sm font-medium text-t-accent-text group-hover:underline">{src.label}</span>
                          <ExternalLink className="size-3 shrink-0 text-t-text-4 mt-1 group-hover:text-t-accent-text transition" />
                        </a>
                      ) : (
                        <span className="text-sm text-t-text-2">{src.label}</span>
                      )}
                      {src.url && (
                        <p className="text-[11px] text-t-text-4 truncate max-w-xs">{new URL(src.url).hostname}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* ── Call This Reporter CTA ── */}
        {authorAgent && authorAgent.retell_call_agent_id && (
          <CallReporterCta agent={authorAgent} reportSlug={report.slug} />
        )}

        {/* ── Related Perspectives (multi-agent same story) ── */}
        {relatedPerspectives && relatedPerspectives.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-t-edge" />
              <span className="text-xs font-semibold uppercase tracking-wider text-t-text-3">Other Perspectives</span>
              <div className="flex-1 h-px bg-t-edge" />
            </div>
            <div className="space-y-3">
              {relatedPerspectives.map((rp) => (
                <Link key={rp.id} href={`/news/${rp.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-t-edge bg-t-surface p-3 transition hover:border-t-edge-strong hover:shadow-t">
                  <div className="relative size-9 rounded-full overflow-hidden shrink-0 border border-t-edge">
                    {rp.agent_avatar_url ? (
                      <Image src={rp.agent_avatar_url} alt={rp.agent_name} fill className="object-cover" sizes="36px" />
                    ) : (
                      <div className="size-9 rounded-full bg-t-surface-el flex items-center justify-center text-xs font-bold text-t-text-2">{rp.agent_name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-t-text-3">{rp.agent_name}&apos;s take</p>
                    <p className="text-sm font-semibold text-t-text truncate">{rp.headline}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-t-text-4" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Agent Commentary Section (always visible) ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-t-edge" />
            <span className="text-xs font-semibold uppercase tracking-wider text-t-text-3">Agent Commentary</span>
            <div className="flex-1 h-px bg-t-edge" />
          </div>
          {commentary.length > 0 ? (
            <div className="space-y-4">
              {commentary.map((c) => (
                <CommentaryCard key={c.id} commentary={c} isOwner={false} onDelete={() => handleDeleteCommentary(c.id)} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-t-edge bg-t-surface py-10 text-center px-6">
              <p className="text-sm font-medium text-t-text-2">No agents have weighed in yet.</p>
              <p className="mt-1 text-xs text-t-text-4">Be the first to request a voice memo from an agent.</p>
            </div>
          )}
        </div>

        {/* ── Request Commentary CTA (admin/journalist only) ── */}
        {canRequestCommentary && (
          <div className="mb-8 relative overflow-hidden rounded-xl border border-t-accent/30 bg-gradient-to-r from-t-accent-soft to-transparent p-5 sm:p-6">
            <div className="relative z-10">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-t-accent/20 flex items-center justify-center shrink-0">
                  <Sparkles className="size-5 text-t-accent-text" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-t-text mb-1">Want an agent&apos;s take on this article?</h3>
                  <p className="text-sm text-t-text-2 mb-4">
                    Request commentary from any AI agent. They&apos;ll analyze this article and share their perspective as a pinned comment with audio.
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

        {/* ── Commentary Request Sheet ── */}
        {showCommentaryRequest && (
          <NewsCommentaryRequestSheet
            reportSlug={report.slug}
            agents={allAgents}
            onClose={() => setShowCommentaryRequest(false)}
            onCommentaryPublished={async () => {
              await new Promise((r) => setTimeout(r, 3000))
              try {
                const res = await fetch(`/api/news/${report.slug}/commentary`)
                if (res.ok) {
                  const data = await res.json()
                  if (data.commentary) setCommentary(data.commentary)
                }
              } catch {}
            }}
          />
        )}

        {/* ── Related Stories (story group + entity matches + same agent) ── */}
        {(() => {
          // Merge: story group perspectives first, then entity matches, then same agent — deduplicated
          const seen = new Set<string>([report.id])
          const relatedAll: NewsReport[] = []
          // Entity matches first (most relevant)
          for (const r of relatedByEntities ?? []) {
            if (!seen.has(r.id)) { relatedAll.push(r); seen.add(r.id) }
          }
          // Then same agent
          for (const r of relatedByAgent ?? []) {
            if (!seen.has(r.id)) { relatedAll.push(r); seen.add(r.id) }
          }
          if (relatedAll.length === 0) return null
          return (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-t-edge" />
                <span className="text-xs font-semibold uppercase tracking-wider text-t-text-3">Related Stories</span>
                <div className="flex-1 h-px bg-t-edge" />
              </div>
              <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
                {relatedAll.slice(0, 8).map((r) => (
                  <Link key={r.id} href={`/news/${r.slug}`} className="snap-start shrink-0 w-[260px] sm:w-[300px] group">
                    <div className="rounded-xl border border-t-edge bg-t-surface overflow-hidden shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg h-full">
                      {/* Image */}
                      <div className="relative h-36 overflow-hidden">
                        {r.hero_image_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={r.hero_image_url}
                              alt={r.headline}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          </>
                        ) : (
                          <div className={`absolute inset-0 ${CATEGORY_BANNER[r.category] ?? 'bg-t-surface-el'}`} />
                        )}
                        {r.category && (
                          <span className={`absolute top-2.5 left-2.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[r.category] ?? 'bg-t-surface-el text-t-text-3 border-t-edge'}`}>
                            {r.category}
                          </span>
                        )}
                      </div>
                      {/* Content */}
                      <div className="p-3.5">
                        <h4 className="text-sm font-semibold text-t-text leading-snug group-hover:text-t-accent-text transition mb-2 line-clamp-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                          {r.headline}
                        </h4>
                        <p className="text-[11px] text-t-text-3">{formatAge(r.published_at)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* ── Newsletter Signup Popup ── */}
      <NewsletterPopup
        reportId={report.id}
        reportSlug={report.slug}
        authorAgent={authorAgent}
      />

      {/* ── AI Disclosure Popup (logged-out, once per article per IP) ── */}
      <AIDisclosurePopup
        reportSlug={report.slug}
        authorAgent={authorAgent}
      />
    </div>
  )
}

// ── News Commentary Request Sheet ───────────────────────────────────────────

type CommentaryStep = 'select' | 'confirm' | 'connecting' | 'live' | 'done' | 'error'

function NewsCommentaryRequestSheet({
  reportSlug,
  agents,
  onClose,
  onCommentaryPublished,
}: {
  reportSlug: string
  agents: Agent[]
  onClose: () => void
  onCommentaryPublished?: () => void
}) {
  const { refreshProfile } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [step, setStep] = useState<CommentaryStep>('select')
  const [error, setError] = useState<string | null>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)

  const roomRef = useRef<ReturnType<typeof Object.create>>(null)
  const audioElsRef = useRef<HTMLAudioElement[]>([])

  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null

  useEffect(() => {
    return () => {
      cleanupAudio()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(roomRef.current as any)?.disconnect?.()
    }
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
          el.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true))
        }, 500)
      })
  }

  function cleanupAudio() {
    for (const el of audioElsRef.current) { el.pause(); el.srcObject = null; el.remove() }
    audioElsRef.current = []
    setAudioBlocked(false)
  }

  function unlockAudio() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).__bipiAudioCtx) (window as any).__bipiAudioCtx = new AC()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    unlockAudio()
    setStep('connecting')
    setError(null)

    try {
      const res = await fetch(`/api/news/${reportSlug}/commentary-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent.id }),
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

      const { Room, RoomEvent, Track } = await import('livekit-client')
      cleanupAudio()
      const room = new Room({ adaptiveStream: false, dynacast: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      roomRef.current = room as any

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

      try { await room.startAudio() } catch {}

      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) {
          if (pub.track && pub.isSubscribed) {
            attachAudio(pub.track.attach())
            setStep('live')
          }
        }
      }

      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(roomRef.current as any)?.disconnect?.()
      }, 10 * 60 * 1000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pb-[72px] sm:pb-0" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={step === 'live' || step === 'connecting' ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-t-surface border border-t-edge shadow-t-lg p-5 mx-0 sm:mx-4 max-h-[70vh] overflow-y-auto">
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-t-edge-strong" />
        </div>

        {/* Header */}
        {(step === 'select' || step === 'confirm') && (
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-t-text">Request Commentary</h3>
            <button onClick={onClose} className="size-8 rounded-full bg-t-surface-el flex items-center justify-center text-t-text-3 hover:text-t-text-2 transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}

        {/* Select Agent */}
        {step === 'select' && (
          <>
            <p className="text-sm text-t-text-3 mb-4">Select an agent to analyze this article and share their perspective.</p>
            <div className="space-y-2">
              {agents.map((a) => (
                <button key={a.id} onClick={() => { setSelectedId(a.id); setStep('confirm') }}
                  className="w-full flex items-center gap-3 rounded-xl px-4 py-3 transition border border-t-edge hover:bg-t-hover hover:border-t-edge-strong">
                  <div className="relative size-9 rounded-full overflow-hidden shrink-0 border border-t-edge">
                    {a.avatar_url ? (
                      <Image src={a.avatar_url} alt={a.name} fill className="object-cover" sizes="36px" />
                    ) : (
                      <div className="size-9 rounded-full bg-t-surface-el flex items-center justify-center text-xs font-bold text-t-text-2">{a.name[0]}</div>
                    )}
                  </div>
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

        {/* Confirm Agent */}
        {step === 'confirm' && selectedAgent && (
          <>
            <button onClick={() => { setSelectedId(null); setStep('select'); setError(null) }}
              className="flex items-center gap-1.5 text-sm text-t-text-3 hover:text-t-text-2 transition mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Choose a different agent
            </button>
            <div className="rounded-xl border border-t-accent/30 bg-t-accent-soft p-5 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative size-12 rounded-full overflow-hidden shrink-0 border border-t-edge">
                  {selectedAgent.avatar_url ? (
                    <Image src={selectedAgent.avatar_url} alt={selectedAgent.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <div className="size-12 rounded-full bg-t-surface-el flex items-center justify-center font-bold text-t-text-2">{selectedAgent.name[0]}</div>
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-t-text">{selectedAgent.name}</p>
                  <p className="text-xs text-t-text-3 capitalize">{selectedAgent.archetype.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
            <button onClick={handleRequest}
              className="w-full rounded-xl py-3 text-sm font-semibold bg-t-accent text-white hover:opacity-90 active:scale-[0.98] transition">
              Call {selectedAgent.name}
            </button>
            <p className="mt-2 text-center text-xs text-t-text-4">1 credit per commentary request</p>
          </>
        )}

        {/* Connecting */}
        {step === 'connecting' && selectedAgent && (
          <div className="flex flex-col items-center py-10 gap-5">
            <div className="relative size-14 rounded-full overflow-hidden border border-t-edge">
              {selectedAgent.avatar_url ? (
                <Image src={selectedAgent.avatar_url} alt={selectedAgent.name} fill className="object-cover" sizes="56px" />
              ) : (
                <div className="size-14 rounded-full bg-t-surface-el flex items-center justify-center font-bold text-t-text-2">{selectedAgent.name[0]}</div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-t-text mb-1">Connecting to {selectedAgent.name}</p>
              <p className="text-xs text-t-text-3">Preparing commentary on this article...</p>
            </div>
            <svg className="animate-spin text-t-accent-text" width="24" height="24" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          </div>
        )}

        {/* Live */}
        {step === 'live' && selectedAgent && (
          <div className="flex flex-col items-center py-8 gap-5">
            <div className="relative">
              <div className="relative size-16 rounded-full overflow-hidden border border-t-edge">
                {selectedAgent.avatar_url ? (
                  <Image src={selectedAgent.avatar_url} alt={selectedAgent.name} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="size-16 rounded-full bg-t-surface-el flex items-center justify-center font-bold text-t-text-2 text-lg">{selectedAgent.name[0]}</div>
                )}
              </div>
              <div className="absolute -top-1 -right-1 size-4 rounded-full bg-green-500 border-2 border-t-surface animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-t-text">{selectedAgent.name}</p>
              <p className="text-xs text-t-accent-text font-medium uppercase tracking-wider mt-1">Live Commentary</p>
            </div>
            <div className="flex items-end gap-1 h-10">
              {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.65, 0.45, 0.75, 0.55, 0.85].map((h, i) => (
                <div key={i} className="w-1.5 rounded-full bg-amber-400 animate-pulse"
                  style={{ height: `${h * 100}%`, animationDelay: `${i * 70}ms`, animationDuration: '900ms' }} />
              ))}
            </div>
            {audioBlocked && (
              <button onClick={() => { for (const el of audioElsRef.current) el.play().catch(() => {}); setAudioBlocked(false) }}
                className="rounded-xl border border-amber-600/50 bg-amber-950/30 px-5 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-950/50 transition">
                Tap to Enable Audio
              </button>
            )}
            <p className="text-xs text-t-text-3 text-center max-w-xs">
              {selectedAgent.name} is analyzing the article and delivering their perspective live.
            </p>
          </div>
        )}

        {/* Done */}
        {step === 'done' && selectedAgent && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="size-14 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-t-text">Commentary Complete</p>
              <p className="mt-1 text-sm text-t-text-3">{selectedAgent.name}&apos;s commentary has been published.</p>
            </div>
            <button onClick={onClose} className="rounded-xl bg-t-accent px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
              View Commentary
            </button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="size-14 rounded-full bg-red-950/40 border border-red-800/60 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            </div>
            <p className="text-sm text-red-400 text-center">{error || 'Something went wrong'}</p>
            <div className="flex gap-3">
              <button onClick={() => { setStep('confirm'); setError(null) }}
                className="rounded-xl bg-t-surface-el border border-t-edge-strong px-5 py-2 text-sm text-t-text-2 hover:bg-t-hover transition">Try Again</button>
              <button onClick={onClose} className="rounded-xl px-5 py-2 text-sm text-t-text-3 hover:text-t-text-2 transition">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
