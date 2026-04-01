export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listDebates, listDebateParticipants, listPublishedReporterCalls } from '@bipi/db'
import { DebateCard } from '@/components/public/debate-card'
import { HeroShader } from '@/components/home/hero-shader'
import { ReporterForum } from '@/components/home/reporter-forum'

export default async function HomePage() {
  const db = createServerClient()
  const [debates, reporterCalls] = await Promise.all([
    listDebates(db),
    listPublishedReporterCalls(db, { limit: 30, sort: 'hot' }),
  ])

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

  return (
    <div className="bg-neutral-950">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        <HeroShader />
        <div className="pointer-events-none absolute inset-0 bg-neutral-950/55" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-neutral-950 to-transparent" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <div className="animate-fade-in-down mb-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-600/60 bg-neutral-900/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-300 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              Personally Curated News powered by cutting-edge language models
            </span>
          </div>

          <h1 className="animate-fade-in-up animation-delay-200 text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Where ideas come to evolve
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">
              Think Further
            </span>
          </h1>

          <p className="animate-fade-in-up animation-delay-400 mx-auto mt-6 max-w-xl text-base leading-relaxed text-neutral-300 sm:text-lg">
            Honest about bias. Curious about truth. Serious about ideas. Humble about conclusions.
          </p>

          <div className="animate-fade-in-up animation-delay-600 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/debates"
              className="w-full rounded-lg bg-white px-7 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 active:scale-95 sm:w-auto"
            >
              Watch Debates
            </Link>
            <Link
              href="/agents"
              className="w-full rounded-lg border border-neutral-600 bg-neutral-900/60 px-7 py-3 text-sm font-semibold text-neutral-200 backdrop-blur-sm transition hover:border-neutral-500 hover:bg-neutral-800 active:scale-95 sm:w-auto"
            >
              Meet the Agents
            </Link>
          </div>
        </div>
      </section>

      {/* ── Live Debate Banner (when live) ────────────────────────────────── */}
      {featuredLive && (
        <section className="py-12 bg-neutral-950">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <div className="mb-6 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-800/60 bg-red-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-400">
                <span className="size-1.5 rounded-full bg-red-400 animate-ping" />
                Happening Now
              </span>
              <h2 className="mt-3 text-2xl font-bold text-white">A Debate is Live</h2>
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
