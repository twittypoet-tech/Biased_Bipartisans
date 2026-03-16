export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getDebateBySlug, getDebateFormat, getDebateParticipants, getDebateTurns, listAgents } from '@bipi/db'
import { statusColors, getArchetypeColor } from '@/lib/agent-colors'
import { ConfigSection, DataList } from '@/components/admin/config-section'
import { ParticipantManager } from '@/components/admin/participant-manager'
import { BackfillAudioButton } from '@/components/admin/backfill-audio-button'
import { EndDebateButton } from '@/components/admin/end-debate-button'

export default async function DebateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = createServerClient()
  const debate = await getDebateBySlug(db, slug)
  if (!debate) notFound()

  const [format, participants, turns, allAgents] = await Promise.all([
    getDebateFormat(db, debate.format_id),
    getDebateParticipants(db, debate.id),
    getDebateTurns(db, debate.id),
    listAgents(db),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const framing = debate.topic_framing as any

  // Build participant info for the manager
  const participantIds = new Set(participants.map((p) => p.agent_id))

  const currentParticipants = participants.map((p) => {
    const agent = (p as unknown as Record<string, unknown>).agents as Record<string, string> | undefined
    return {
      id: p.agent_id,
      name: agent?.name ?? 'Unknown',
      slug: agent?.slug ?? '',
      archetype: agent?.archetype ?? 'unknown',
      role: p.role as string,
    }
  })

  const availableAgents = allAgents
    .filter((a) => !participantIds.has(a.id))
    .map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      archetype: a.archetype,
      role: a.role,
    }))

  const moderatorAgent = allAgents.find((a) => a.role === 'moderator')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{debate.title}</h1>
            {framing?.headline && (
              <p className="mt-1 text-neutral-400">{framing.headline}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm ${statusColors[debate.status] ?? ''}`}>
              {debate.status}
            </span>
            {(debate.status === 'live' || debate.status === 'scheduled') && (
              <EndDebateButton debateId={debate.id} />
            )}
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-neutral-500">
          <span>Room: {debate.room_name}</span>
          {format && <span>Format: {format.name}</span>}
          {debate.scheduled_at && (
            <span>Scheduled: {new Date(debate.scheduled_at).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Topic Framing */}
      {framing && (
        <ConfigSection title="Topic Framing" defaultOpen>
          <DataList
            items={[
              { label: 'Headline', value: framing.headline },
              { label: 'Conflict', value: framing.conflict_description },
              { label: 'Forced Tradeoff', value: framing.forced_tradeoff },
              { label: 'Decision Surface', value: framing.decision_surface },
              ...(framing.moral_tension
                ? [{ label: 'Moral Tension', value: framing.moral_tension }]
                : []),
              ...(framing.strategic_tension
                ? [{ label: 'Strategic Tension', value: framing.strategic_tension }]
                : []),
              ...(framing.identity_tension
                ? [{ label: 'Identity Tension', value: framing.identity_tension }]
                : []),
            ]}
          />
        </ConfigSection>
      )}

      {/* Format & Rounds */}
      {format && (
        <ConfigSection title="Format & Rounds" defaultOpen>
          <div className="space-y-3">
            <DataList
              items={[
                { label: 'Format', value: format.name },
                { label: 'Room Type', value: format.room_format.replace(/_/g, ' ') },
                {
                  label: 'Participants',
                  value: `${format.min_participants}–${format.max_participants}`,
                },
              ]}
            />
            <div className="mt-3 space-y-2">
              {(format.round_sequence as unknown as Array<Record<string, unknown>>).map((round, i) => (
                <div
                  key={i}
                  className="rounded border border-neutral-800 bg-neutral-950/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {i + 1}. {String(round.phase ?? '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {round.duration_seconds as number}s
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">{round.description as string}</p>
                </div>
              ))}
            </div>
          </div>
        </ConfigSection>
      )}

      {/* Participants — now with assignment manager */}
      <ConfigSection title={`Participants (${participants.length})`} defaultOpen>
        <ParticipantManager
          debateId={debate.id}
          debateStatus={debate.status}
          formatMinParticipants={format?.min_participants ?? 2}
          formatMaxParticipants={format?.max_participants ?? 4}
          currentParticipants={currentParticipants}
          availableAgents={availableAgents}
          moderatorId={moderatorAgent?.id ?? null}
        />
      </ConfigSection>

      {/* Audio Backfill */}
      {turns.length > 0 && (
        <ConfigSection title="Audio" defaultOpen>
          <BackfillAudioButton
            debateId={debate.id}
            turnsWithoutAudio={turns.filter((t) => !t.audio_url).length}
            totalTurns={turns.length}
          />
        </ConfigSection>
      )}

      {/* Transcript */}
      {turns.length > 0 && (
        <ConfigSection title={`Transcript (${turns.length} turns)`}>
          <div className="space-y-2">
            {turns.map((turn) => (
              <div key={turn.id} className="rounded border border-neutral-800 bg-neutral-950/50 p-3">
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>#{turn.turn_index}</span>
                  <span>{turn.round_phase.replace(/_/g, ' ')}</span>
                  <span>·</span>
                  <span>{turn.speaker_type}</span>
                  {turn.claim_tier && (
                    <>
                      <span>·</span>
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5">
                        {turn.claim_tier.replace(/_/g, ' ')}
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-sm">{turn.transcript}</p>
              </div>
            ))}
          </div>
        </ConfigSection>
      )}
    </div>
  )
}
