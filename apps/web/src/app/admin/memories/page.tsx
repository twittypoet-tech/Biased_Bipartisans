export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getArchetypeColor } from '@/lib/agent-colors'
import { MemoryReviewActions } from './review-actions'

export default async function MemoriesPage() {
  const db = createServerClient()

  // Get all pending memory candidates with agent info
  const { data: candidates } = await db
    .from('agent_memories')
    .select('*, agents(name, archetype)')
    .eq('status', 'candidate')
    .order('created_at', { ascending: false })

  // Get recently reviewed memories
  const { data: reviewed } = await db
    .from('agent_memories')
    .select('*, agents(name, archetype)')
    .neq('status', 'candidate')
    .order('reviewed_at', { ascending: false })
    .limit(20)

  const pendingMemories = candidates ?? []
  const reviewedMemories = reviewed ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold">Memory Review</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Approve or reject memory candidates. Approved memories become canon and shape future debate behavior.
      </p>

      {/* Pending Queue */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">
          Pending Review ({pendingMemories.length})
        </h2>

        {pendingMemories.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-8 text-center text-neutral-500">
            No pending memory candidates.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingMemories.map((memory: Record<string, unknown>) => {
              const agent = memory.agents as Record<string, string> | null
              const archetype = agent?.archetype ?? ''
              const colors = getArchetypeColor(archetype)

              return (
                <div key={memory.id as string} className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-semibold ${colors.text}`}>{agent?.name ?? 'Unknown'}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}>
                          {archetype.replace('_', ' ')}
                        </span>
                        <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
                          {memory.category as string}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-300">{memory.content as string}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                        <span>Significance: {((memory.significance as number) * 100).toFixed(0)}%</span>
                        <span>{new Date(memory.created_at as string).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <MemoryReviewActions memoryId={memory.id as string} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Recently Reviewed */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-neutral-400">Recently Reviewed</h2>
        {reviewedMemories.length === 0 ? (
          <p className="text-sm text-neutral-600">No reviewed memories yet.</p>
        ) : (
          <div className="space-y-2">
            {reviewedMemories.map((memory: Record<string, unknown>) => {
              const agent = memory.agents as Record<string, string> | null
              const status = memory.status as string
              const statusColor =
                status === 'canon' ? 'text-emerald-400' :
                status === 'approved' ? 'text-blue-400' :
                status === 'rejected' ? 'text-red-400' : 'text-neutral-400'

              return (
                <div key={memory.id as string} className="rounded-md border border-neutral-800 bg-neutral-900/30 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-300">{agent?.name ?? 'Unknown'}</span>
                    <span className={`font-medium ${statusColor}`}>{status}</span>
                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-500 text-xs">{memory.category as string}</span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 line-clamp-1">{memory.content as string}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
