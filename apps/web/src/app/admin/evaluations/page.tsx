export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listDebates } from '@bipi/db'
import { getArchetypeColor, statusColors } from '@/lib/agent-colors'

export default async function EvaluationsPage() {
  const db = createServerClient()

  // Get ended debates with their eval runs
  const debates = await listDebates(db, { status: 'ended' })

  // Load eval runs for each debate
  const debatesWithEvals = await Promise.all(
    debates.map(async (debate) => {
      const { data: evalRuns } = await db
        .from('agent_eval_runs')
        .select('*, agents(name, archetype)')
        .eq('debate_id', debate.id)
      return { debate, evalRuns: evalRuns ?? [] }
    }),
  )

  return (
    <div>
      <h1 className="text-2xl font-bold">Evaluations</h1>
      <p className="mt-1 text-sm text-neutral-500">Post-debate agent performance scores</p>

      <div className="mt-6 space-y-6">
        {debatesWithEvals.map(({ debate, evalRuns }) => {
          const framing = debate.topic_framing as unknown as Record<string, string>
          return (
            <div key={debate.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Link href={`/admin/debates/${debate.slug}`} className="text-lg font-semibold hover:text-white transition">
                    {debate.title}
                  </Link>
                  <p className="text-sm text-neutral-500">{framing?.headline}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[debate.status] ?? ''}`}>
                  {debate.status.toUpperCase()}
                </span>
              </div>

              {evalRuns.length === 0 ? (
                <p className="text-sm text-neutral-600">No evaluations yet. Run the post-debate pipeline.</p>
              ) : (
                <div className="space-y-3">
                  {evalRuns.map((run: Record<string, unknown>) => {
                    const agent = run.agents as Record<string, string> | null
                    const archetype = agent?.archetype ?? ''
                    const colors = getArchetypeColor(archetype)

                    return (
                      <div key={run.id as string} className={`rounded-md border ${colors.border} ${colors.bg} p-4`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${colors.text}`}>{agent?.name ?? 'Unknown'}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}>
                              {archetype.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-sm font-mono text-neutral-400">
                            Overall: {((run.overall_score as number) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <ScoreBar label="Epistemic" value={run.epistemic_discipline_score as number | null} />
                          <ScoreBar label="Persuasion" value={run.persuasion_quality_score as number | null} />
                          <ScoreBar label="Distinctiveness" value={run.distinctiveness_score as number | null} />
                          <ScoreBar label="Rivalry" value={run.rivalry_dynamics_score as number | null} />
                          <ScoreBar label="Balance" value={run.participation_balance_score as number | null} />
                          <ScoreBar label="Chemistry" value={run.cast_chemistry_score as number | null} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {debatesWithEvals.length === 0 && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-12 text-center text-neutral-500">
            No completed debates to evaluate yet.
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value !== null ? Math.round(value * 100) : 0
  const color = value === null ? 'bg-neutral-700' : pct >= 70 ? 'bg-emerald-600' : pct >= 40 ? 'bg-amber-600' : 'bg-red-600'

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-neutral-400">{label}</span>
        <span className="text-neutral-300">{value !== null ? `${pct}%` : '—'}</span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-800">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
