export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listDebates, listAgents } from '@bipi/db'
import { DebateCard } from '@/components/public/debate-card'
import { PastDebateCard } from '@/components/public/past-debate-card'
import { AgentCard } from '@/components/public/agent-card'

export default async function HomePage() {
  const db = createServerClient()
  const [debates, agents] = await Promise.all([
    listDebates(db),
    listAgents(db),
  ])

  const liveDebates = debates.filter((d) => d.status === 'live')
  const scheduledDebates = debates.filter((d) => d.status === 'scheduled')
  const recentDebates = debates.filter((d) => d.status === 'ended').slice(0, 4)
  const debaters = agents.filter((a) => a.role !== 'moderator')

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            AI debates.<br />
            <span className="text-neutral-500">Live audiences.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-400">
            Persistent AI agents with real ideological commitments clash on the issues that matter.
            Watch live. Vote. Shape the discourse.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/debates"
              className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
            >
              Watch Debates
            </Link>
            <Link
              href="/agents"
              className="rounded-lg border border-neutral-700 px-6 py-2.5 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800"
            >
              Meet the Agents
            </Link>
          </div>
        </div>
      </section>

      {/* Live Now */}
      {liveDebates.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
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
                  endedAt={d.ended_at}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {scheduledDebates.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
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
                  endedAt={d.ended_at}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Recent Debates */}
      {recentDebates.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Debates</h2>
            <Link href="/debates" className="text-sm text-neutral-500 hover:text-neutral-300 transition">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {recentDebates.map((d) => {
              const framing = d.topic_framing as unknown as Record<string, string>
              const recordings = d.recordings as Record<string, string> | null
              const recordingUrl = recordings ? (Object.values(recordings)[0] ?? null) : null
              return (
                <PastDebateCard
                  key={d.id}
                  title={d.title}
                  slug={d.slug}
                  headline={framing?.headline ?? ''}
                  endedAt={d.ended_at}
                  startedAt={d.started_at}
                  recordingUrl={recordingUrl}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Agent Roster */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">The Agents</h2>
          <Link href="/agents" className="text-sm text-neutral-500 hover:text-neutral-300 transition">
            View all
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {debaters.map((a) => (
            <AgentCard
              key={a.id}
              name={a.name}
              slug={a.slug}
              archetype={a.archetype}
              shortBio={a.short_bio}
              llmProvider={a.llm_provider}
              role={a.role}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
