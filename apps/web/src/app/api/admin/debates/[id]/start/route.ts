import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getDebate, getDebateParticipants, getDebateFormat } from '@bipi/db'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: debateId } = await params
  const db = createServerClient()

  const debate = await getDebate(db, debateId)
  if (!debate) {
    return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
  }

  if (debate.status === 'live') {
    return NextResponse.json({ error: 'Debate is already live' }, { status: 400 })
  }

  if (debate.status === 'ended') {
    return NextResponse.json({ error: 'Debate has already ended' }, { status: 400 })
  }

  const participants = await getDebateParticipants(db, debateId)
  const hasDebaters = participants.some((p) => p.role === 'debater')
  const hasModerator = participants.some((p) => p.role === 'moderator')

  if (!hasDebaters || !hasModerator) {
    return NextResponse.json(
      { error: 'Debate needs at least one debater and a moderator' },
      { status: 400 },
    )
  }

  const format = debate.format_id ? await getDebateFormat(db, debate.format_id) : null
  const isFreeflow = format?.debate_style === 'freeflow'

  if (!isFreeflow) {
    return NextResponse.json(
      {
        error: 'This debate uses a structured format which requires LiveKit infrastructure. Switch the debate format to "Freeflow Duel" to use the Retell voice pipeline.',
      },
      { status: 400 },
    )
  }

  // Mark the debate as scheduled so the scheduler can pick it up as a fallback
  const now = new Date().toISOString()
  const { error: updateError } = await db
    .from('debates')
    .update({ status: 'scheduled', scheduled_at: now })
    .eq('id', debateId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to schedule debate' }, { status: 500 })
  }

  // Try to trigger the agents service directly — this fires the debate immediately
  // without waiting for the 30s scheduler poll cycle.
  const agentsUrl = process.env.AGENTS_SERVICE_URL
  const triggerSecret = process.env.AGENTS_TRIGGER_SECRET

  if (agentsUrl) {
    try {
      const triggerRes = await fetch(`${agentsUrl}/debates/${debateId}/trigger`, {
        method: 'POST',
        headers: {
          ...(triggerSecret ? { Authorization: `Bearer ${triggerSecret}` } : {}),
        },
      })

      if (triggerRes.ok) {
        return NextResponse.json({
          ok: true,
          status: 'triggered',
          message: 'Debate started — agents are joining now',
        })
      }

      // Trigger call failed — fall through to scheduler mode
      console.warn('Agents service trigger failed:', await triggerRes.text())
    } catch (err) {
      console.warn('Could not reach agents service:', err)
    }
  }

  // Fallback: agents service not reachable — scheduler will pick it up within 30s
  return NextResponse.json({
    ok: true,
    status: 'scheduled',
    message: agentsUrl
      ? 'Agents service unreachable — debate queued, scheduler will start it within 30s'
      : 'No AGENTS_SERVICE_URL set — debate queued for scheduler. Set AGENTS_SERVICE_URL in Vercel to enable instant start.',
  })
}
