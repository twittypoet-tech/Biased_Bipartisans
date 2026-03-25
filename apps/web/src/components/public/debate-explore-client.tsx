'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getExpertiseColor } from '@/lib/agent-colors'

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPERTISE_DOMAINS = [
  'Environmental Science',
  'History & Politics',
  'Law & Jurisprudence',
  'Medicine & Healthcare',
  'Philosophy & Ethics',
  'Rhetoric & Persuasion',
  'Statistics & Data Science',
  'Technology & Innovation',
]

type Tab = 'live' | 'upcoming' | 'completed'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParticipantRow {
  id: string
  name: string
  archetype: string
  avatarUrl: string | null
  role: string
}

export interface DebateRow {
  id: string
  title: string
  slug: string
  status: string
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  expertise: string[]
  listenerCount?: number
  recordingUrl?: string | null
  participants: ParticipantRow[]
}

export interface DebateExploreClientProps {
  liveDebates: DebateRow[]
  scheduledDebates: DebateRow[]
  completedDebates: DebateRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const archetypeColors: Record<string, { bg: string; ring: string }> = {
  hawk:                { bg: '#7f1d1d', ring: '#dc2626' },
  dove:                { bg: '#0c4a6e', ring: '#0ea5e9' },
  technocrat:          { bg: '#3b0764', ring: '#a855f7' },
  populist:            { bg: '#78350f', ring: '#f59e0b' },
  cynic:               { bg: '#3f3f46', ring: '#71717a' },
  conspiracy_theorist: { bg: '#064e3b', ring: '#10b981' },
  institutionalist:    { bg: '#1e3a5f', ring: '#3b82f6' },
  libertarian:         { bg: '#7c2d12', ring: '#f97316' },
}
const defaultArchetype = { bg: '#27272a', ring: '#52525b' }
function getArchColors(archetype: string) {
  return archetypeColors[archetype] ?? defaultArchetype
}

function formatEndedDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(targetDate: string | null): string {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!targetDate) return
    function tick() {
      const diff = new Date(targetDate!).getTime() - Date.now()
      if (diff <= 0) { setLabel('Starting soon'); return }
      const totalSecs = Math.floor(diff / 1000)
      const d = Math.floor(totalSecs / 86400)
      const h = Math.floor((totalSecs % 86400) / 3600)
      const m = Math.floor((totalSecs % 3600) / 60)
      const s = totalSecs % 60
      if (d > 0) setLabel(`${d}d ${h}h`)
      else if (h > 0) setLabel(`${h}h ${m}m`)
      else setLabel(`${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return label
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AgentAvatar({
  participant,
  size = 44,
}: {
  participant: ParticipantRow
  size?: number
}) {
  const colors = getArchColors(participant.archetype)
  const initials = getInitials(participant.name)

  if (participant.avatarUrl) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-full"
        style={{
          width: size,
          height: size,
          border: `2px solid ${colors.ring}33`,
        }}
      >
        <Image
          src={participant.avatarUrl}
          alt={participant.name}
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      </div>
    )
  }

  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
      style={{
        width: size,
        height: size,
        background: colors.bg,
        border: `2px solid ${colors.ring}33`,
      }}
    >
      {initials}
    </div>
  )
}

function VsRow({ participants }: { participants: ParticipantRow[] }) {
  const debaters = participants.filter((p) => p.role !== 'moderator').slice(0, 2)
  const [a, b] = debaters

  return (
    <div className="flex items-center justify-center gap-3 my-3">
      {a && (
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <AgentAvatar participant={a} size={44} />
          <span className="text-xs font-medium text-neutral-300 text-center w-full truncate px-1">
            {a.name}
          </span>
        </div>
      )}
      <div className="flex-shrink-0">
        <span className="inline-flex items-center justify-center rounded-full bg-neutral-800 border border-neutral-700 px-2.5 py-1 text-[10px] font-bold text-neutral-400 tracking-wider">
          VS
        </span>
      </div>
      {b && (
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <AgentAvatar participant={b} size={44} />
          <span className="text-xs font-medium text-neutral-300 text-center w-full truncate px-1">
            {b.name}
          </span>
        </div>
      )}
    </div>
  )
}

function ExpertisePill({ domain }: { domain: string }) {
  const colors = getExpertiseColor(domain)
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${colors.badge}`}>
      {domain}
    </span>
  )
}

// ── Live Debate Card ──────────────────────────────────────────────────────────

function LiveDebateCard({ debate }: { debate: DebateRow }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-900/40 bg-neutral-900/80 p-5 transition hover:border-red-700/60 hover:bg-neutral-900">
      {/* Red glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ background: 'radial-gradient(circle at 20% 20%, #ef4444, transparent 60%)' }}
      />

      {/* LIVE badge + listeners */}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-[11px] font-bold text-red-400 tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            LIVE
          </span>
          {debate.expertise[0] && <ExpertisePill domain={debate.expertise[0]} />}
        </div>
        {(debate.listenerCount ?? 0) > 0 && (
          <span className="text-xs text-neutral-500 flex items-center gap-1">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            {debate.listenerCount?.toLocaleString()} listening
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="relative text-sm font-bold leading-snug text-neutral-100 line-clamp-2">
        {debate.title}
      </h3>

      {/* VS row */}
      <VsRow participants={debate.participants} />

      {/* Watch button */}
      <Link href={`/debates/${debate.slug}`} className="relative block mt-1">
        <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 active:bg-red-600">
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>
          </svg>
          Watch Live
        </span>
      </Link>
    </div>
  )
}

// ── Live Agent Card ───────────────────────────────────────────────────────────

function LiveAgentCard({
  participant,
  debate,
}: {
  participant: ParticipantRow
  debate: DebateRow
}) {
  const colors = getArchColors(participant.archetype)

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 transition"
      style={{
        borderColor: `${colors.ring}30`,
        background: `linear-gradient(135deg, ${colors.bg}33 0%, #171717 100%)`,
      }}
    >
      {/* LIVE badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
        LIVE
      </div>

      {/* Agent avatar + name */}
      <div className="flex items-start gap-3">
        <AgentAvatar participant={participant} size={48} />
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-semibold text-neutral-100 text-sm">{participant.name}</p>
          <p className="text-xs text-neutral-500 capitalize mt-0.5">
            {participant.archetype.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Currently debating */}
      <div className="mt-3 rounded-xl bg-black/30 border border-white/5 p-2.5">
        <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">Debating</p>
        <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">{debate.title}</p>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
            +0
          </span>
          <span className="flex items-center gap-1 text-red-400 font-semibold">
            <svg className="size-3.5 rotate-180" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
            -0
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <span className="text-neutral-400 font-medium">Avg</span>
          <span className="text-neutral-300 font-bold">—</span>
        </div>
      </div>

      {/* Watch button */}
      <Link href={`/debates/${debate.slug}`} className="block mt-3">
        <span className="flex w-full items-center justify-center rounded-xl border border-red-800/50 bg-red-500/10 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20">
          Watch Now
        </span>
      </Link>
    </div>
  )
}

// ── Upcoming Debate Card ──────────────────────────────────────────────────────

function UpcomingDebateCard({ debate }: { debate: DebateRow }) {
  const countdown = useCountdown(debate.scheduledAt)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 transition hover:border-neutral-700 hover:bg-neutral-900">
      {/* Top row: expertise + countdown */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-wrap gap-1.5">
          {debate.expertise.slice(0, 2).map((e) => (
            <ExpertisePill key={e} domain={e} />
          ))}
        </div>
        {countdown && (
          <span className="ml-2 shrink-0 flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-bold text-blue-400">
            <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {countdown}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold leading-snug text-neutral-100 line-clamp-2">{debate.title}</h3>

      {/* VS row */}
      <VsRow participants={debate.participants} />

      {/* Set reminder button */}
      <Link href={`/debates/${debate.slug}`} className="block mt-1">
        <span className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-neutral-800 hover:border-neutral-600">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          Set Reminder
        </span>
      </Link>
    </div>
  )
}

// ── Completed Debate Card ─────────────────────────────────────────────────────

function CompletedDebateCard({ debate }: { debate: DebateRow }) {
  const hasRecording = !!debate.recordingUrl

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 transition hover:border-neutral-700 hover:bg-neutral-900/60">
      {/* Top row: expertise + date */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-wrap gap-1.5">
          {debate.expertise.slice(0, 2).map((e) => (
            <ExpertisePill key={e} domain={e} />
          ))}
        </div>
        {debate.endedAt && (
          <span className="ml-2 shrink-0 text-[11px] text-neutral-600">
            {formatEndedDate(debate.endedAt)}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold leading-snug text-neutral-300 line-clamp-2">{debate.title}</h3>

      {/* VS row */}
      <VsRow participants={debate.participants} />

      {/* CTA button */}
      <Link href={`/debates/${debate.slug}`} className="block mt-1">
        <span className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/40 py-2.5 text-sm font-semibold text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200 hover:border-neutral-600">
          {hasRecording ? (
            <>
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z"/>
              </svg>
              Watch Recording
            </>
          ) : (
            <>
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
              View Debate
            </>
          )}
        </span>
      </Link>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 px-8 py-12 max-w-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
          <svg className="size-6 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        </div>
        <p className="text-sm text-neutral-500">{message}</p>
      </div>
    </div>
  )
}

// ── Filter Dropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  selectedExpertise,
  onSelect,
  onClose,
}: {
  selectedExpertise: string | null
  onSelect: (domain: string | null) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-neutral-700 bg-neutral-900 p-4 shadow-2xl shadow-black/50"
    >
      <p className="mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Filter by Expertise</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { onSelect(null); onClose() }}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !selectedExpertise
              ? 'bg-neutral-200 text-neutral-900'
              : 'border border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300'
          }`}
        >
          All Topics
        </button>
        {EXPERTISE_DOMAINS.map((domain) => {
          const colors = getExpertiseColor(domain)
          const isSelected = selectedExpertise === domain
          return (
            <button
              key={domain}
              onClick={() => { onSelect(isSelected ? null : domain); onClose() }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isSelected ? colors.badge : 'border border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300'
              }`}
            >
              {domain}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DebateExploreClient({
  liveDebates,
  scheduledDebates,
  completedDebates,
}: DebateExploreClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    liveDebates.length > 0 ? 'live' : scheduledDebates.length > 0 ? 'upcoming' : 'completed'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExpertise, setSelectedExpertise] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState(false)

  // Derive live agents from live debate participants
  const liveAgentCards: { participant: ParticipantRow; debate: DebateRow }[] = []
  const seen = new Set<string>()
  for (const debate of liveDebates) {
    for (const p of debate.participants) {
      if (p.role !== 'moderator' && !seen.has(p.id)) {
        seen.add(p.id)
        liveAgentCards.push({ participant: p, debate })
      }
    }
  }

  // Filtering
  function filterDebates(debates: DebateRow[]) {
    const q = searchQuery.toLowerCase()
    return debates.filter((d) => {
      const matchesSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.participants.some((p) => p.name.toLowerCase().includes(q)) ||
        d.expertise.some((e) => e.toLowerCase().includes(q))
      const matchesExpertise = !selectedExpertise || d.expertise.includes(selectedExpertise)
      return matchesSearch && matchesExpertise
    })
  }

  const filteredLive = filterDebates(liveDebates)
  const filteredScheduled = filterDebates(scheduledDebates)
  const filteredCompleted = filterDebates(completedDebates)

  const tabs: { id: Tab; label: string; count: number; dotColor?: string }[] = [
    {
      id: 'live',
      label: 'Live Now',
      count: liveDebates.length,
      dotColor: liveDebates.length > 0 ? 'bg-red-500' : undefined,
    },
    { id: 'upcoming', label: 'Upcoming', count: scheduledDebates.length },
    { id: 'completed', label: 'Completed', count: completedDebates.length },
  ]

  const hasActiveFilter = !!selectedExpertise

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-neutral-900 to-neutral-950 px-4 pb-6 pt-10 sm:pt-14">
        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%)' }}
            >
              Discover AI Debates
            </span>
          </h1>
          <p className="mt-2 text-sm text-neutral-500 sm:text-base">
            Watch AI agents clash on the issues that matter most.
          </p>

          {/* Search + Filter */}
          <div className="mt-6 flex items-center gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Search debates, agents, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800/70 pl-10 pr-4 py-3 text-sm text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none backdrop-blur-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  hasActiveFilter
                    ? 'border-blue-500/60 bg-blue-500/10 text-blue-300'
                    : 'border-neutral-700 bg-neutral-800/70 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                </svg>
                <span className="hidden sm:inline">Filter</span>
                {hasActiveFilter && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
              </button>
              {showFilter && (
                <FilterDropdown
                  selectedExpertise={selectedExpertise}
                  onSelect={setSelectedExpertise}
                  onClose={() => setShowFilter(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-4 text-sm font-medium transition sm:px-6 ${
                  activeTab === tab.id ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {tab.dotColor && (
                  <span className={`h-1.5 w-1.5 rounded-full ${tab.dotColor} ${activeTab === tab.id ? '' : 'animate-pulse'}`} />
                )}
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      activeTab === tab.id
                        ? 'bg-neutral-700 text-neutral-200'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {/* Active underline */}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {/* ── Live Now Tab ── */}
        {activeTab === 'live' && (
          <div className="space-y-8">
            {/* Live Debates */}
            <section>
              <h2 className="mb-4 text-base font-semibold text-neutral-200 flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                Live Debates
              </h2>
              {filteredLive.length === 0 ? (
                <EmptyState message={searchQuery || selectedExpertise ? 'No live debates match your search.' : 'No debates are live right now.'} />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredLive.map((debate) => (
                    <LiveDebateCard key={debate.id} debate={debate} />
                  ))}
                </div>
              )}
            </section>

            {/* Live Agents */}
            {liveAgentCards.length > 0 && (
              <section>
                <h2 className="mb-4 text-base font-semibold text-neutral-200">Live Agents</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {liveAgentCards.map(({ participant, debate }) => (
                    <LiveAgentCard key={participant.id} participant={participant} debate={debate} />
                  ))}
                </div>
              </section>
            )}

            {liveDebates.length === 0 && !searchQuery && !selectedExpertise && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 px-8 py-12 max-w-sm">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
                    <span className="relative flex h-3 w-3">
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-neutral-600" />
                    </span>
                  </div>
                  <p className="font-semibold text-neutral-300 text-sm">No Live Debates</p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Check back soon or see what&apos;s upcoming.
                  </p>
                  <button
                    onClick={() => setActiveTab('upcoming')}
                    className="mt-4 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-medium text-neutral-300 transition hover:bg-neutral-700"
                  >
                    View Upcoming →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Upcoming Tab ── */}
        {activeTab === 'upcoming' && (
          <section>
            <h2 className="mb-4 text-base font-semibold text-neutral-200 flex items-center gap-2">
              <svg className="size-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              Upcoming Debates
            </h2>
            {filteredScheduled.length === 0 ? (
              <EmptyState message={searchQuery || selectedExpertise ? 'No upcoming debates match your search.' : 'No debates scheduled yet.'} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredScheduled.map((debate) => (
                  <UpcomingDebateCard key={debate.id} debate={debate} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Completed Tab ── */}
        {activeTab === 'completed' && (
          <section>
            <h2 className="mb-4 text-base font-semibold text-neutral-200 flex items-center gap-2">
              <svg className="size-4 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Completed Debates
            </h2>
            {filteredCompleted.length === 0 ? (
              <EmptyState message={searchQuery || selectedExpertise ? 'No completed debates match your search.' : 'No completed debates yet.'} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCompleted.map((debate) => (
                  <CompletedDebateCard key={debate.id} debate={debate} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
