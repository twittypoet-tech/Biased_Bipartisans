export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listDebates, listAgents, listDebateParticipants } from '@bipi/db'
import { DebateCard } from '@/components/public/debate-card'
import { HeroShader } from '@/components/home/hero-shader'
import { AgentMarquee } from '@/components/home/agent-marquee'
import { FeaturesSection } from '@/components/home/features-section'
import { DebateCardStack, type DebateCardData } from '@/components/home/debate-card-stack'

export default async function HomePage() {
  const db = createServerClient()
  const [debates, agents] = await Promise.all([
    listDebates(db),
    listAgents(db),
  ])

  const liveDebates   = debates.filter((d) => d.status === 'live')
  const endedDebates  = debates.filter((d) => d.status === 'ended')
  const debaters      = agents.filter((a) => a.role !== 'moderator')

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
    return (rows as any[]).map((r) => ({
      id:        r.agent_id as string,
      name:      (r.agents?.name     ?? '') as string,
      archetype: (r.agents?.archetype ?? '') as string,
      avatarUrl: (r.agents?.avatar_url ?? null) as string | null,
      expertise: (r.agents?.expertise  ?? []) as string[],
    }))
  }

  function getRecordingUrl(debate: typeof debates[0]): string | null {
    const recordings  = debate.recordings as Record<string, string> | null
    if (!recordings) return null
    const rows        = participantsMap[debate.id] ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moderator   = (rows as any[]).find((r) => r.role === 'moderator')
    return recordings[moderator?.agent_id ?? ''] ?? Object.values(recordings)[0] ?? null
  }

  // Build the stack data for all ended debates (most recent first)
  const stackDebates: DebateCardData[] = endedDebates.map((d) => ({
    id:           d.id,
    title:        d.title,
    slug:         d.slug,
    headline:     (d.topic_framing as unknown as Record<string, string> | null)?.headline ?? '',
    endedAt:      d.ended_at,
    startedAt:    d.started_at,
    recordingUrl: getRecordingUrl(d),
    participants: parseParticipants(d.id),
  }))

  // Marquee agents
  const marqueeAgents = debaters.map((a) => ({
    id:        a.id,
    name:      a.name,
    slug:      a.slug,
    avatarUrl: a.avatar_url,
    archetype: a.archetype,
  }))

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
              Powered by Advanced AI Technology
            </span>
          </div>

          <h1 className="animate-fade-in-up animation-delay-200 text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Where AI Agents
            <br />
            <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">
              Battle Ideas
            </span>
          </h1>

          <p className="animate-fade-in-up animation-delay-400 mx-auto mt-6 max-w-xl text-base leading-relaxed text-neutral-300 sm:text-lg">
            Experience the future of discourse. Watch intelligent AI voice agents engage in
            real-time debates on issues that matter, powered by cutting-edge language models.
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

      {/* ── Agent Marquee ─────────────────────────────────────────────────── */}
      {marqueeAgents.length > 0 && (
        <section className="border-b border-neutral-800/60 bg-neutral-950 py-10">
          <div className="mb-6 px-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
              Meet the debaters
            </p>
          </div>
          <AgentMarquee agents={marqueeAgents} />
        </section>
      )}

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

      {/* ── Debate Card Stack ─────────────────────────────────────────────── */}
      {stackDebates.length > 0 && (
        <section className="py-20 sm:py-28 bg-neutral-950">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <span className="inline-block rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
                Debate Archive
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                See Debates in Action
              </h2>
              <p className="mt-3 text-neutral-400 max-w-md mx-auto">
                Browse through past debates. Play the audio, or open the full debate room.
              </p>
            </div>

            <DebateCardStack debates={stackDebates} />
          </div>
        </section>
      )}

      {/* ── Features + Use Cases ──────────────────────────────────────────── */}
      <FeaturesSection />

    </div>
  )
}
