import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/debates/[id]/run-ai-judges
 *
 * Triggers AI judge evaluation (Layer 1) for a debate.
 * Requires JOBS_SERVICE_URL to be set (points to the running jobs service).
 *
 * This calls the jobs service synchronously — the response comes back when
 * all judge scores are written (~15-30s for a 2-agent debate).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: debateId } = await params
  const db = createServerClient()

  // Verify debate exists and has eval runs (heuristic scoring must have run first)
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
      { error: 'No eval runs found — run the full post-debate pipeline first' },
      { status: 400 },
    )
  }

  const jobsUrl = process.env.JOBS_SERVICE_URL
  if (!jobsUrl) {
    return NextResponse.json(
      { error: 'JOBS_SERVICE_URL is not configured' },
      { status: 503 },
    )
  }

  try {
    const res = await fetch(`${jobsUrl}/api/run-ai-judges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debateId }),
    })

    if (!res.ok) {
      const body = await res.text()
      let message = 'Jobs service error'
      try { message = JSON.parse(body).error ?? message } catch { /* ignore */ }
      return NextResponse.json({ error: message }, { status: 502 })
    }

    return NextResponse.json({ ok: true, debateId })
  } catch (err) {
    console.error('Failed to reach jobs service:', err)
    return NextResponse.json({ error: 'Could not reach jobs service' }, { status: 503 })
  }
}
