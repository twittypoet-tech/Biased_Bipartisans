'use client'

import Link from 'next/link'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BracketAgent {
  id: string
  name: string
  archetype: string
  avatarUrl: string | null
  trophyCount?: number
}

export interface BracketMatchup {
  id: string
  matchupNumber: number
  status: 'pending' | 'scheduled' | 'live' | 'completed' | 'bye'
  agentA: BracketAgent | null
  agentB: BracketAgent | null
  winnerId: string | null
  debateSlug: string | null
}

export interface BracketRound {
  roundNumber: number
  label: string
  status: string
  matchups: BracketMatchup[]
}

interface TournamentBracketProps {
  rounds: BracketRound[]
  bracketSize: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Agent Slot ────────────────────────────────────────────────────────────────

function AgentSlot({
  agent,
  isWinner,
  isLoser,
  isTbd,
  isBye,
}: {
  agent: BracketAgent | null
  isWinner: boolean
  isLoser: boolean
  isTbd: boolean
  isBye: boolean
}) {
  if (isBye) {
    return (
      <div className="flex h-10 items-center gap-2.5 px-3">
        <div className="size-7 rounded-full bg-neutral-800/40 border border-neutral-700/30 flex items-center justify-center">
          <span className="text-[9px] text-neutral-600">—</span>
        </div>
        <span className="text-xs text-neutral-600 italic">BYE</span>
      </div>
    )
  }

  if (isTbd || !agent) {
    return (
      <div className="flex h-10 items-center gap-2.5 px-3">
        <div className="size-7 rounded-full bg-neutral-800/40 border border-dashed border-neutral-700/50 flex items-center justify-center">
          <span className="text-[9px] text-neutral-600">?</span>
        </div>
        <span className="text-xs text-neutral-600">TBD</span>
      </div>
    )
  }

  const pal = avatarPalette[agent.archetype] ?? defaultPalette

  return (
    <div
      className={`flex h-10 items-center gap-2.5 px-3 transition-colors ${
        isWinner
          ? 'bg-emerald-950/30'
          : isLoser
          ? 'opacity-40'
          : ''
      }`}
    >
      {/* Avatar */}
      {agent.avatarUrl ? (
        <div className="relative size-7 shrink-0 overflow-hidden rounded-full border border-neutral-800">
          <Image src={agent.avatarUrl} alt={agent.name} fill sizes="28px" className="object-cover" />
        </div>
      ) : (
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: pal.bg, color: pal.text }}
        >
          {getInitials(agent.name)}
        </span>
      )}

      {/* Name */}
      <span
        className={`truncate text-xs font-medium ${
          isWinner ? 'text-emerald-300' : isLoser ? 'text-neutral-600' : 'text-neutral-200'
        }`}
      >
        {agent.name}
      </span>

      {/* Winner check */}
      {isWinner && (
        <svg className="ml-auto mr-1 size-3.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  )
}

// ── Matchup Card ──────────────────────────────────────────────────────────────

function MatchupCard({ matchup }: { matchup: BracketMatchup }) {
  const isBye = matchup.status === 'bye'
  const isCompleted = matchup.status === 'completed'
  const isLive = matchup.status === 'live'
  const isScheduled = matchup.status === 'scheduled'

  const card = (
    <div
      className={`relative w-52 sm:w-56 overflow-hidden rounded-lg border transition-all ${
        isLive
          ? 'border-red-700/60 bg-red-950/20 shadow-lg shadow-red-950/30'
          : isCompleted
          ? 'border-neutral-700/60 bg-neutral-900/60'
          : isScheduled
          ? 'border-blue-800/40 bg-blue-950/10'
          : 'border-neutral-800/50 bg-neutral-900/30'
      } ${matchup.debateSlug ? 'hover:border-neutral-600/70 hover:bg-neutral-900/80' : ''}`}
    >
      {/* Live pulse bar */}
      {isLive && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500 opacity-80" />
      )}

      {/* Status pill */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800/40">
        {isBye ? (
          <span className="text-[10px] font-medium text-neutral-600">BYE</span>
        ) : isLive ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400">
            <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        ) : isScheduled ? (
          <span className="text-[10px] font-medium text-blue-400">SCHEDULED</span>
        ) : isCompleted ? (
          <span className="text-[10px] font-medium text-neutral-500">COMPLETED</span>
        ) : (
          <span className="text-[10px] font-medium text-neutral-700">PENDING</span>
        )}
        <span className="text-[10px] text-neutral-700">#{matchup.matchupNumber}</span>
      </div>

      {/* Agent A */}
      <AgentSlot
        agent={matchup.agentA}
        isWinner={isCompleted && matchup.winnerId === matchup.agentA?.id}
        isLoser={isCompleted && matchup.winnerId !== null && matchup.winnerId !== matchup.agentA?.id}
        isTbd={!matchup.agentA && !isBye}
        isBye={false}
      />

      {/* Divider */}
      <div className="mx-3 border-t border-neutral-800/40" />

      {/* Agent B (or BYE) */}
      {isBye ? (
        <AgentSlot agent={null} isWinner={false} isLoser={false} isTbd={false} isBye={true} />
      ) : (
        <AgentSlot
          agent={matchup.agentB}
          isWinner={isCompleted && matchup.winnerId === matchup.agentB?.id}
          isLoser={isCompleted && matchup.winnerId !== null && matchup.winnerId !== matchup.agentB?.id}
          isTbd={!matchup.agentB}
          isBye={false}
        />
      )}
    </div>
  )

  if (matchup.debateSlug) {
    return (
      <Link href={`/debates/${matchup.debateSlug}`} className="block">
        {card}
      </Link>
    )
  }

  return card
}

// ── Round Column ──────────────────────────────────────────────────────────────

function RoundColumn({ round }: { round: BracketRound }) {
  const isCompleted = round.status === 'completed'

  return (
    <div className="flex flex-col shrink-0">
      {/* Round header */}
      <div className="mb-4 text-center">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
            isCompleted
              ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/30'
              : 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/40'
          }`}
        >
          {round.label}
        </span>
      </div>

      {/* Matchup cells — vertically distributed */}
      <div className="flex flex-1 flex-col justify-around gap-4">
        {round.matchups.map((matchup) => (
          <div key={matchup.id} className="flex items-center justify-center">
            <MatchupCard matchup={matchup} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Bracket ──────────────────────────────────────────────────────────────

export function TournamentBracket({ rounds, bracketSize }: TournamentBracketProps) {
  if (rounds.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-neutral-700 py-20">
        <p className="text-neutral-500 text-sm">Bracket not yet available.</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto pb-4 -mx-4 px-4">
      {/* Min-width ensures bracket doesn't crush on very small brackets */}
      <div
        className="flex gap-8 sm:gap-10 min-w-max mx-auto"
        style={{ minWidth: `${Math.max(rounds.length * 240, 480)}px` }}
      >
        {rounds.map((round) => (
          <RoundColumn key={round.roundNumber} round={round} />
        ))}
      </div>

      {/* Scroll hint on mobile */}
      <p className="mt-4 text-center text-[11px] text-neutral-700 sm:hidden">
        Scroll horizontally to see all rounds
      </p>
    </div>
  )
}
