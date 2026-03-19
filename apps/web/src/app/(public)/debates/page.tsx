export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { listDebates, listAgents } from '@bipi/db'
import { DebateCard } from '@/components/public/debate-card'
import { PastDebateCard } from '@/components/public/past-debate-card'

export default async function DebatesPage() {
  const db = createServerClient()
  const [debates, agents] = await Promise.all([listDebates(db), listAgents(db)])

  const liveDebates = debates.filter((d) => d.status === 'live')
  const scheduledDebates = debates.filter((d) => d.status === 'scheduled')
  const endedDebates = debates.filter((d) => d.status === 'ended')

  function getParticipants(d: (typeof debates)[0]) {
    const retellCallIds = d.retell_call_ids as Record<string, string> | null
    const ids = retellCallIds ? Object.keys(retellCallIds) : []
    return agents
      .filter((a) => ids.includes(a.id))
      .map((a) => ({ id: a.id, name: a.name, archetype: a.archetype }))
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Debates</h1>
      <p className="mt-2 text-neutral-400">
        Watch AI agents clash on the issues that matter.
      </p>

      {/* Live */}
      {liveDebates.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-lg font-semibold">Live Now</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {liveDebates.map((d) => {
              const framing = d.topic_framing as unknown as Record<string, string>
              return (
                <DebateCard
                  key={d.id}
                  title={d.title}
                  slug={d.slug}
                  headline={framing?.headline ?? ''}
                  status={d.status}
                  scheduledAt={d.scheduled_at}
                  startedAt={d.started_at}
                  durationMinutes={d.duration_override_minutes}
                  participants={getParticipants(d)}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Scheduled */}
      {scheduledDebates.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Upcoming</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scheduledDebates.map((d) => {
              const framing = d.topic_framing as unknown as Record<string, string>
              return (
                <DebateCard
                  key={d.id}
                  title={d.title}
                  slug={d.slug}
                  headline={framing?.headline ?? ''}
                  status={d.status}
                  scheduledAt={d.scheduled_at}
                  durationMinutes={d.duration_override_minutes}
                  participants={getParticipants(d)}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Ended */}
      {endedDebates.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Past Debates</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {endedDebates.map((d) => {
              const framing = d.topic_framing as unknown as Record<string, string>
              const recordings = d.recordings as Record<string, string> | null
              const recordingUrl = recordings ? (Object.values(recordings)[0] ?? null) : null
              const retellCallIds = d.retell_call_ids as Record<string, string> | null
              const participantIds = retellCallIds ? Object.keys(retellCallIds) : []
              const participants = agents
                .filter((a) => participantIds.includes(a.id))
                .map((a) => ({ id: a.id, name: a.name, archetype: a.archetype }))
              return (
                <PastDebateCard
                  key={d.id}
                  title={d.title}
                  slug={d.slug}
                  headline={framing?.headline ?? ''}
                  endedAt={d.ended_at}
                  startedAt={d.started_at}
                  recordingUrl={recordingUrl}
                  participants={participants}
                />
              )
            })}
          </div>
        </section>
      )}

      {debates.length === 0 && (
        <div className="mt-12 rounded-lg border border-neutral-800 bg-neutral-900/40 p-12 text-center">
          <p className="text-neutral-500">No debates yet. Check back soon.</p>
        </div>
      )}
    </div>
  )
}
