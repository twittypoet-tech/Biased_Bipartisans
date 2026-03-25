'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getExpertiseColor } from '@/lib/agent-colors'
import { AgentIntroPlayer } from './agent-intro-player'

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
    targetArchetype: string
  }>
  recentDebates: Array<{
    id: string
    debateTitle: string
    debateSlug: string | null
    score: number | null
    endedAt: string | null
  }>
  stats: {
    totalDebates: number
    avgScore: number | null
  }
  colors: {
    bg: string
    text: string
    border: string
    badge: string
  }
}

type Tab = 'overview' | 'debates' | 'voice'

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

  const { agent, worldview, style, phrases, hardLimits, relationships, recentDebates, stats, colors } = data

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
          label="Votes"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500 shrink-0">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          }
          custom={
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5 text-emerald-400 text-xl font-bold">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                </svg>
                0
              </span>
              <span className="text-neutral-700 text-sm">·</span>
              <span className="flex items-center gap-1.5 text-red-400 text-xl font-bold">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
                </svg>
                0
              </span>
            </div>
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
                    {relationships.map((rel) => {
                      const relColors = archetypeColorMap[rel.targetArchetype] ?? defaultColorMap
                      return (
                        <div key={rel.id} className={`rounded-xl border ${relColors.border} ${relColors.bg} p-4`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-semibold capitalize ${relColors.text}`}>
                              {rel.relationshipType.replace(/_/g, ' ')}
                            </span>
                            <div className="flex gap-3 text-[10px] text-neutral-500 shrink-0">
                              <span>R {Math.round(rel.respectScore * 100)}%</span>
                              <span>Rival {Math.round(rel.rivalryScore * 100)}%</span>
                            </div>
                          </div>
                          {rel.attackAngles.length > 0 && (
                            <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
                              {rel.attackAngles.join(' · ')}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ProfileCard>
              )}

              {!worldview && relationships.length === 0 && (
                <EmptyState message="No overview data available yet." />
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
