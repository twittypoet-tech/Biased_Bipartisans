import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  evaluateDebate,
  runAiJudgeEvaluation,
  runObjectiveMetricsEvaluation,
  computeAudienceScores,
  computeCompositeScores,
} from '@bipi/eval'

/**
 * POST /api/admin/debates/[id]/run-pipeline
 *
 * Runs the full post-debate evaluation pipeline:
 * 1. Heuristic scoring (evaluateDebate)
 * 2. AI judge panel (runAiJudgeEvaluation)
 *
 * Can be triggered from the admin UI or from the agents service
 * (via x-internal-key header) when a debate ends.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Validate internal API key if provided (agents service trigger)
  const internalKey = request.headers.get('x-internal-key')
  const configuredKey = process.env.INTERNAL_API_KEY
  if (internalKey && configuredKey && internalKey !== configuredKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  if (debate.status !== 'ended') {
    return NextResponse.json(
      { error: `Debate is not ended (status: ${debate.status})` },
      { status: 400 },
    )
  }

  try {
    // Step 1: Heuristic scoring
    const agentIds = await evaluateDebate(db, debateId)

    // Step 2: AI judge panel (Layer 1)
    await runAiJudgeEvaluation(db, debateId)

    // Step 3: Objective metrics (Layer 2)
    await runObjectiveMetricsEvaluation(db, debateId)

    // Step 4: Audience scoring (from vote data)
    await computeAudienceScores(db, debateId)

    // Step 5: Composite score (combines Layers 1-3)
    await computeCompositeScores(db, debateId)

    return NextResponse.json({ ok: true, debateId, agentIds })
  } catch (err) {
    console.error('Post-debate pipeline failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Pipeline failed' },
      { status: 500 },
    )
  }
}
