export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getTournamentBySlug, getTournamentRounds, getTournamentMatchups } from '@bipi/db'
import type { TournamentMatchup } from '@bipi/db'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string; roundSegment: string }>
}

const avatarPalette: Record<string, { bg: string; text: string }> = {
  hawk:                { bg: '#7f1d1d', text: '#fca5a5' },
  dove:                { bg: '#0c4a6e', text: '#7dd3fc' },
  technocrat:          { bg: '#3b0764', text: '#c4b5fd' },
  populist:            { bg: '#78350f', text: '#fcd34d' },
  cynic:               { bg: '#3f3f46', text: '#d4d4d8' },
  conspiracy_theorist: { bg: '#064e3b', text: '#6ee7b7' },
  institutionalist:    { bg: '#1e3a5f', text: '#93c5fd' },
  libertarian:         { bg: '#7c2d12', text: '#fdba74' },
}
const defaultPalette = { bg: '#27272a', text: '#a1a1aa' }

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function AgentChip({ raw, isWinner }: { raw: Record<string, unknown> | null; isWinner: boolean }) {
  if (!raw) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-700/50 bg-neutral-900/20 px-3 py-2 flex-1">
        <div className="size-6 rounded-full border border-dashed border-neutral-700/50 flex items-center justify-center">
          <span className="text-[9px] text-neutral-700">?</span>
        </div>
        <span className="text-xs text-neutral-600">TBD</span>
      </div>
    )
  }

  const pal = avatarPalette[raw.archetype as string] ?? defaultPalette
  const name = raw.name as string

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 flex-1 transition-colors ${
      isWinner
        ? 'border-emerald-800/50 bg-emerald-950/20'
        : 'border-neutral-800/50 bg-neutral-900/30'
    }`}>
      {raw.avatar_url ? (
        <div className="relative size-6 rounded-full overflow-hidden border border-neutral-800 shrink-0">
          <Image src={raw.avatar_url as string} alt={name} fill sizes="24px" className="object-cover" />
        </div>
      ) : (
        <span
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
          style={{ background: pal.bg, color: pal.text }}
        >
          {getInitials(name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/agents/${raw.slug as string}`}
          className={`block truncate text-xs font-medium ${isWinner ? 'text-emerald-300' : 'text-neutral-200'} hover:underline`}
        >
          {name}
        </Link>
        <p className="text-[10px] text-neutral-600 capitalize truncate">
          {(raw.archetype as string).replace(/_/g, ' ')}
        </p>
      </div>
      {isWinner && (
        <svg className="size-3.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  )
}

export default async function TournamentRoundPage({ params }: Props) {
  const { slug, roundSegment } = await params

  // Validate pattern: "round-{n}"
  const match = roundSegment.match(/^round-(\d+)$/)
  if (!match) notFound()
  const roundNumber = parseInt(match[1]!, 10)

  const db = createServerClient()
  const tournament = await getTournamentBySlug(db, slug)
  if (!tournament) notFound()

  const [rounds, allMatchups] = await Promise.all([
    getTournamentRounds(db, tournament.id),
    getTournamentMatchups(db, tournament.id),
  ])

  const round = rounds.find((r) => r.round_number === roundNumber)
  if (!round) notFound()

  const matchups = allMatchups.filter((m) => m.round_number === roundNumber)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-600 flex-wrap">
        <Link href="/tournaments" className="hover:text-neutral-400 transition-colors">Tournaments</Link>
        <span>/</span>
        <Link href={`/tournaments/${slug}`} className="hover:text-neutral-400 transition-colors truncate max-w-[140px]">
          {tournament.title}
        </Link>
        <span>/</span>
        <span className="text-neutral-400">{round.label}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            round.status === 'completed'
              ? 'bg-emerald-900/60 text-emerald-300'
              : 'bg-neutral-800/60 text-neutral-400'
          }`}>
            {round.label}
          </span>
          <span className="text-xs text-neutral-600">
            Round {round.round_number} of {tournament.total_rounds}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{tournament.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{tournament.topic_title}</p>
      </div>

      {/* Matchups */}
      <div className="space-y-4">
        {matchups.map((matchup) => {
          const agentA = matchup.agent_a as Record<string, unknown> | null
          const agentB = matchup.agent_b as Record<string, unknown> | null
          const debate = matchup.debate as Record<string, unknown> | null
          const isBye = matchup.status === 'bye'
          const isCompleted = matchup.status === 'completed'
          const isLive = matchup.status === 'live'

          return (
            <div
              key={matchup.id}
              className={`overflow-hidden rounded-xl border ${
                isLive
                  ? 'border-red-700/50 bg-red-950/10'
                  : isCompleted
                  ? 'border-neutral-700/50 bg-neutral-900/50'
                  : 'border-neutral-800 bg-neutral-900/30'
              }`}
            >
              {/* Matchup header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800/40">
                <span className="text-xs font-medium text-neutral-500">
                  Match {matchup.matchup_number}
                </span>
                {isLive && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
                    <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                )}
                {isCompleted && (
                  <span className="text-xs text-emerald-500">Completed</span>
                )}
                {matchup.status === 'scheduled' && (
                  <span className="text-xs text-blue-400">Scheduled</span>
                )}
                {matchup.status === 'pending' && (
                  <span className="text-xs text-neutral-600">Pending</span>
                )}
              </div>

              {/* Agents */}
              <div className="p-4">
                {isBye ? (
                  <div className="flex items-center gap-3">
                    <AgentChip raw={agentA} isWinner={false} />
                    <div className="shrink-0 text-xs font-bold text-neutral-700 px-1">BYE</div>
                    <div className="flex-1 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/20 px-3 py-2">
                      <span className="text-xs text-neutral-600 italic">Bye — auto advance</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <AgentChip
                      raw={agentA}
                      isWinner={isCompleted && matchup.winner_agent_id === matchup.agent_a_id}
                    />
                    <div className="text-center text-xs font-bold text-neutral-600 shrink-0">VS</div>
                    <AgentChip
                      raw={agentB}
                      isWinner={isCompleted && matchup.winner_agent_id === matchup.agent_b_id}
                    />
                  </div>
                )}

                {/* Debate link */}
                {(() => {
                  const debateSlug = (debate as Record<string, unknown> | null)?.slug as string | undefined
                  if (!debateSlug) return null
                  return (
                    <div className="mt-3 pt-3 border-t border-neutral-800/40">
                      <Link
                        href={`/debates/${debateSlug}`}
                        className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors"
                      >
                        <span>View debate</span>
                        <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation between rounds */}
      <div className="mt-10 flex items-center justify-between gap-4">
        {roundNumber > 1 ? (
          <Link
            href={`/tournaments/${slug}/round-${roundNumber - 1}`}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-2 text-sm text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous round
          </Link>
        ) : (
          <Link
            href={`/tournaments/${slug}`}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-2 text-sm text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Bracket
          </Link>
        )}

        {roundNumber < tournament.total_rounds ? (
          <Link
            href={`/tournaments/${slug}/round-${roundNumber + 1}`}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-2 text-sm text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors"
          >
            Next round
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <Link
            href={`/tournaments/${slug}`}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-2 text-sm text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors"
          >
            Full bracket
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  )
}
