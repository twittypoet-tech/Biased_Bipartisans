'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowUp, ArrowDown, FileText, ChevronRight } from 'lucide-react'
import { getExpertiseColor } from '@/lib/agent-colors'
import { AgentIntroPlayer } from './agent-intro-player'
import { NewsAudioPlayer } from './news-audio-player'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentProfileData {
  agent: {
    id: string
    name: string
    archetype: string
    archetypeLabel: string
    evolutionStage: string
    shortBio: string | null
    introAudioUrl: string | null
    avatarUrl: string | null
    expertise: string[]
  }
  worldview: {
    coreThesis: string
    values: string[]
    doctrine: string[]
    redLines: string[]
  } | null
  style: {
    temperament: string
    tone: string
    pace: string
    sentenceStyle: string
    rhetoricalOs: string[]
    rhetoricalDevices: string[]
    signatureBehaviors: string[]
  } | null
  phrases: {
    openers: string[]
    attacks: string[]
    closers: string[]
  } | null
  hardLimits: string[]
  relationships: Array<{
    id: string
    relationshipType: string
    respectScore: number
    rivalryScore: number
    attackAngles: string[]
    targetName: string | null
    targetSlug: string | null
    targetAvatarUrl: string | null
  }>
  recentDebates: Array<{
    id: string
    debateTitle: string
    debateSlug: string | null
    score: number | null
    endedAt: string | null
  }>
  articles: Array<{
    id: string
    slug: string
    headline: string
    category: string
    hero_image_url: string | null
    published_at: string | null
    view_count: number
  }>
  stats: {
    totalDebates: number
    avgScore: number | null
    totalViews: number
    commentaryUpvotes: number
    commentaryDownvotes: number
  }
  agentCommentary: Array<{
    id: string
    transcript: string | null
    audio_url: string | null
    duration_seconds: number | null
    upvotes: number
    downvotes: number
    created_at: string
    report_headline: string | null
    report_slug: string | null
    report_category: string | null
  }>
  colors: {
    bg: string
    text: string
    border: string
    badge: string
  }
}

type Tab = 'overview' | 'articles' | 'commentary' | 'debates' | 'voice'

// ── Expertise Badges Component ─────────────────────────────────────────────────

function ExpertiseBadges({ expertise }: { expertise: string[] }) {
  const [openPopup, setOpenPopup] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenPopup(false)
      }
    }

    if (openPopup) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openPopup])

  if (!expertise || expertise.length === 0) return null

  return (
    <div className="relative flex items-center gap-2 flex-wrap">
      {expertise[0] && (
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getExpertiseColor(expertise[0]).badge}`}>
          {expertise[0]}
        </span>
      )}
      {expertise.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setOpenPopup(!openPopup)}
            className="text-xs text-neutral-400 hover:text-neutral-300 font-medium uppercase tracking-wider"
            type="button"
          >
            +{expertise.length - 1} more
          </button>
          {openPopup && (
            <div
              ref={popoverRef}
              className="absolute top-full left-0 z-50 mt-2 w-72 rounded-lg border border-neutral-700 bg-neutral-800 p-3 shadow-lg"
            >
              <p className="mb-2 text-xs font-semibold text-neutral-400">Expertise Domains</p>
              <div className="flex flex-wrap gap-2">
                {expertise.map((domain) => (
                  <span
                    key={domain}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getExpertiseColor(domain).badge}`}
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AgentProfileClient({ data }: { data: AgentProfileData }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [isFollowing, setIsFollowing] = useState(false)

  const { agent, worldview, style, phrases, hardLimits, relationships, recentDebates, stats, articles, agentCommentary, colors } = data

  const initials = agent.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-6 sm:p-8`}>
        {/* Decorative glow */}
        <div className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-15 blur-3xl ${colors.bg}`} />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">

          {/* Avatar */}
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={`${agent.name} avatar`}
              className={`shrink-0 self-start w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 object-cover ${colors.border}`}
            />
          ) : (
            <div className={`shrink-0 self-start flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 ${colors.border} bg-neutral-950/60 text-2xl sm:text-3xl font-bold ${colors.text}`}>
              {initials}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Expertise Badges */}
              {agent.expertise && agent.expertise.length > 0 ? (
                <ExpertiseBadges
                  expertise={agent.expertise}
                />
              ) : (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${colors.badge}`}>
                  {agent.archetypeLabel}
                </span>
              )}
              <span className="rounded-full border border-neutral-700/50 bg-neutral-900/40 px-2.5 py-0.5 text-[10px] text-neutral-500 uppercase tracking-wider">
                {agent.evolutionStage.replace(/_/g, ' ')}
              </span>
            </div>

            <h1 className={`mt-3 text-3xl sm:text-4xl font-bold tracking-tight ${colors.text}`}>
              {agent.name}
            </h1>

            {agent.shortBio && (
              <p className="mt-2 text-neutral-300 leading-relaxed max-w-xl">
                {agent.shortBio}
              </p>
            )}

            {/* Values */}
            {worldview?.values && worldview.values.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {worldview.values.map((v, i) => (
                  <span key={i} className="rounded-full border border-neutral-700/60 bg-neutral-900/50 px-3 py-0.5 text-xs text-neutral-300">
                    {v}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <AgentIntroPlayer
                agentId={agent.id}
                agentName={agent.name}
                initialAudioUrl={agent.introAudioUrl}
              />
              <button
                onClick={() => setIsFollowing((f) => !f)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  isFollowing
                    ? 'border border-neutral-600 bg-transparent text-neutral-300 hover:border-neutral-500 hover:text-white'
                    : `${colors.badge} hover:opacity-90`
                }`}
              >
                {isFollowing ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    Following
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Follow
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          value={stats.totalDebates}
          label="Total Debates"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500 shrink-0">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
        <StatCard
          value={stats.totalViews.toLocaleString()}
          label="Total Views"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500 shrink-0">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />
        <StatCard
          value={stats.avgScore !== null ? `${Math.round(stats.avgScore * 100)}%` : '—'}
          label="Avg Score"
          valueColor={
            stats.avgScore !== null
              ? stats.avgScore >= 0.7
                ? 'text-emerald-400'
                : stats.avgScore >= 0.4
                  ? 'text-amber-400'
                  : 'text-red-400'
              : undefined
          }
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500 shrink-0">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <StatCard
          value="0"
          label="Followers"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500 shrink-0">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div>
        {/* Tab list */}
        <div className="flex gap-0 border-b border-neutral-800 overflow-x-auto">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'articles', label: 'Articles' },
              { id: 'commentary', label: 'Commentary' },
              { id: 'debates', label: 'Recent Debates' },
              { id: 'voice', label: 'Voice Profile' },
            ] as { id: Tab; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === id
                  ? `${colors.text} border-current`
                  : 'text-neutral-500 border-transparent hover:text-neutral-300 hover:border-neutral-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="mt-6">

          {/* ── Overview Tab ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-4">

              {worldview?.coreThesis && (
                <ProfileCard title="Core Thesis" icon={<ThesisIcon />}>
                  <p className="text-neutral-200 leading-relaxed">{worldview.coreThesis}</p>
                </ProfileCard>
              )}

              {worldview?.doctrine && worldview.doctrine.length > 0 && (
                <ProfileCard title="Doctrine" icon={<DoctrineIcon />}>
                  <ul className="space-y-2">
                    {worldview.doctrine.map((d, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-neutral-300">
                        <span className={`mt-0.5 shrink-0 ${colors.text}`}>▸</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </ProfileCard>
              )}

              {((worldview?.redLines && worldview.redLines.length > 0) || hardLimits.length > 0) && (
                <ProfileCard title="Red Lines & Hard Limits" icon={<RedLinesIcon />} accent="red">
                  {worldview?.redLines && worldview.redLines.length > 0 && (
                    <div>
                      <SectionLabel>Red Lines</SectionLabel>
                      <ul className="mt-2 space-y-2">
                        {worldview.redLines.map((r, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-neutral-400">
                            <span className="mt-0.5 shrink-0 text-red-700">▸</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {hardLimits.length > 0 && (
                    <div className={worldview?.redLines && worldview.redLines.length > 0 ? 'mt-4' : ''}>
                      <SectionLabel>Hard Limits</SectionLabel>
                      <ul className="mt-2 space-y-2">
                        {hardLimits.map((r, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-neutral-400">
                            <span className="mt-0.5 shrink-0 text-red-900">▸</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ProfileCard>
              )}

              {relationships.length > 0 && (
                <ProfileCard title="Rivals & Alliances" icon={<RelationshipsIcon />}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {relationships.map((rel) => (
                      <div key={rel.id} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                        <div className="flex items-center gap-3">
                          {rel.targetSlug ? (
                            <Link href={`/agents/${rel.targetSlug}`} className="shrink-0 hover:opacity-80 transition">
                              {rel.targetAvatarUrl ? (
                                <img src={rel.targetAvatarUrl} alt={rel.targetName ?? ''} className="size-9 rounded-full object-cover" />
                              ) : (
                                <div className="size-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-400">
                                  {(rel.targetName ?? '?')[0]}
                                </div>
                              )}
                            </Link>
                          ) : (
                            <div className="size-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-400">?</div>
                          )}
                          <div className="flex-1 min-w-0">
                            {rel.targetSlug ? (
                              <Link href={`/agents/${rel.targetSlug}`} className="text-sm font-semibold text-white hover:underline">
                                {rel.targetName ?? 'Unknown'}
                              </Link>
                            ) : (
                              <p className="text-sm font-semibold text-white">{rel.targetName ?? 'Unknown'}</p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full border border-neutral-700 bg-neutral-800 px-2.5 py-0.5 text-[10px] font-semibold capitalize text-neutral-400">
                            {rel.relationshipType.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {rel.attackAngles.length > 0 && (
                          <p className="mt-2.5 text-xs text-neutral-500 leading-relaxed">
                            {rel.attackAngles.join(' · ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ProfileCard>
              )}

              {!worldview && relationships.length === 0 && (
                <EmptyState message="No overview data available yet." />
              )}
            </div>
          )}

          {/* ── Articles Tab ───────────────────────────────────────────── */}
          {activeTab === 'articles' && (
            <div className="space-y-3">
              {articles.length > 0 ? (
                articles.map((article) => (
                  <a
                    key={article.id}
                    href={`/news/${article.slug}`}
                    className="flex gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 hover:border-neutral-700 hover:bg-neutral-800/40 transition group"
                  >
                    {article.hero_image_url && (
                      <div className="relative w-24 h-16 sm:w-32 sm:h-20 rounded-lg overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={article.hero_image_url}
                          alt={article.headline}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{article.category}</span>
                      <h4 className="text-sm font-semibold text-neutral-200 leading-snug group-hover:text-amber-400 transition line-clamp-2 mt-0.5" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                        {article.headline}
                      </h4>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-500">
                        {article.published_at && (
                          <span>{new Date(article.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        )}
                        {article.view_count > 0 && (
                          <>
                            <span className="text-neutral-700">·</span>
                            <span className="flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-600">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              {article.view_count.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </a>
                ))
              ) : (
                <EmptyState message="No articles published yet." />
              )}
            </div>
          )}

          {/* ── Commentary Tab ──────────────────────────────────────────── */}
          {activeTab === 'commentary' && (
            <div className="space-y-4">
              {agentCommentary.length > 0 ? (
                agentCommentary.map((c) => (
                  <AgentCommentaryCard key={c.id} commentary={c} agentName={agent.name} agentAvatarUrl={agent.avatarUrl} />
                ))
              ) : (
                <EmptyState message={`${agent.name} hasn't provided any commentary yet.`} />
              )}
            </div>
          )}

          {/* ── Recent Debates Tab ───────────────────────────────────────── */}
          {activeTab === 'debates' && (
            <div className="space-y-4">
              {recentDebates.length > 0 ? (
                <ProfileCard title="Debate History" icon={<DebatesIcon />}>
                  <div className="divide-y divide-neutral-800/60">
                    {recentDebates.map((debate) => (
                      <div key={debate.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          {debate.debateSlug ? (
                            <Link
                              href={`/debates/${debate.debateSlug}`}
                              className="text-sm text-neutral-200 hover:text-white transition font-medium line-clamp-2 leading-snug"
                            >
                              {debate.debateTitle}
                            </Link>
                          ) : (
                            <span className="text-sm text-neutral-400 line-clamp-2 leading-snug">
                              {debate.debateTitle}
                            </span>
                          )}
                          {debate.endedAt && (
                            <span className="text-[11px] text-neutral-600 mt-0.5 block">
                              {new Date(debate.endedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                        {debate.score !== null && <ScorePill score={debate.score} />}
                        {debate.debateSlug && (
                          <Link
                            href={`/debates/${debate.debateSlug}`}
                            className="shrink-0 text-neutral-600 hover:text-neutral-300 transition"
                            aria-label="Go to debate"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </ProfileCard>
              ) : (
                <EmptyState message="No debates recorded yet." />
              )}
            </div>
          )}

          {/* ── Voice Profile Tab ─────────────────────────────────────────── */}
          {activeTab === 'voice' && (
            <div className="space-y-4">

              {/* Debate Strategy (renamed from Devices) */}
              {style && (style.rhetoricalDevices.length > 0 || style.signatureBehaviors.length > 0) && (
                <ProfileCard title="Debate Strategy" icon={<StrategyIcon />}>
                  {style.rhetoricalDevices.length > 0 && (
                    <div>
                      <SectionLabel>Rhetorical Devices</SectionLabel>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {style.rhetoricalDevices.map((d, i) => (
                          <span key={i} className="rounded-full bg-neutral-800 border border-neutral-700/50 px-2.5 py-0.5 text-xs text-neutral-300">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {style.signatureBehaviors.length > 0 && (
                    <div className={style.rhetoricalDevices.length > 0 ? 'mt-4' : ''}>
                      <SectionLabel>Signature Behaviors</SectionLabel>
                      <ul className="mt-2 space-y-2">
                        {style.signatureBehaviors.map((b, i) => (
                          <li key={i} className="flex gap-2 text-sm text-neutral-400">
                            <span className="text-neutral-600 shrink-0 mt-0.5">▸</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ProfileCard>
              )}

              {/* Rhetoric OS */}
              {style && style.rhetoricalOs.length > 0 && (
                <ProfileCard title="Rhetoric OS" icon={<RhetoricIcon />}>
                  <div className="flex flex-wrap gap-2">
                    {style.rhetoricalOs.map((r, i) => (
                      <span key={i} className={`rounded-full px-3 py-1 text-xs font-medium ${colors.badge}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                </ProfileCard>
              )}

              {/* Voice & Tone */}
              {style && (
                <ProfileCard title="Voice & Tone" icon={<VoiceIcon />}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <VoiceStatRow label="Temperament" value={style.temperament.replace(/_/g, ' ')} capitalize />
                    <VoiceStatRow label="Tone" value={style.tone} />
                    <VoiceStatRow label="Pace" value={style.pace} />
                    <VoiceStatRow label="Sentence Style" value={style.sentenceStyle} />
                  </div>
                </ProfileCard>
              )}

              {/* How They Speak */}
              {phrases && (phrases.openers.length > 0 || phrases.attacks.length > 0 || phrases.closers.length > 0) && (
                <ProfileCard title="How They Speak" icon={<SpeakIcon />}>
                  <div className="space-y-5">
                    {phrases.openers.length > 0 && (
                      <div>
                        <SectionLabel>Openers</SectionLabel>
                        <div className="mt-2 space-y-2">
                          {phrases.openers.map((p, i) => (
                            <p key={i} className={`text-sm italic ${colors.text} leading-relaxed`}>
                              &ldquo;{p}&rdquo;
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {phrases.attacks.length > 0 && (
                      <div>
                        <SectionLabel>Attack Lines</SectionLabel>
                        <div className="mt-2 space-y-2">
                          {phrases.attacks.map((p, i) => (
                            <p key={i} className="text-sm italic text-neutral-300 leading-relaxed">
                              &ldquo;{p}&rdquo;
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {phrases.closers.length > 0 && (
                      <div>
                        <SectionLabel>Closers</SectionLabel>
                        <div className="mt-2 space-y-2">
                          {phrases.closers.map((p, i) => (
                            <p key={i} className="text-sm italic text-neutral-400 leading-relaxed">
                              &ldquo;{p}&rdquo;
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ProfileCard>
              )}

              {!style && !phrases && (
                <EmptyState message="No voice profile data available yet." />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfileCard({
  title,
  icon,
  accent,
  children,
}: {
  title: string
  icon?: React.ReactNode
  accent?: 'red'
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent === 'red' ? 'border-red-900/40 bg-red-950/10' : 'border-neutral-800 bg-neutral-900/40'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon && (
          <span className={accent === 'red' ? 'text-red-500/70' : 'text-neutral-500'}>{icon}</span>
        )}
        <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function StatCard({
  value,
  label,
  icon,
  valueColor,
  custom,
}: {
  value?: string | number
  label: string
  icon?: React.ReactNode
  valueColor?: string
  custom?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="text-[11px] text-neutral-500 uppercase tracking-wider leading-tight">{label}</span>
        {icon}
      </div>
      {custom ?? (
        <p className={`text-2xl font-bold tabular-nums mt-1 ${valueColor ?? 'text-neutral-100'}`}>
          {value ?? '—'}
        </p>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{children}</p>
  )
}

function VoiceStatRow({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="rounded-lg bg-neutral-800/40 border border-neutral-700/30 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">{label}</p>
      <p className={`text-sm text-neutral-200 font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  )
}

function ScorePill({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 70
      ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50'
      : pct >= 40
        ? 'bg-amber-900/50 text-amber-400 border-amber-700/50'
        : 'bg-red-900/50 text-red-400 border-red-700/50'
  return (
    <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {pct}%
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-neutral-800/50 bg-neutral-900/20 p-10 text-center">
      <p className="text-sm text-neutral-600">{message}</p>
    </div>
  )
}

// ── Archetype color map ───────────────────────────────────────────────────────

const archetypeColorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  hawk: { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-800/50', badge: 'bg-red-900 text-red-200' },
  dove: { bg: 'bg-sky-950/40', text: 'text-sky-400', border: 'border-sky-800/50', badge: 'bg-sky-900 text-sky-200' },
  technocrat: { bg: 'bg-violet-950/40', text: 'text-violet-400', border: 'border-violet-800/50', badge: 'bg-violet-900 text-violet-200' },
  populist: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/50', badge: 'bg-amber-900 text-amber-200' },
  cynic: { bg: 'bg-zinc-800/40', text: 'text-zinc-400', border: 'border-zinc-700/50', badge: 'bg-zinc-800 text-zinc-200' },
  conspiracy_theorist: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/50', badge: 'bg-emerald-900 text-emerald-200' },
  institutionalist: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/50', badge: 'bg-blue-900 text-blue-200' },
  libertarian: { bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-800/50', badge: 'bg-orange-900 text-orange-200' },
}
const defaultColorMap = {
  bg: 'bg-zinc-800/40',
  text: 'text-zinc-400',
  border: 'border-zinc-700/50',
  badge: 'bg-zinc-800 text-zinc-200',
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ThesisIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function DoctrineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h16M4 10h16M4 14h8" />
    </svg>
  )
}

function RedLinesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}

function RelationshipsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function DebatesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function StrategyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function RhetoricIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function VoiceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function SpeakIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="10" x2="15" y2="10" />
    </svg>
  )
}

// ── Agent Commentary Card (for profile tab) ─────────────────────────────────

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

const COMMENTARY_PREVIEW = 300

function formatCommentaryAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'just now'
}

function AgentCommentaryCard({
  commentary: c,
  agentName,
  agentAvatarUrl,
}: {
  commentary: {
    id: string
    transcript: string | null
    audio_url: string | null
    duration_seconds: number | null
    upvotes: number
    downvotes: number
    created_at: string
    report_headline: string | null
    report_slug: string | null
    report_category: string | null
  }
  agentName: string
  agentAvatarUrl: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [votes, setVotes] = useState({ up: c.upvotes, down: c.downvotes })
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)

  const netVotes = votes.up - votes.down
  const needsTruncation = (c.transcript?.length ?? 0) > COMMENTARY_PREVIEW

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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      {/* Report reference banner */}
      {c.report_slug && (
        <Link href={`/reports/${c.report_slug}`} className="block transition hover:opacity-90">
          <div className={c.report_category ? CATEGORY_BANNER[c.report_category] ?? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-800 text-neutral-400'}>
            <div className="px-4 py-2 flex items-center gap-2">
              <FileText className="size-3.5 shrink-0 opacity-60" />
              <span className="text-[11px] font-medium uppercase tracking-wide flex-1">
                {c.report_category ?? 'Report'}
              </span>
              <ChevronRight className="size-3.5 shrink-0 opacity-40" />
            </div>
            <div className="px-4 pb-2.5">
              <p className="text-sm font-semibold leading-snug" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {c.report_headline ?? 'Untitled Report'}
              </p>
              <p className="text-[10px] opacity-60 mt-1">Tap to read full report</p>
            </div>
          </div>
        </Link>
      )}

      <div className="p-4">
        {/* Header + votes */}
        <div className="flex items-center gap-3 mb-3">
          {agentAvatarUrl ? (
            <img src={agentAvatarUrl} alt={agentName} className="size-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="size-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-400 shrink-0">
              {agentName[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{agentName}</p>
            <p className="text-xs text-neutral-500">{formatCommentaryAge(c.created_at)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => handleVote('up')} aria-label="Upvote"
              className={`rounded p-1.5 transition hover:bg-neutral-800 ${userVote === 'up' ? 'text-amber-400' : 'text-neutral-500'}`}>
              <ArrowUp className="size-3.5" strokeWidth={2.5} />
            </button>
            <span className={`text-xs font-semibold tabular-nums min-w-[16px] text-center ${netVotes > 0 ? 'text-amber-400' : netVotes < 0 ? 'text-blue-400' : 'text-neutral-500'}`}>
              {netVotes}
            </span>
            <button onClick={() => handleVote('down')} aria-label="Downvote"
              className={`rounded p-1.5 transition hover:bg-neutral-800 ${userVote === 'down' ? 'text-blue-400' : 'text-neutral-500'}`}>
              <ArrowDown className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Transcript */}
        {c.transcript && (
          <div className="mb-3">
            <p className="text-sm text-neutral-300 leading-relaxed">
              {expanded || !needsTruncation
                ? c.transcript
                : c.transcript.slice(0, COMMENTARY_PREVIEW).trimEnd() + '...'}
            </p>
            {needsTruncation && (
              <button onClick={() => setExpanded(!expanded)}
                className="mt-1.5 text-xs font-medium text-amber-400 hover:underline transition">
                {expanded ? 'Show Less' : 'View All'}
              </button>
            )}
          </div>
        )}

        {/* Audio */}
        {c.audio_url && (
          <NewsAudioPlayer src={c.audio_url} durationHint={c.duration_seconds ?? undefined} />
        )}
      </div>
    </div>
  )
}
