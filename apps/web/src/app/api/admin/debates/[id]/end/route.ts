import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getDebate } from '@bipi/db'

const RETELL_API_BASE = 'https://api.retellai.com'

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

  if (debate.status === 'ended' || debate.status === 'cancelled') {
    return NextResponse.json({ error: `Debate is already ${debate.status}` }, { status: 400 })
  }

  const retellApiKey = process.env.RETELL_API_KEY
  const retellCallIds = (debate as unknown as Record<string, unknown>).retell_call_ids as
    | Record<string, string>
    | null

  // End all active Retell calls
  if (retellApiKey && retellCallIds && Object.keys(retellCallIds).length > 0) {
    await Promise.allSettled(
      Object.values(retellCallIds).map((callId) =>
        fetch(`${RETELL_API_BASE}/v2/end-call/${callId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${retellApiKey}` },
        }).catch(() => {}),
      ),
    )
  }

  await db
    .from('debates')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', debateId)

  return NextResponse.json({ ok: true })
}
