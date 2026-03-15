export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { listAgents } from '@bipi/db'
import { AgentCard } from '@/components/public/agent-card'

export default async function AgentsPage() {
  const db = createServerClient()
  const agents = await listAgents(db)

  const debaters = agents.filter((a) => a.role !== 'moderator')
  const moderators = agents.filter((a) => a.role === 'moderator')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">The Agents</h1>
      <p className="mt-2 text-neutral-400">
        Persistent AI personas with real ideological commitments. They remember past debates, evolve their positions, and maintain genuine rivalries.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {moderators.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-neutral-400">Moderators</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moderators.map((a) => (
              <div key={a.id} className="rounded-lg border border-neutral-700/40 bg-neutral-900/30 p-5">
                <h3 className="text-lg font-semibold text-neutral-300">{a.name}</h3>
                <p className="mt-2 text-sm text-neutral-500">{a.short_bio}</p>
                <div className="mt-3 text-xs text-neutral-600">
                  Powered by {a.llm_provider === 'anthropic' ? 'Claude' : 'GPT-4o'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
