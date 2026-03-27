export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getTournamentBySlug, getTournamentRounds, getTournamentMatchups } from '@bipi/db'
import type { TournamentMatchup, TournamentRound } from '@bipi/db'
import { TournamentBracket } from '@/components/public/tournament-bracket'
import type { BracketRound, BracketMatchup, BracketAgent } from '@/components/public/tournament-bracket'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

const statusConfig: Record<string, { label: string; badge: string }> = {
  pending:   { label: 'Upcoming',  badge: 'bg-blue-900/60 text-blue-200' },
  active:    { label: 'Active',    badge: 'bg-amber-900/60 text-amber-200' },
  completed: { label: 'Completed', badge: 'bg-emerald-900/60 text-emerald-200' },
  cancelled: { label: 'Cancelled', badge: 'bg-zinc-800/60 text-zinc-400' },
}

function toAgent(raw: Record<string, unknown> | null | undefined): BracketAgent | null {
  if (!raw) return null
  return {
    id: raw.id as string,
    name: (raw.name as string) ?? 'Unknown',
    archetype: (raw.archetype as string) ?? 'unknown',
    avatarUrl: (raw.avatar_url as string | null) ?? null,
    trophyCount: (raw.trophy_count as number) ?? 0,
  }
}

function buildBracketData(rounds: TournamentRound[], matchups: TournamentMatchup[]): BracketRound[] {
  return rounds.map((round) => {
    const roundMatchups = matchups.filter((m) => m.round_number === round.round_number)
    return {
      roundNumber: round.round_number,
      label: round.label,
      status: round.status,
      matchups: roundMatchups.map((m): BracketMatchup => ({
        id: m.id,
        matchupNumber: m.matchup_number,
        status: m.status,
        agentA: toAgent(m.agent_a as Record<string, unknown> | null),
        agentB: toAgent(m.agent_b as Record<string, unknown> | null),
        winnerId: m.winner_agent_id,
        debateSlug: (m.debate as Record<string, unknown> | null)?.slug as string | null ?? null,
      })),
    }
  })
}

export default async function TournamentDetailPage({ params }: Props) {
  const { slug } = await params
  const db = createServerClient()

  const tournament = await getTournamentBySlug(db, slug)
  if (!tournament) notFound()

  const [rounds, matchups] = await Promise.all([
    getTournamentRounds(db, tournament.id),
    getTournamentMatchups(db, tournament.id),
  ])

  const bracketData = buildBracketData(rounds, matchups)
  const cfg = statusConfig[tournament.status] ?? statusConfig.pending!
  const champion = tournament.champion as Record<string, unknown> | null

  const avatarPalette: Record<string, { bg: string; text: string }> = {
    hawk: { bg: '#7f1d1d', text: '#fca5a5' },
    dove: { bg: '#0c4a6e', text: '#7dd3fc' },
    technocrat: { bg: '#3b0764', text: '#c4b5fd' },
    populist: { bg: '#78350f', text: '#fcd34d' },
    cynic: { bg: '#3f3f46', text: '#d4d4d8' },
  }
  const defaultPalette = { bg: '#27272a', text: '#a1a1aa' }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-600">
        <Link href="/tournaments" className="hover:text-neutral-400 transition-colors">Tournaments</Link>
        <span>/</span>
        <span className="text-neutral-400 truncate max-w-[200px]">{tournament.title}</span>
      </nav>

      {/* Hero */}
      <div className="mb-8 sm:mb-10">
        <div className="flex flex-wrap items-start gap-3 mb-4">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
            <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
            </svg>
            {tournament.bracket_size}-agent bracket · {tournament.total_rounds} rounds
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-3">
          {tournament.title}
        </h1>

        {tournament.description && (
          <p className="text-neutral-400 text-base max-w-2xl leading-relaxed mb-4">
            {tournament.description}
          </p>
        )}

        {/* Topic pill */}
        <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-2.5">
          <span className="text-xs text-neutral-600 uppercase tracking-wider font-medium">Topic</span>
          <span className="text-neutral-200 font-medium text-sm">{tournament.topic_title}</span>
        </div>
      </div>

      {/* Champion banner (completed) */}
      {tournament.status === 'completed' && champion && (
        <div className="mb-8 overflow-hidden rounded-xl border border-amber-700/40 bg-gradient-to-r from-amber-950/40 via-amber-900/10 to-neutral-900/40 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-3xl sm:text-4xl" aria-hidden>🏆</div>
            <div>
              <p className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold mb-1">Tournament Champion</p>
              <div className="flex items-center gap-3">
                {champion.avatar_url ? (
                  <div className="relative size-10 rounded-full overflow-hidden border border-amber-700/40">
                    <Image src={champion.avatar_url as string} alt={champion.name as string} fill sizes="40px" className="object-cover" />
                  </div>
                ) : (
                  <span
                    className="inline-flex size-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{ background: (avatarPalette[champion.archetype as string] ?? defaultPalette).bg, color: (avatarPalette[champion.archetype as string] ?? defaultPalette).text }}
                  >
                    {(champion.name as string).split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                )}
                <div>
                  <Link
                    href={`/agents/${champion.slug as string}`}
                    className="text-lg font-bold text-amber-300 hover:text-amber-200 transition-colors"
                  >
                    {champion.name as string}
                  </Link>
                  <p className="text-xs text-amber-500/60 capitalize">{(champion.archetype as string).replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar (active) */}
      {tournament.status === 'active' && tournament.current_round > 0 && (
        <div className="mb-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
            <span>Round {tournament.current_round} of {tournament.total_rounds}</span>
            <span>{Math.round((tournament.current_round / tournament.total_rounds) * 100)}% complete</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${(tournament.current_round / tournament.total_rounds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Bracket */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-5">Bracket</h2>
        <TournamentBracket rounds={bracketData} bracketSize={tournament.bracket_size} />
      </section>

      {/* Round quick nav */}
      {rounds.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4">Rounds</h2>
          <div className="flex flex-wrap gap-2">
            {rounds.map((round) => (
              <Link
                key={round.id}
                href={`/tournaments/${slug}/round-${round.round_number}`}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  round.status === 'completed'
                    ? 'border-emerald-800/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40'
                    : round.status === 'live'
                    ? 'border-amber-800/40 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40'
                    : 'border-neutral-800 bg-neutral-900/40 text-neutral-500 hover:bg-neutral-900/70'
                }`}
              >
                {round.label}
                {round.status === 'completed' && <span className="ml-1.5 text-emerald-600">✓</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="mt-10">
        <Link href="/tournaments" className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All tournaments
        </Link>
      </div>
    </div>
  )
}
