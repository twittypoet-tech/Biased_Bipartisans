'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { NewsReport, ReportImage, AgentCommentary, ContentBlock, Callout } from '@bipi/shared'
import { getExpertiseColor, getArchetypeColor } from '@/lib/agent-colors'
import { NewsAudioPlayer, MiniAudioPlayer } from './news-audio-player'
import { CommentaryRequestModal } from './commentary-request-modal'
import { ProUpgradeModal } from './pro-upgrade-modal'

interface Agent {
  id: string
  name: string
  slug: string
  archetype: string
  expertise: string[]
  avatar_url: string | null
}

interface NewsArticleClientProps {
  report: NewsReport
  images: ReportImage[]
  commentary: AgentCommentary[]
  allAgents: Agent[]
}

function CategoryBadge({ category }: { category: string }) {
  const colors = getExpertiseColor(category)
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${colors.badge} ${colors.border}`}>
      {category}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDuration(secs: number | null): string {
  if (!secs) return ''
  const m = Math.round(secs / 60)
  return `${m} min listen`
}

function renderCallout(callout: Callout, idx: number) {
  switch (callout.type) {
    case 'person':
      return (
        <div key={idx} className="my-6 flex gap-4 rounded-r-xl border-l-4 border-blue-500 bg-blue-950/30 p-4">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-900/60 text-blue-300 text-sm font-bold">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
          </div>
          <p className="text-sm leading-relaxed text-neutral-300">{callout.content}</p>
        </div>
      )
    case 'fact':
      return (
        <div key={idx} className="my-6 rounded-xl bg-amber-950/30 border border-amber-800/40 p-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-1">Verified Fact</p>
          <p className="text-base font-bold text-white">{callout.content}</p>
        </div>
      )
    case 'date':
      return (
        <div key={idx} className="my-6 flex gap-4 items-start rounded-xl border border-neutral-700 bg-neutral-800/40 p-4">
          <div className="flex-shrink-0 rounded-lg bg-neutral-700 p-2 text-center min-w-[3rem]">
            <svg className="h-5 w-5 text-neutral-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" /></svg>
          </div>
          <p className="text-sm leading-relaxed text-neutral-300">{callout.content}</p>
        </div>
      )
    case 'issue':
      return (
        <div key={idx} className="my-6 rounded-xl border border-orange-800/40 bg-orange-950/30 p-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400 mb-1">Issue</p>
          <p className="text-sm leading-relaxed text-neutral-300">{callout.content}</p>
        </div>
      )
    case 'quote':
      return (
        <blockquote key={idx} className="my-6 border-l-4 border-neutral-600 pl-5">
          <p className="text-base italic leading-relaxed text-neutral-300">{callout.content}</p>
        </blockquote>
      )
    default:
      return null
  }
}

function renderBlock(block: ContentBlock, idx: number) {
  switch (block.type) {
    case 'paragraph':
      return <p key={idx} className="text-base leading-relaxed text-neutral-300">{block.content}</p>
    case 'heading':
      if ((block.level ?? 2) <= 2) {
        return <h2 key={idx} className="mt-8 mb-3 text-xl font-bold text-white sm:text-2xl">{block.content}</h2>
      }
      return <h3 key={idx} className="mt-6 mb-2 text-lg font-semibold text-white">{block.content}</h3>
    case 'quote':
      return (
        <blockquote key={idx} className="my-4 border-l-4 border-neutral-600 pl-5">
          <p className="text-base italic leading-relaxed text-neutral-300">{block.content}</p>
        </blockquote>
      )
    case 'divider':
      return <hr key={idx} className="my-6 border-neutral-700" />
    default:
      return null
  }
}

/** Build an interleaved array: body blocks + images + callouts in correct order */
function buildBodyNodes(
  blocks: ContentBlock[],
  images: ReportImage[],
  callouts: Callout[],
): React.ReactNode[] {
  const nodes: React.ReactNode[] = []

  // Group callouts by block_order (undefined = auto-distribute)
  const pinnedCallouts = new Map<number, Callout[]>()
  const floatingCallouts: Callout[] = []
  for (const c of callouts) {
    if (c.block_order != null) {
      const arr = pinnedCallouts.get(c.block_order) ?? []
      arr.push(c)
      pinnedCallouts.set(c.block_order, arr)
    } else {
      floatingCallouts.push(c)
    }
  }

  // Distribute floating callouts evenly through the body
  const totalBlocks = blocks.length
  const floatingPositions = floatingCallouts.map((_, i) =>
    Math.round(((i + 1) * totalBlocks) / (floatingCallouts.length + 1)),
  )

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (!block) continue
    nodes.push(renderBlock(block, i))

    // Pinned image injections
    const imgs = images.filter((img) => img.display_order === i)
    for (const img of imgs) {
      nodes.push(
        <figure key={`img-${img.id}`} className="my-6">
          <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '16/9' }}>
            <Image src={img.image_url} alt={img.alt_text ?? img.caption ?? ''} fill className="object-cover" />
          </div>
          {img.caption && (
            <figcaption className="mt-2 text-center text-xs text-neutral-500">{img.caption}</figcaption>
          )}
        </figure>,
      )
    }

    // Pinned callouts
    const pinned = pinnedCallouts.get(i) ?? []
    for (const c of pinned) nodes.push(renderCallout(c, nodes.length))

    // Floating callouts
    const floatIdx = floatingPositions.indexOf(i + 1)
    const floatCallout = floatIdx !== -1 ? floatingCallouts[floatIdx] : undefined
    if (floatCallout) nodes.push(renderCallout(floatCallout, nodes.length))
  }

  return nodes
}

function CommentaryCard({ item }: { item: AgentCommentary }) {
  const [expanded, setExpanded] = useState(false)
  const colors = getArchetypeColor(item.agent_archetype ?? '')

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
          {item.agent_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.agent_avatar_url} alt={item.agent_name ?? ''} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            (item.agent_name ?? '?').charAt(0)
          )}
        </div>

        {/* Name + archetype */}
        <div className="flex-1 min-w-0">
          <Link href={`/agents/${item.agent_slug ?? ''}`} className="text-sm font-bold text-white hover:underline">
            {item.agent_name ?? 'Agent'}
          </Link>
          <p className={`text-xs ${colors.text}`}>{(item.agent_archetype ?? '').replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Mini audio player */}
      {item.audio_url && (
        <div className="mt-3">
          <MiniAudioPlayer src={item.audio_url} />
        </div>
      )}

      {/* Transcript (collapsible) */}
      {item.transcript && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`text-xs font-semibold ${colors.text} hover:underline`}
          >
            {expanded ? 'Hide transcript ↑' : 'Read transcript ↓'}
          </button>
          {expanded && (
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.transcript}</p>
          )}
        </div>
      )}
    </div>
  )
}

type ModalState = 'none' | 'request' | 'upgrade' | 'success'

export function NewsArticleClient({ report, images, commentary, allAgents }: NewsArticleClientProps) {
  const [modalState, setModalState] = useState<ModalState>('none')

  const bodyNodes = buildBodyNodes(report.body, images, report.callouts)

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* ── Hero Block ─────────────────────────────────────────────────────── */}
      <div className="relative w-full">
        {report.hero_image_url ? (
          <div className="relative w-full">
            <Image
              src={report.hero_image_url}
              alt={report.hero_image_caption ?? report.headline}
              width={0}
              height={0}
              sizes="100vw"
              priority
              className="h-auto w-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
          </div>
        ) : (
          <div className="h-24 bg-neutral-900" />
        )}

        {/* Hero text */}
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <CategoryBadge category={report.category} />
            <span className="text-xs text-neutral-500">{formatDate(report.published_at)}</span>
            {report.audio_duration_seconds != null && (
              <span className="text-xs text-neutral-500">{formatDuration(report.audio_duration_seconds)}</span>
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
            {report.headline}
          </h1>
          {report.subheadline && (
            <p className="mt-2 text-base leading-relaxed text-neutral-400 sm:text-lg">{report.subheadline}</p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        {/* ── Audio Player ─────────────────────────────────────────────────── */}
        {report.audio_url && (
          <div className="mb-8">
            <NewsAudioPlayer src={report.audio_url} durationHint={report.audio_duration_seconds} />
          </div>
        )}

        {/* ── Report Body ───────────────────────────────────────────────────── */}
        <article className="space-y-5">
          {bodyNodes}
        </article>

        {/* ── Sources ─────────────────────────────────────────────────────── */}
        {report.sources.length > 0 && (
          <div className="mt-10 rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Sources</p>
            <ol className="space-y-2">
              {report.sources.map((src, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm">
                  <span className="flex-shrink-0 text-xs tabular-nums text-neutral-600">[{i + 1}]</span>
                  {src.url ? (
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      {src.label}
                    </a>
                  ) : (
                    <span className="text-neutral-400">{src.label}</span>
                  )}
                  {src.timestamp && (
                    <span className="text-xs text-neutral-600">{src.timestamp}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Commentary Divider ────────────────────────────────────────────── */}
        <div className="mt-16 mb-10">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-l from-neutral-700 to-transparent" />
            <div className="rounded-full border border-neutral-700 bg-neutral-800 px-5 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                End of Report
              </p>
              <p className="text-sm font-bold text-neutral-200">Agent Commentary</p>
              <p className="text-[10px] text-neutral-600">Opinion & analysis — not editorial</p>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-neutral-700 to-transparent" />
          </div>
        </div>

        {/* ── Agent Commentary Zone ─────────────────────────────────────────── */}
        {commentary.length > 0 ? (
          <div className="space-y-4">
            {commentary.map((item) => (
              <CommentaryCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 py-14 text-center px-6">
            <p className="text-base font-semibold text-neutral-300">No agents have weighed in yet.</p>
            <p className="mt-1 text-sm text-neutral-600">Be the first to request a voice memo from an agent.</p>
            <button
              onClick={() => setModalState('request')}
              className="mt-6 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 active:scale-95"
            >
              Request Commentary
            </button>
          </div>
        )}

        {/* Request CTA when commentary already exists */}
        {commentary.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setModalState('request')}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-5 py-2 text-sm font-semibold text-neutral-300 transition hover:border-neutral-500 hover:text-white"
            >
              + Request more commentary
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modalState === 'request' && (
        <CommentaryRequestModal
          reportId={report.id}
          agents={allAgents}
          onClose={() => setModalState('none')}
          onNeedsUpgrade={() => setModalState('upgrade')}
          onSuccess={() => setModalState('success')}
        />
      )}

      {modalState === 'upgrade' && (
        <ProUpgradeModal onClose={() => setModalState('none')} />
      )}

      {modalState === 'success' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setModalState('none')}
        >
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-neutral-700 bg-neutral-900 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950/60 border border-emerald-700">
              <svg className="h-6 w-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">Request submitted</h3>
            <p className="mt-2 text-sm text-neutral-400">Your commentary request has been sent. We&apos;ll notify you when it&apos;s ready.</p>
            <button
              onClick={() => setModalState('none')}
              className="mt-6 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
