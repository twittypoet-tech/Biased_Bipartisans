export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listDebates } from '@bipi/db'
import { getArchetypeColor, statusColors } from '@/lib/agent-colors'
import { RunAiJudgesButton } from '@/components/admin/run-ai-judges-button'
import { RunPipelineButton } from '@/components/admin/run-pipeline-button'

export default async function EvaluationsPage() {
  const db = createServerClient()

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

  // Load all judge + objective scores for every eval run in one query each
  const allEvalRunIds = debatesWithEvals.flatMap(({ evalRuns }) =>
    (evalRuns as Array<{ id: string }>).map((r) => r.id),
  )

  const judgeScoresByEvalRun = new Map<string, Array<Record<string, unknown>>>()
  const objectiveScoreByEvalRun = new Map<string, Record<string, unknown>>()

  if (allEvalRunIds.length > 0) {
    const [{ data: allJudgeScores }, { data: allObjectiveScores }] = await Promise.all([
      db.from('agent_eval_judge_scores').select('*').in('eval_run_id', allEvalRunIds),
      db.from('agent_eval_objective_scores').select('*').in('eval_run_id', allEvalRunIds),
    ])

    for (const score of allJudgeScores ?? []) {
      const runId = score.eval_run_id as string
      const existing = judgeScoresByEvalRun.get(runId) ?? []
      existing.push(score as Record<string, unknown>)
      judgeScoresByEvalRun.set(runId, existing)
    }

    for (const score of allObjectiveScores ?? []) {
      objectiveScoreByEvalRun.set(score.eval_run_id as string, score as Record<string, unknown>)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Evaluations</h1>
      <p className="mt-1 text-sm text-neutral-500">Post-debate agent performance scores</p>

      <div className="mt-6 space-y-6">
        {debatesWithEvals.map(({ debate, evalRuns }) => {
          const framing = debate.topic_framing as unknown as Record<string, string>
          const hasAnyJudgeScores = (evalRuns as Array<{ id: string }>).some(
            (r) => (judgeScoresByEvalRun.get(r.id)?.length ?? 0) > 0,
          )

          return (
            <div key={debate.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Link
                    href={`/admin/debates/${debate.slug}`}
                    className="text-lg font-semibold hover:text-white transition"
                  >
                    {debate.title}
                  </Link>
                  <p className="text-sm text-neutral-500">{framing?.headline}</p>
                </div>
                <div className="flex items-center gap-3">
                  {evalRuns.length > 0 && (
                    <RunAiJudgesButton debateId={debate.id} hasScores={hasAnyJudgeScores} />
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[debate.status] ?? ''}`}
                  >
                    {debate.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {evalRuns.length === 0 ? (
                <div className="flex items-center gap-4">
                  <p className="text-sm text-neutral-600">No evaluations yet.</p>
                  <RunPipelineButton debateId={debate.id} />
                </div>
              ) : (
                <div className="space-y-3">
                  {(evalRuns as Array<Record<string, unknown>>).map((run) => {
                    const agent = run.agents as Record<string, string> | null
                    const archetype = agent?.archetype ?? ''
                    const colors = getArchetypeColor(archetype)
                    const judgeScores = judgeScoresByEvalRun.get(run.id as string) ?? []
                    const objectiveScore = objectiveScoreByEvalRun.get(run.id as string) ?? null

                    // Group judge scores by model
                    const byModel = new Map<string, Record<string, unknown>>()
                    for (const js of judgeScores) {
                      byModel.set(js.judge_model as string, js)
                    }

                    return (
                      <div key={run.id as string} className={`rounded-md border ${colors.border} ${colors.bg} p-4`}>
                        {/* Agent header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${colors.text}`}>{agent?.name ?? 'Unknown'}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}>
                              {archetype.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm font-mono text-neutral-400">
                            <span>Heuristic: {(((run.overall_score as number) ?? 0) * 100).toFixed(0)}%</span>
                            {run.ai_judge_score != null && (
                              <span className="text-violet-400">
                                AI Judge: {((run.ai_judge_score as number) * 100).toFixed(0)}%
                              </span>
                            )}
                            {run.objective_score != null && (
                              <span className="text-sky-400">
                                Objective: {((run.objective_score as number) * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Heuristic scores */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <ScoreBar label="Epistemic" value={run.epistemic_discipline_score as number | null} />
                          <ScoreBar label="Persuasion" value={run.persuasion_quality_score as number | null} />
                          <ScoreBar label="Distinctiveness" value={run.distinctiveness_score as number | null} />
                          <ScoreBar label="Rivalry" value={run.rivalry_dynamics_score as number | null} />
                          <ScoreBar label="Balance" value={run.participation_balance_score as number | null} />
                          <ScoreBar label="Chemistry" value={run.cast_chemistry_score as number | null} />
                        </div>

                        {/* Layer 2 — Objective Metrics */}
                        {objectiveScore && (
                          <div className="mt-4 space-y-2 border-t border-neutral-700/50 pt-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                              Layer 2 — Objective Metrics
                            </p>
                            <div className="mb-1 flex items-center gap-2">
                              <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                                Claude Sonnet
                              </span>
                              <span className="text-[10px] text-neutral-500">
                                {(((objectiveScore.overall_score as number) ?? 0) * 100).toFixed(0)}% overall
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <ScoreBar label="Epistemic" value={objectiveScore.epistemic_discipline as number} reasoning={(objectiveScore.reasoning as Record<string, string>)?.epistemic_discipline} />
                              <ScoreBar label="Distinctive" value={objectiveScore.distinctiveness as number} reasoning={(objectiveScore.reasoning as Record<string, string>)?.distinctiveness} />
                              <ScoreBar label="Factual" value={objectiveScore.factual_accuracy as number} reasoning={(objectiveScore.reasoning as Record<string, string>)?.factual_accuracy} />
                              <ScoreBar label="Rebuttal" value={objectiveScore.direct_rebuttal as number} reasoning={(objectiveScore.reasoning as Record<string, string>)?.direct_rebuttal} />
                              <ScoreBar label="Relevance" value={objectiveScore.relevance as number} reasoning={(objectiveScore.reasoning as Record<string, string>)?.relevance} />
                              <ScoreBar label="Consistent" value={objectiveScore.consistency as number} reasoning={(objectiveScore.reasoning as Record<string, string>)?.consistency} />
                              <ScoreBar label="Claim Support" value={objectiveScore.claim_support as number} reasoning={(objectiveScore.reasoning as Record<string, string>)?.claim_support} />
                            </div>
                          </div>
                        )}

                        {/* AI Judge Panel */}
                        {judgeScores.length > 0 && (
                          <div className="mt-4 space-y-3 border-t border-neutral-700/50 pt-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                              AI Judge Panel
                            </p>
                            {Array.from(byModel.entries()).map(([model, score]) => (
                              <div key={model}>
                                <div className="mb-1.5 flex items-center gap-2">
                                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
                                    {model === 'claude-sonnet-4-6' ? 'Claude Sonnet' : model === 'claude-3-5-haiku-20241022' ? 'Claude Haiku' : model === 'gpt-4o' ? 'GPT-4o' : model}
                                  </span>
                                  <span className="text-[10px] text-neutral-500">
                                    {((score.overall_score as number) * 100).toFixed(0)}% overall
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <ScoreBar label="Argument" value={score.argument_strength as number} reasoning={(score.reasoning as Record<string, string>)?.argument_strength} />
                                  <ScoreBar label="Coherence" value={score.logical_coherence as number} reasoning={(score.reasoning as Record<string, string>)?.logical_coherence} />
                                  <ScoreBar label="Evidence" value={score.evidence_quality as number} reasoning={(score.reasoning as Record<string, string>)?.evidence_quality} />
                                  <ScoreBar label="Responsive" value={score.responsiveness as number} reasoning={(score.reasoning as Record<string, string>)?.responsiveness} />
                                  <ScoreBar label="Rhetoric" value={score.rhetorical_effectiveness as number} reasoning={(score.reasoning as Record<string, string>)?.rhetorical_effectiveness} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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

function ScoreBar({
  label,
  value,
  reasoning,
}: {
  label: string
  value: number | null
  reasoning?: string
}) {
  const pct = value !== null ? Math.round(value * 100) : 0
  const color =
    value === null
      ? 'bg-neutral-700'
      : pct >= 70
        ? 'bg-emerald-600'
        : pct >= 40
          ? 'bg-amber-600'
          : 'bg-red-600'

  return (
    <div title={reasoning}>
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
