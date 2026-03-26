export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listDebates, listAgents, listDebateParticipants } from '@bipi/db'
import { PastDebateCard } from '@/components/public/past-debate-card'
import { DebateCard } from '@/components/public/debate-card'
import { HeroShader } from '@/components/home/hero-shader'
import { AgentMarquee } from '@/components/home/agent-marquee'
import { FeaturesSection } from '@/components/home/features-section'

export default async function HomePage() {
  const db = createServerClient()
  const [debates, agents] = await Promise.all([
    listDebates(db),
    listAgents(db),
  ])

  const liveDebates = debates.filter((d) => d.status === 'live')
  const endedDebates = debates.filter((d) => d.status === 'ended')
  const debaters = agents.filter((a) => a.role !== 'moderator')

  // Featured debate: prioritize live, then pick a random ended one
  const featuredLive = liveDebates[0] ?? null
  const featuredEnded = endedDebates.length > 0
    ? endedDebates[Math.floor(Math.random() * endedDebates.length)]
    : null
  const featuredDebate = featuredLive ?? featuredEnded

  // Fetch participants for the featured debate
  const featuredParticipants = featuredDebate
    ? await listDebateParticipants(db, [featuredDebate.id])
    : {}

  function getFeaturedParticipants(debateId: string) {
    const rows = featuredParticipants[debateId] ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((r: any) => ({
      id: r.agent_id as string,
      name: (r.agents?.name ?? '') as string,
      archetype: (r.agents?.archetype ?? '') as string,
      avatarUrl: (r.agents?.avatar_url ?? null) as string | null,
      expertise: (r.agents?.expertise ?? []) as string[],
    }))
  }

  // Build featured ended debate recording URL
  let featuredRecordingUrl: string | null = null
  if (featuredEnded && !featuredLive) {
    const recordings = featuredEnded.recordings as Record<string, string> | null
    const rows = featuredParticipants[featuredEnded.id] ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moderator = rows.find((r: any) => r.role === 'moderator')
    featuredRecordingUrl = recordings
      ? (recordings[moderator?.agent_id ?? ''] ?? Object.values(recordings)[0] ?? null)
      : null
  }

  // Marquee agents: debaters with avatar/name/slug
  const marqueeAgents = debaters.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    avatarUrl: a.avatar_url,
    archetype: a.archetype,
  }))

  return (
    <div className="bg-neutral-950">
      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        {/* WebGL shader background */}
        <HeroShader />

        {/* Gradient overlays for text legibility */}
        <div className="pointer-events-none absolute inset-0 bg-neutral-950/55" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-neutral-950 to-transparent" />

        {/* Hero content */}
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

      {/* ── Agent Marquee ─────────────────────────────────────────────────────── */}
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

      {/* ── Featured Debate ───────────────────────────────────────────────────── */}
      {featuredDebate && (
        <section className="py-20 sm:py-28 bg-neutral-950">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="mb-10 text-center">
              <span className="inline-block rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
                {featuredLive ? 'Happening Now' : 'Featured Debate'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                See Debates in Action
              </h2>
              <p className="mt-3 text-neutral-400">
                {featuredLive
                  ? 'A live debate is happening right now. Join the audience.'
                  : 'Replay a recent debate and hear both sides make their case.'}
              </p>
            </div>

            {featuredLive ? (
              <DebateCard
                title={featuredLive.title}
                slug={featuredLive.slug}
                headline={
                  (featuredLive.topic_framing as unknown as Record<string, string> | null)?.headline ?? ''
                }
                status={featuredLive.status}
                scheduledAt={featuredLive.scheduled_at}
                startedAt={featuredLive.started_at}
                durationMinutes={featuredLive.duration_override_minutes}
                participants={getFeaturedParticipants(featuredLive.id)}
              />
            ) : (
              featuredEnded && (
                <PastDebateCard
                  title={featuredEnded.title}
                  slug={featuredEnded.slug}
                  headline={
                    (featuredEnded.topic_framing as unknown as Record<string, string> | null)?.headline ?? ''
                  }
                  endedAt={featuredEnded.ended_at}
                  startedAt={featuredEnded.started_at}
                  recordingUrl={featuredRecordingUrl}
                  participants={getFeaturedParticipants(featuredEnded.id)}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* ── Features + Use Cases ──────────────────────────────────────────────── */}
      <FeaturesSection />
    </div>
  )
}
