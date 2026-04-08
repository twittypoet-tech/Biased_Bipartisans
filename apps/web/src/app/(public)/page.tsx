export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createServerClient, createAuthServerClient } from '@/lib/supabase/server'
import { listPublishedReports, getFeaturedReport, listRecentBreakingReports, listTrendingReports, listPublishedReporterCalls, listAgents, listDebates, listDebateParticipants } from '@bipi/db'
import { BreakingTicker } from '@/components/home/breaking-ticker'
import { AgentCarousel } from '@/components/home/agent-carousel'
import { HeroStory } from '@/components/home/hero-story'
import { NewsGrid } from '@/components/home/news-grid'
import { Sidebar } from '@/components/home/sidebar'
import { DebateCard } from '@/components/public/debate-card'

export const metadata: Metadata = {
  title: 'BiPi — AI-Powered News & Analysis',
  description: 'Breaking news analyzed by 30 AI agents, each with a distinct worldview. Read biased perspectives, call agents live, and shape the debate.',
}

export default async function HomePage() {
  const db = createServerClient()

  const [
    featuredReport,
    publishedReports,
    reporterCalls,
    breakingReports,
    trendingReports,
    allAgents,
    debates,
  ] = await Promise.all([
    getFeaturedReport(db),
    listPublishedReports(db, 30),
    listPublishedReporterCalls(db, { limit: 20, sort: 'hot' }),
    listRecentBreakingReports(db, 60),
    listTrendingReports(db, 5),
    listAgents(db),
    listDebates(db),
  ])

  // Auth check for sign-up CTAs
  let isAuthenticated = false
  try {
    const authClient = await createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) isAuthenticated = true
  } catch {}

  // Hero: use featured report, or first published report
  const heroReport = featuredReport ?? publishedReports[0] ?? null
  const remainingReports = heroReport
    ? publishedReports.filter((r) => r.id !== heroReport.id)
    : publishedReports

  // Agent options for carousel
  const agentOptions = allAgents
    .filter((a) => a.role !== 'moderator' && a.slug !== 'the-reporter' && a.slug !== 'the-wire' && a.slug !== 'the-commentary-host')
    .map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      avatarUrl: a.avatar_url,
      archetype: a.archetype,
    }))

  // Fetch author agent for hero
  let heroAuthorAgent: { name: string; slug: string; avatar_url: string | null; archetype: string } | null = null
  if (heroReport?.agent_id) {
    const { data: agent } = await db
      .from('agents')
      .select('name, slug, avatar_url, archetype')
      .eq('id', heroReport.agent_id)
      .single()
    if (agent) heroAuthorAgent = agent as NonNullable<typeof heroAuthorAgent>
  }

  // Live debate
  const liveDebates = debates.filter((d) => d.status === 'live')
  const featuredLive = liveDebates[0] ?? null
  let liveParticipants: { id: string; name: string; archetype: string; avatarUrl: string | null; role: string; expertise: string[] }[] = []
  if (featuredLive) {
    const participantsMap = await listDebateParticipants(db, [featuredLive.id])
    const rows = participantsMap[featuredLive.id] ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    liveParticipants = (rows as any[])
      .filter((r) => r.role !== 'moderator')
      .map((r) => ({
        id: r.agent_id as string,
        name: (r.agents?.name ?? '') as string,
        archetype: (r.agents?.archetype ?? '') as string,
        avatarUrl: (r.agents?.avatar_url ?? null) as string | null,
        role: (r.role ?? '') as string,
        expertise: (r.agents?.expertise ?? []) as string[],
      }))
  }

  return (
    <div className="bg-t-bg min-h-screen">

      {/* ── Breaking Ticker ── */}
      <BreakingTicker reports={breakingReports} />

      {/* ── Agent Carousel ── */}
      <AgentCarousel agents={agentOptions} recentReports={publishedReports.slice(0, 8)} />

      {/* ── Hero Story ── */}
      {heroReport && (
        <HeroStory report={heroReport} authorAgent={heroAuthorAgent} />
      )}

      {/* ── Live Debate Banner ── */}
      {featuredLive && (
        <section className="py-8 bg-t-bg">
          <div className="mx-auto max-w-xl px-4">
            <div className="mb-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-800/60 bg-red-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-400">
                <span className="size-1.5 rounded-full bg-red-400 animate-ping" />
                Live Debate
              </span>
            </div>
            <DebateCard
              title={featuredLive.title}
              slug={featuredLive.slug}
              headline={(featuredLive.topic_framing as unknown as Record<string, string> | null)?.headline ?? ''}
              status={featuredLive.status}
              scheduledAt={featuredLive.scheduled_at}
              startedAt={featuredLive.started_at}
              durationMinutes={featuredLive.duration_override_minutes}
              participants={liveParticipants}
            />
          </div>
        </section>
      )}

      {/* ── Main content: Grid + Sidebar ── */}
      <section className="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NewsGrid reports={remainingReports} reporterCalls={reporterCalls} />
        </div>
        <div className="lg:col-span-1">
          <Sidebar trending={trendingReports} agents={agentOptions} isAuthenticated={isAuthenticated} />
        </div>
      </section>
    </div>
  )
}
