import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  runAiJudgeEvaluation,
  runObjectiveMetricsEvaluation,
  computeAudienceScores,
  computeCompositeScores,
} from '@bipi/eval'

/**
 * POST /api/admin/debates/[id]/run-ai-judges
 *
 * Runs AI judge evaluation (Layer 1) directly — no jobs service needed.
 * Requires eval runs to exist first (run /run-pipeline first).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: debateId } = await params
  const db = createServerClient()

  const { data: debate } = await db
    .from('debates')
    .select('id, title, status')
    .eq('id', debateId)
    .single()

  if (!debate) {
    return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
  }

  const { data: evalRuns } = await db
    .from('agent_eval_runs')
    .select('id')
    .eq('debate_id', debateId)

  if (!evalRuns || evalRuns.length === 0) {
    return NextResponse.json(
      { error: 'No eval runs found — run the full pipeline first' },
      { status: 400 },
    )
  }

  try {
    await runAiJudgeEvaluation(db, debateId)
    await runObjectiveMetricsEvaluation(db, debateId)
    await computeAudienceScores(db, debateId)
    await computeCompositeScores(db, debateId)
    return NextResponse.json({ ok: true, debateId })
  } catch (err) {
    console.error('AI judge evaluation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI judge evaluation failed' },
      { status: 500 },
    )
  }
}
