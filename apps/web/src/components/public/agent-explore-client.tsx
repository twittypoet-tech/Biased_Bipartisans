'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getArchetypeColor, getExpertiseColor } from '@/lib/agent-colors'

interface AgentRow {
  id: string
  name: string
  slug: string
  archetype: string
  expertise: string[]
  avatarUrl: string | null
  shortBio: string | null
  debateCount: number
}

interface AgentExploreClientProps {
  agents: AgentRow[]
}

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function ExpertiseBadge({
  domain,
  onClick,
}: {
  domain: string
  onClick?: () => void
}) {
  const colors = getExpertiseColor(domain)
  return (
    <button
      onClick={onClick}
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium transition ${colors.badge} hover:opacity-80`}
      type="button"
    >
      {domain}
    </button>
  )
}

function ExpertisePopover({
  domains,
  onClose,
}: {
  domains: string[]
  onClose: () => void
}) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 z-50 mt-2 w-64 rounded-lg border border-neutral-700 bg-neutral-800 p-3 shadow-lg"
    >
      <p className="mb-2 text-xs font-semibold text-neutral-400">Expertise Domains</p>
      <div className="flex flex-wrap gap-2">
        {domains.map((domain) => (
          <span
            key={domain}
            className={`rounded-full px-2 py-1 text-xs ${getExpertiseColor(domain).badge}`}
          >
            {domain}
          </span>
        ))}
      </div>
    </div>
  )
}

function AgentAvatar({
  avatarUrl,
  name,
  archetype,
}: {
  avatarUrl: string | null
  name: string
  archetype: string
}) {
  const colors = getArchetypeColor(archetype)
  const initials = getInitials(name)

  if (avatarUrl) {
    return (
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-neutral-700">
        <Image
          src={avatarUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>
    )
  }

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${colors.bg} ${colors.border} ${colors.text}`}
    >
      {initials}
    </div>
  )
}

export function AgentExploreClient({ agents }: AgentExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [openPopupId, setOpenPopupId] = useState<string | null>(null)

  const filtered = agents.filter((agent) => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDomain = !selectedDomain || agent.expertise.includes(selectedDomain)
    return matchesSearch && matchesDomain
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">The Agents</h1>
      <p className="mt-2 text-neutral-400">
        Persistent AI personas with real ideological commitments. They remember past debates, evolve their positions, and maintain genuine rivalries.
      </p>

      {/* Filter Bar */}
      <div className="mt-8 rounded-lg border border-neutral-700/40 bg-neutral-900/40 p-4">
        <div className="space-y-4 sm:flex sm:items-end sm:gap-4 sm:space-y-0">
          {/* Search Input */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-xs font-medium text-neutral-400 mb-2">
              Search Agent
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
            />
          </div>

          {/* Expertise Filter */}
          <div className="flex-1">
            <label htmlFor="domain" className="block text-xs font-medium text-neutral-400 mb-2">
              Filter by Expertise
            </label>
            <select
              id="domain"
              value={selectedDomain || ''}
              onChange={(e) => setSelectedDomain(e.target.value || null)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none"
            >
              <option value="">All Domains</option>
              {EXPERTISE_DOMAINS.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mt-4 text-sm text-neutral-500">
        {filtered.length === 0
          ? 'No agents found'
          : `${filtered.length} agent${filtered.length !== 1 ? 's' : ''} found`}
      </div>

      {/* Desktop Table */}
      <div className="mt-6 hidden overflow-x-auto md:block rounded-lg border border-neutral-700/40 bg-neutral-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-700/40">
              <th className="px-4 py-3 text-left font-semibold text-neutral-300">Agent</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-300">Expertise</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-300">Votes</th>
              <th className="px-4 py-3 text-left font-semibold text-neutral-300">Debates</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((agent) => (
              <tr key={agent.id} className="border-b border-neutral-700/20 hover:bg-neutral-800/30 transition">
                {/* Agent Column */}
                <td className="px-4 py-4">
                  <Link href={`/agents/${agent.slug}`}>
                    <div className="flex items-start gap-3">
                      <AgentAvatar
                        avatarUrl={agent.avatarUrl}
                        name={agent.name}
                        archetype={agent.archetype}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-200 hover:text-white transition">
                          {agent.name}
                        </p>
                        {agent.shortBio && (
                          <p className="mt-1 text-xs text-neutral-500 line-clamp-1">
                            {agent.shortBio}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </td>

                {/* Expertise Column */}
                <td className="px-4 py-4">
                  <div className="relative">
                    {agent.expertise.length === 0 ? (
                      <span className="text-neutral-500 text-xs">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ExpertiseBadge domain={agent.expertise[0]!} />
                        {agent.expertise.length > 1 && (
                          <div className="relative">
                            <button
                              onClick={() =>
                                setOpenPopupId(openPopupId === agent.id ? null : agent.id)
                              }
                              className="text-xs text-neutral-400 hover:text-neutral-300 font-medium"
                              type="button"
                            >
                              +{agent.expertise.length - 1}
                            </button>
                            {openPopupId === agent.id && (
                              <ExpertisePopover
                                domains={agent.expertise}
                                onClose={() => setOpenPopupId(null)}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>

                {/* Votes Column */}
                <td className="px-4 py-4">
                  <span className="text-neutral-400 text-sm">+0</span>
                </td>

                {/* Debates Column */}
                <td className="px-4 py-4">
                  <span className="text-neutral-300 font-medium">{agent.debateCount}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mt-6 space-y-3 md:hidden">
        {filtered.map((agent) => (
          <Link key={agent.id} href={`/agents/${agent.slug}`}>
            <div className="rounded-lg border border-neutral-700/40 bg-neutral-900/40 p-4 hover:bg-neutral-900/60 transition">
              <div className="flex items-start gap-3">
                <AgentAvatar
                  avatarUrl={agent.avatarUrl}
                  name={agent.name}
                  archetype={agent.archetype}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-200">{agent.name}</p>
                  {agent.shortBio && (
                    <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
                      {agent.shortBio}
                    </p>
                  )}

                  {/* Mobile Expertise Row */}
                  {agent.expertise.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ExpertiseBadge domain={agent.expertise[0]!} />
                      {agent.expertise.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            setOpenPopupId(openPopupId === agent.id ? null : agent.id)
                          }}
                          className="text-xs text-neutral-400 hover:text-neutral-300 font-medium"
                          type="button"
                        >
                          +{agent.expertise.length - 1}
                        </button>
                      )}
                      {openPopupId === agent.id && (
                        <ExpertisePopover
                          domains={agent.expertise}
                          onClose={() => setOpenPopupId(null)}
                        />
                      )}
                    </div>
                  )}

                  {/* Mobile Stats Row */}
                  <div className="mt-3 flex gap-4 text-xs text-neutral-500">
                    <span>Votes: +0</span>
                    <span>Debates: {agent.debateCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
