export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listAgents, listDebates } from '@bipi/db'
import { getArchetypeColor, statusColors } from '@/lib/agent-colors'

export default async function AdminDashboard() {
  const db = createServerClient()
  const [agents, debates] = await Promise.all([listAgents(db), listDebates(db)])

  const debaters = agents.filter((a) => a.role === 'debater')
  const moderators = agents.filter((a) => a.role === 'moderator')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {agents.length} agents, {debates.length} debates
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agent Roster</h2>
          <Link
            href="/admin/agents"
            className="text-sm text-neutral-400 hover:text-white"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {debaters.map((agent) => {
            const colors = getArchetypeColor(agent.archetype)
            return (
              <Link
                key={agent.id}
                href={`/admin/agents/${agent.slug}`}
                className={`rounded-lg border ${colors.border} ${colors.bg} p-4 transition hover:brightness-110`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{agent.name}</h3>
                    <p className={`text-xs ${colors.text}`}>
                      {agent.archetype.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${statusColors[agent.status] ?? ''}`}
                  >
                    {agent.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-400 line-clamp-2">{agent.short_bio}</p>
                <div className="mt-2 flex gap-2 text-xs text-neutral-500">
                  <span>{agent.llm_provider}</span>
                  <span>·</span>
                  <span>{agent.llm_model}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {moderators.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Moderators</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {moderators.map((agent) => (
              <Link
                key={agent.id}
                href={`/admin/agents/${agent.slug}`}
                className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 transition hover:bg-neutral-800/50"
              >
                <h3 className="font-semibold">{agent.name}</h3>
                <p className="mt-1 text-xs text-neutral-400">{agent.short_bio}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Debates</h2>
          <Link
            href="/admin/debates"
            className="text-sm text-neutral-400 hover:text-white"
          >
            View all
          </Link>
        </div>
        {debates.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-8 text-center">
            <p className="text-neutral-500">No debates yet</p>
            <Link
              href="/admin/debates/new"
              className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300"
            >
              Create first debate
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {debates.slice(0, 5).map((debate) => (
              <Link
                key={debate.id}
                href={`/admin/debates/${debate.slug}`}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/30 p-3 transition hover:bg-neutral-800/30"
              >
                <div>
                  <h3 className="font-medium">{debate.title}</h3>
                  <p className="text-xs text-neutral-500">{debate.slug}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${statusColors[debate.status] ?? ''}`}
                >
                  {debate.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
