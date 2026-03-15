export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getDebateBySlug, getDebateFormat, getDebateParticipants, getDebateTurns, getDebateVotes } from '@bipi/db'
import { getArchetypeColor, statusColors } from '@/lib/agent-colors'
import { TranscriptTimeline } from '@/components/public/transcript-timeline'
import { VotingPanel } from '@/components/public/voting-panel'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function DebateDetailPage({ params }: Props) {
  const { slug } = await params
  const db = createServerClient()
  const debate = await getDebateBySlug(db, slug)

  if (!debate) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Debate not found</h1>
        <Link href="/debates" className="mt-4 inline-block text-sm text-neutral-400 hover:text-white transition">
          Back to debates
        </Link>
      </div>
    )
  }

  const [format, participants, turns, votes] = await Promise.all([
    getDebateFormat(db, debate.format_id),
    getDebateParticipants(db, debate.id),
    getDebateTurns(db, debate.id),
    getDebateVotes(db, debate.id),
  ])

  const framing = debate.topic_framing as unknown as Record<string, string>
  const statusColor = statusColors[debate.status] ?? 'bg-zinc-700 text-zinc-300'
  const isLive = debate.status === 'live'
  const isEnded = debate.status === 'ended'
  const isScheduled = debate.status === 'scheduled'

  // Build participant info with agent data from the join
  const participantAgents = participants.map((p) => {
    const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
    return {
      id: p.agent_id,
      name: (agent?.name as string) ?? 'Unknown',
      slug: (agent?.slug as string) ?? '',
      archetype: (agent?.archetype as string) ?? 'unknown',
      role: p.role,
      shortBio: (agent?.short_bio as string) ?? '',
    }
  })

  const debaters = participantAgents.filter((p) => p.role === 'debater')
  const moderator = participantAgents.find((p) => p.role === 'moderator')

  // Build transcript turns with speaker names
  const transcriptTurns = turns.map((t) => {
    const speaker = participantAgents.find((p) => p.id === t.speaker_id)
    return {
      id: t.id,
      speakerType: t.speaker_type,
      speakerName: speaker?.name ?? 'Unknown',
      archetype: speaker?.archetype ?? 'unknown',
      roundPhase: t.round_phase,
      turnIndex: t.turn_index,
      transcript: t.transcript,
      claimTier: t.claim_tier,
    }
  })

  // Current phase (last turn's phase)
  const currentPhase = turns.length > 0 ? turns[turns.length - 1]!.round_phase : null

  // Vote tallies for ended debates
  const voteTallies: Record<string, Record<string, number>> = {}
  if (isEnded) {
    for (const vote of votes) {
      if (!vote.target_agent_id) continue
      const type = vote.vote_type
      if (!voteTallies[type]) voteTallies[type] = {}
      voteTallies[type]![vote.target_agent_id] = (voteTallies[type]![vote.target_agent_id] ?? 0) + 1
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor} ${isLive ? 'animate-pulse' : ''}`}>
            {isLive ? 'LIVE' : debate.status.toUpperCase()}
          </span>
          {format && (
            <span className="text-xs text-neutral-500">{format.name}</span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{debate.title}</h1>
        {framing?.headline && (
          <p className="mt-2 text-lg text-neutral-400">{framing.headline}</p>
        )}
      </div>

      {/* Topic Framing (for scheduled/preview) */}
      {isScheduled && framing && (
        <section className="mb-8 rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Topic Framing</h2>
          <div className="space-y-3 text-sm">
            {framing.conflict_description && (
              <div>
                <span className="text-neutral-500">Conflict: </span>
                <span className="text-neutral-200">{framing.conflict_description}</span>
              </div>
            )}
            {framing.forced_tradeoff && (
              <div>
                <span className="text-neutral-500">Forced tradeoff: </span>
                <span className="text-neutral-200">{framing.forced_tradeoff}</span>
              </div>
            )}
            {framing.decision_surface && (
              <div>
                <span className="text-neutral-500">Decision surface: </span>
                <span className="text-neutral-200">{framing.decision_surface}</span>
              </div>
            )}
          </div>
          {debate.scheduled_at && (
            <div className="mt-4 text-sm text-neutral-400">
              Scheduled for {new Date(debate.scheduled_at).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div>
          {/* Transcript */}
          {(isLive || isEnded) && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                {isLive ? 'Live Transcript' : 'Transcript'}
              </h2>
              <TranscriptTimeline turns={transcriptTurns} />
            </section>
          )}

          {/* Vote Results (ended) */}
          {isEnded && Object.keys(voteTallies).length > 0 && (
            <section className="mt-8">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">Vote Results</h2>
              <div className="space-y-4">
                {Object.entries(voteTallies).map(([voteType, tally]) => (
                  <div key={voteType} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                    <h3 className="mb-2 text-sm font-medium text-neutral-300">
                      {voteType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </h3>
                    <div className="space-y-1">
                      {Object.entries(tally)
                        .sort(([, a], [, b]) => b - a)
                        .map(([agentId, count]) => {
                          const agent = participantAgents.find((a) => a.id === agentId)
                          const colors = getArchetypeColor(agent?.archetype ?? '')
                          return (
                            <div key={agentId} className="flex items-center justify-between text-sm">
                              <span className={colors.text}>{agent?.name ?? 'Unknown'}</span>
                              <span className="text-neutral-500">{count} vote{count !== 1 ? 's' : ''}</span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Participants */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Participants</h2>
            <div className="space-y-2">
              {debaters.map((agent) => {
                const colors = getArchetypeColor(agent.archetype)
                return (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.slug}`}
                    className={`block rounded-lg border ${colors.border} ${colors.bg} p-3 transition hover:brightness-110`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${colors.text}`}>{agent.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}>
                        {agent.archetype.replace('_', ' ')}
                      </span>
                    </div>
                    {agent.shortBio && (
                      <p className="mt-1 text-xs text-neutral-500 line-clamp-1">{agent.shortBio}</p>
                    )}
                  </Link>
                )
              })}
              {moderator && (
                <div className="rounded-lg border border-neutral-700/40 bg-neutral-900/30 p-3">
                  <span className="text-sm text-neutral-400">Moderator: {moderator.name}</span>
                </div>
              )}
            </div>
          </section>

          {/* Voting (live debates) */}
          {isLive && (
            <VotingPanel
              debateId={debate.id}
              agents={debaters.map((a) => ({ id: a.id, name: a.name, archetype: a.archetype }))}
              currentPhase={currentPhase}
              isLive={true}
            />
          )}

          {/* Format Info */}
          {format && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Format</h2>
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-sm">
                <p className="font-medium text-neutral-200">{format.name}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {format.min_participants}-{format.max_participants} participants
                </p>
                {(format.round_sequence as unknown as Array<Record<string, unknown>>)?.map((round, i) => (
                  <div key={i} className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-neutral-400 capitalize">
                      {(round.phase as string).replace('_', ' ')}
                    </span>
                    <span className="text-neutral-600">
                      {Math.round((round.duration_seconds as number) / 60)}min
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
