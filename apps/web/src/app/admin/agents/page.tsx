import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listAgents } from '@bipi/db'
import { getArchetypeColor, statusColors } from '@/lib/agent-colors'

export default async function AgentsListPage() {
  const db = createServerClient()
  const agents = await listAgents(db)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agents</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage the official debate roster and agent configurations
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const colors = getArchetypeColor(agent.archetype)
          return (
            <Link
              key={agent.id}
              href={`/admin/agents/${agent.slug}`}
              className={`group rounded-lg border ${colors.border} ${colors.bg} p-5 transition hover:brightness-110`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold group-hover:text-white">{agent.name}</h3>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${colors.badge}`}>
                      {agent.archetype.replace(/_/g, ' ')}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColors[agent.status] ?? ''}`}>
                      {agent.status}
                    </span>
                  </div>
                </div>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                  {agent.role}
                </span>
              </div>

              <p className="mt-3 text-sm text-neutral-400 line-clamp-2">{agent.short_bio}</p>

              <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
                <span>{agent.llm_provider}/{agent.llm_model}</span>
                <span>·</span>
                <span>{agent.evolution_stage}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
