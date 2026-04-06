export const dynamic = 'force-dynamic'

import { createServerClient, createAuthServerClient } from '@/lib/supabase/server'
import { listDebates, listDebateParticipants, listPublishedReporterCalls, listActiveReporterPresets, listAgents, listUserPresets } from '@bipi/db'
import { DebateCard } from '@/components/public/debate-card'
import { CallHero } from '@/components/home/call-hero'
import { ReporterForum } from '@/components/home/reporter-forum'

export default async function HomePage() {
  const db = createServerClient()
  const [debates, reporterCalls, presets, allAgents] = await Promise.all([
    listDebates(db),
    listPublishedReporterCalls(db, { limit: 30, sort: 'hot' }),
    listActiveReporterPresets(db),
    listAgents(db),
  ])

  // Fetch user presets if authenticated
  let userPresets: { id: string; title: string; query_template: string; interest: string | null; sort_order: number }[] = []
  try {
    const authClient = await createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      const up = await listUserPresets(db, user.id)
      userPresets = up
    }
  } catch { /* not authenticated */ }

  const liveDebates  = debates.filter((d) => d.status === 'live')
  const endedDebates = debates.filter((d) => d.status === 'ended')

  // Participants for live debate(s) + all ended debates
  const participantDebateIds = [
    ...liveDebates.map((d) => d.id),
    ...endedDebates.map((d) => d.id),
  ]
  const participantsMap = participantDebateIds.length > 0
    ? await listDebateParticipants(db, participantDebateIds)
    : {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parseParticipants(debateId: string) {
    const rows = participantsMap[debateId] ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows as any[])
      .filter((r) => r.role !== 'moderator')
      .map((r) => ({
        id:        r.agent_id as string,
        name:      (r.agents?.name     ?? '') as string,
        archetype: (r.agents?.archetype ?? '') as string,
        avatarUrl: (r.agents?.avatar_url ?? null) as string | null,
        role:      (r.role ?? '') as string,
        expertise: (r.agents?.expertise  ?? []) as string[],
      }))
  }

  // Featured live debate (shown above the stack when live)
  const featuredLive = liveDebates[0] ?? null

  // Build agent options for CallHero — only The Reporter is functional for now
  const agentOptions = allAgents
    .filter((a) => a.retell_agent_id)
    .map((a) => ({
      id: a.id,
      name: a.name,
      avatarUrl: a.avatar_url,
      available: a.role === 'reporter',
    }))
  // Ensure The Reporter is first
  agentOptions.sort((a, b) => (a.available === b.available ? 0 : a.available ? -1 : 1))

  return (
    <div className="bg-t-bg">

      {/* ── Chat Hero ─────────────────────────────────────────────────────── */}
      <CallHero presets={presets} agents={agentOptions} userPresets={userPresets} />

      {/* ── Live Debate Banner (when live) ────────────────────────────────── */}
      {featuredLive && (
        <section className="py-12 bg-t-bg">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <div className="mb-6 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-800/60 bg-red-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-400">
                <span className="size-1.5 rounded-full bg-red-400 animate-ping" />
                Happening Now
              </span>
              <h2 className="mt-3 text-2xl font-bold text-t-text">A Debate is Live</h2>
            </div>
            <DebateCard
              title={featuredLive.title}
              slug={featuredLive.slug}
              headline={(featuredLive.topic_framing as unknown as Record<string, string> | null)?.headline ?? ''}
              status={featuredLive.status}
              scheduledAt={featuredLive.scheduled_at}
              startedAt={featuredLive.started_at}
              durationMinutes={featuredLive.duration_override_minutes}
              participants={parseParticipants(featuredLive.id)}
            />
          </div>
        </section>
      )}

      {/* ── Reporter Forum ────────────────────────────────────────────────── */}
      <ReporterForum initialCalls={reporterCalls} />

    </div>
  )
}
