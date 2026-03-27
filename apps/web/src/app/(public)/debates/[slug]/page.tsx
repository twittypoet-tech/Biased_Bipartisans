export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getDebateBySlug, getDebateFormat, getDebateParticipants, getDebateTurns, getDebateVotes, getEvalRunsForDebate, getTournamentMatchupByDebateId, getTournamentById, getPlaylistBySlug } from '@bipi/db'
import { getArchetypeColor, statusColors } from '@/lib/agent-colors'
import { VotingPanel } from '@/components/public/voting-panel'
import { DebateRoom } from '@/components/public/debate-room'
import { DebatePlayer } from '@/components/public/debate-player'
import { DebateTimer } from '@/components/public/debate-timer'
import { ScheduledDebatePoller } from '@/components/public/scheduled-debate-poller'
import { CompositeScoreBadge, LayerBreakdown } from '@/components/public/score-display'
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

  const debateRecord = debate as unknown as Record<string, unknown>

  const [format, participants, turns, votes, tournamentMatchup] = await Promise.all([
    getDebateFormat(db, debate.format_id),
    getDebateParticipants(db, debate.id),
    getDebateTurns(db, debate.id),
    getDebateVotes(db, debate.id),
    debateRecord.tournament_id
      ? getTournamentMatchupByDebateId(db, debate.id)
      : Promise.resolve(null),
  ])

  // Fetch tournament + playlist context for badges (parallel)
  const [tournamentContext, playlistContext] = await Promise.all([
    tournamentMatchup?.tournament_id
      ? getTournamentById(db, tournamentMatchup.tournament_id)
      : Promise.resolve(null),
    debateRecord.playlist_id
      ? (async () => {
          const { data } = await db.from('playlists').select('id,title,slug').eq('id', debateRecord.playlist_id).single()
          return data as { id: string; title: string; slug: string } | null
        })()
      : Promise.resolve(null),
  ])

  const framing = debate.topic_framing as unknown as Record<string, string>
  const statusColor = statusColors[debate.status] ?? 'bg-zinc-700 text-zinc-300'
  const isLive = debate.status === 'live'
  const isEnded = debate.status === 'ended'
  const isScheduled = debate.status === 'scheduled'

  // Fetch eval runs for ended debates (for score display)
  const evalRuns = isEnded ? await getEvalRunsForDebate(db, debate.id) : []

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
      avatarUrl: (agent?.avatar_url as string | null) ?? null,
      expertise: (agent?.expertise as string[]) ?? [],
    }
  })

  const debaters = participantAgents.filter((p) => p.role === 'debater')
  const moderator = participantAgents.find((p) => p.role === 'moderator')

  // Estimated total duration from format round_sequence
  const roundSequence = format?.round_sequence as unknown as Array<Record<string, unknown>> | undefined
  const estimatedDurationSec = roundSequence
    ? roundSequence.reduce((sum, r) => sum + ((r.duration_seconds as number) ?? 0), 0)
    : 0

  // Build transcript turns with speaker names
  const transcriptTurns = turns.map((t) => {
    const speaker = participantAgents.find((p) => p.id === t.speaker_id)
    return {
      id: t.id,
      speakerType: t.speaker_type,
      speakerName: speaker?.name ?? 'Unknown',
      speakerId: t.speaker_id,
      archetype: speaker?.archetype ?? 'unknown',
      roundPhase: t.round_phase,
      turnIndex: t.turn_index,
      transcript: t.transcript,
      claimTier: t.claim_tier,
      isModerator: t.speaker_type === 'moderator',
      audioUrl: (t as unknown as Record<string, unknown>).audio_url as string | null ?? null,
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

  // LiveKit room name — must match what DebateConductor uses (debate.room_name from DB)
  const livekitRoomName = debate.room_name

  // Stage participants
  const stageParticipants = participantAgents.map((p) => ({
    id: p.id,
    name: p.name,
    archetype: p.archetype,
    role: p.role as 'debater' | 'moderator',
    avatarUrl: p.avatarUrl,
    expertise: p.expertise,
    shortBio: p.shortBio,
  }))

  // Initial turns for live room
  const initialLiveTurns = transcriptTurns.map((t) => ({
    id: t.id,
    speakerName: t.speakerName,
    speakerId: t.speakerId,
    archetype: t.archetype,
    roundPhase: t.roundPhase,
    turnIndex: t.turnIndex,
    transcript: t.transcript,
    isModerator: t.isModerator,
  }))

  // Playback turns for ended debates (include startedAt for recording seek)
  const playbackTurns = turns.map((t) => {
    const speaker = participantAgents.find((p) => p.id === t.speaker_id)
    return {
      id: t.id,
      speakerName: speaker?.name ?? 'Unknown',
      speakerId: t.speaker_id,
      archetype: speaker?.archetype ?? 'unknown',
      roundPhase: t.round_phase,
      turnIndex: t.turn_index,
      transcript: t.transcript,
      isModerator: t.speaker_type === 'moderator',
      audioUrl: (t as unknown as Record<string, unknown>).audio_url as string | null ?? null,
      claimTier: t.claim_tier,
      startedAt: (t as unknown as Record<string, unknown>).started_at as string | null ?? null,
    }
  })

  // Pick the moderator's recording — their Retell call captures the full mixed audio.
  // Fall back to the first available recording if the moderator's ID isn't in the map.
  const debateRecordings = (debate as unknown as Record<string, unknown>).recordings as
    | Record<string, string>
    | null
  const recordingUrl = debateRecordings
    ? (debateRecordings[moderator?.id ?? ''] ?? Object.values(debateRecordings)[0] ?? null)
    : null

  // Sidebar (shared across states)
  const sidebar = (
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

      {/* Vote Results (ended) */}
      {isEnded && Object.keys(voteTallies).length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Vote Results</h2>
          <div className="space-y-3">
            {Object.entries(voteTallies).map(([voteType, tally]) => (
              <div key={voteType} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
                <h3 className="mb-1.5 text-xs font-medium text-neutral-300">
                  {voteType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </h3>
                <div className="space-y-1">
                  {Object.entries(tally)
                    .sort(([, a], [, b]) => b - a)
                    .map(([agentId, count]) => {
                      const agent = participantAgents.find((a) => a.id === agentId)
                      const colors = getArchetypeColor(agent?.archetype ?? '')
                      return (
                        <div key={agentId} className="flex items-center justify-between text-xs">
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

      {/* Performance Scores (ended debates with eval data) */}
      {isEnded && evalRuns.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">Performance Scores</h2>
          <div className="space-y-3">
            {evalRuns.map((run) => {
              const agent = debaters.find((a) => a.id === run.agent_id)
              const colors = getArchetypeColor(agent?.archetype ?? '')
              return (
                <div key={run.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${colors.text}`}>{agent?.name ?? 'Unknown'}</span>
                    <CompositeScoreBadge score={run.composite_score ?? null} />
                  </div>
                  <LayerBreakdown
                    aiJudgeScore={run.ai_judge_score ?? null}
                    objectiveScore={run.objective_score ?? null}
                    audienceScore={run.audience_score ?? null}
                    compositeScore={run.composite_score ?? null}
                  />
                </div>
              )
            })}
          </div>
        </section>
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
            {roundSequence?.map((round, i) => (
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
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor} ${isLive ? 'animate-pulse' : ''}`}>
            {isLive ? 'LIVE' : debate.status.toUpperCase()}
          </span>
          {format && (
            <span className="text-xs text-neutral-500">{format.name}</span>
          )}
          {/* Duration badge for ended debates */}
          {isEnded && debate.started_at && debate.ended_at && (
            <DebateTimer
              startedAt={debate.started_at}
              endedAt={debate.ended_at}
              estimatedDurationSec={estimatedDurationSec}
              mode="static"
            />
          )}
          {/* Tournament context badge */}
          {tournamentContext && (
            <Link
              href={`/tournaments/${tournamentContext.slug}`}
              className="flex items-center gap-1.5 rounded-full border border-amber-700/40 bg-amber-950/30 px-2.5 py-0.5 text-xs font-medium text-amber-400 hover:bg-amber-950/50 transition-colors"
            >
              <span aria-hidden>🏆</span>
              {tournamentContext.title}
              {tournamentMatchup && (
                <span className="text-amber-600">· R{tournamentMatchup.round_number}</span>
              )}
            </Link>
          )}
          {/* Playlist context badge */}
          {playlistContext && (
            <Link
              href={`/playlists/${playlistContext.slug}`}
              className="flex items-center gap-1.5 rounded-full border border-blue-700/40 bg-blue-950/30 px-2.5 py-0.5 text-xs font-medium text-blue-400 hover:bg-blue-950/50 transition-colors"
            >
              <span aria-hidden>🎵</span>
              {playlistContext.title}
            </Link>
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

      {/* === LIVE DEBATE ROOM === */}
      {isLive && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <DebateRoom
              debateId={debate.id}
              roomName={livekitRoomName}
              participants={stageParticipants}
              initialTurns={initialLiveTurns}
              currentPhase={currentPhase}
              startedAt={debate.started_at}
              estimatedDurationSec={estimatedDurationSec}
            />
          </div>
          {sidebar}
        </div>
      )}

      {/* === ENDED DEBATE WITH AUDIO PLAYER === */}
      {isEnded && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <DebatePlayer
              turns={playbackTurns}
              participants={stageParticipants}
              startedAt={debate.started_at ?? debate.created_at}
              endedAt={debate.ended_at ?? debate.created_at}
              estimatedDurationSec={estimatedDurationSec}
              recordingUrl={recordingUrl}
            />
          </div>
          {sidebar}
        </div>
      )}

      {/* === SCHEDULED (preview) === */}
      {isScheduled && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex h-64 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40">
            <div className="text-center">
              <p className="text-lg font-semibold text-neutral-300">Debate hasn&apos;t started yet</p>
              <p className="mt-1 text-sm text-neutral-500">This page will update automatically when it goes live</p>
            </div>
          </div>
          {sidebar}
          <ScheduledDebatePoller debateId={debate.id} />
        </div>
      )}
    </div>
  )
}
